export interface WorkerTask {
  type: string
  priority?: number  // Optional for backward compatibility (default = lowest priority)
  _transferList?: ArrayBuffer[]  // Buffers to transfer (zero-copy) instead of clone
  [key: string]: any
}

export interface WorkerResult {
  [key: string]: any
}

interface PendingTask {
  task: WorkerTask
  resolve: (result: WorkerResult) => void
  reject: (error: Error) => void
}

export class WorkerPool {
  private workers: Worker[] = []
  private availableWorkers: Worker[] = []
  private taskQueue: PendingTask[] = []
  private workerTasks: Map<Worker, PendingTask> = new Map()

  constructor(
    private workerCount: number,
    private workerScript: string
  ) {
    this.initializeWorkers()
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.workerCount; i++) {
      this.createWorker()
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(this.workerScript, { type: 'module' })

    worker.onmessage = (event: MessageEvent) => {
      this.onWorkerComplete(worker, event.data)
    }

    worker.onerror = (error: ErrorEvent) => {
      this.onWorkerError(worker, error)
    }

    this.workers.push(worker)
    this.availableWorkers.push(worker)

    return worker
  }

  execute(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const pendingTask: PendingTask = { task, resolve, reject }

      if (this.availableWorkers.length > 0) {
        this.executeTask(pendingTask)
      } else {
        this.insertByPriority(pendingTask)
      }
    })
  }

  private insertByPriority(pendingTask: PendingTask): void {
    const priority = pendingTask.task.priority ?? 999  // Default to lowest priority

    // Find insertion point (tasks sorted by priority, low to high)
    const index = this.taskQueue.findIndex(t =>
      (t.task.priority ?? 999) > priority
    )

    if (index === -1) {
      this.taskQueue.push(pendingTask)  // Lowest priority, append
    } else {
      this.taskQueue.splice(index, 0, pendingTask)  // Insert before lower priority
    }
  }

  private executeTask(pendingTask: PendingTask): void {
    const worker = this.availableWorkers.shift()!
    this.workerTasks.set(worker, pendingTask)

    // Use transfer list for zero-copy if provided
    const transferList = pendingTask.task._transferList
    if (transferList && transferList.length > 0) {
      worker.postMessage(pendingTask.task, transferList)
    } else {
      worker.postMessage(pendingTask.task)
    }
  }

  private onWorkerComplete(worker: Worker, result: WorkerResult): void {
    // Ignore broadcast responses - they're handled by their own event listeners in broadcast()
    if (result.type === 'WORLD_TYPE_SET') {
      return
    }

    const pendingTask = this.workerTasks.get(worker)
    if (pendingTask) {
      pendingTask.resolve(result)
      this.workerTasks.delete(worker)
    }

    // Process next queued task or return worker to pool
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift()!
      // Reuse this worker for the next task
      this.workerTasks.set(worker, nextTask)

      // Use transfer list for zero-copy if provided
      const transferList = nextTask.task._transferList
      if (transferList && transferList.length > 0) {
        worker.postMessage(nextTask.task, transferList)
      } else {
        worker.postMessage(nextTask.task)
      }
    } else {
      this.availableWorkers.push(worker)
    }
  }

  private onWorkerError(worker: Worker, error: ErrorEvent): void {
    const pendingTask = this.workerTasks.get(worker)
    if (pendingTask) {
      pendingTask.reject(new Error(error.message))
      this.workerTasks.delete(worker)
    }

    // Remove failed worker from pools
    this.workers = this.workers.filter(w => w !== worker)
    this.availableWorkers = this.availableWorkers.filter(w => w !== worker)

    // Terminate failed worker
    worker.terminate()

    // Create replacement worker
    this.createWorker()
  }

  getWorkerCount(): number {
    return this.workers.length
  }

  getAvailableCount(): number {
    return this.availableWorkers.length
  }

  getUtilization(): { busy: number; total: number } {
    return {
      busy: this.workerCount - this.availableWorkers.length,
      total: this.workerCount
    }
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.availableWorkers = []
    this.taskQueue = []
    this.workerTasks.clear()
  }

  /**
   * Broadcast a message to all workers and wait for all responses.
   * Uses a separate message type check to avoid interfering with normal task handling.
   */
  async broadcast(message: WorkerTask): Promise<WorkerResult[]> {
    // Track which response type we expect from this broadcast
    const expectedResponseType = message.type.replace('SET_', '').replace('_', '_') + '_SET'
    // e.g., SET_WORLD_TYPE -> WORLD_TYPE_SET

    const promises = this.workers.map(worker => {
      return new Promise<WorkerResult>((resolve) => {
        const handler = (event: MessageEvent) => {
          // Only handle responses that match our broadcast (not chunk generation results)
          if (event.data.type === 'WORLD_TYPE_SET') {
            worker.removeEventListener('message', handler)
            resolve(event.data)
          }
          // Other message types will be handled by onWorkerComplete
        }
        worker.addEventListener('message', handler)
        worker.postMessage(message)
      })
    })
    return Promise.all(promises)
  }
}
