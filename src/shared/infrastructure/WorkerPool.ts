export interface WorkerTask {
  type: string
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
      const worker = new Worker(this.workerScript, { type: 'module' })

      worker.onmessage = (event: MessageEvent) => {
        this.onWorkerComplete(worker, event.data)
      }

      worker.onerror = (error: ErrorEvent) => {
        this.onWorkerError(worker, error)
      }

      this.workers.push(worker)
      this.availableWorkers.push(worker)
    }
  }

  execute(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const pendingTask: PendingTask = { task, resolve, reject }

      if (this.availableWorkers.length > 0) {
        this.executeTask(pendingTask)
      } else {
        this.taskQueue.push(pendingTask)
      }
    })
  }

  private executeTask(pendingTask: PendingTask): void {
    const worker = this.availableWorkers.shift()!
    this.workerTasks.set(worker, pendingTask)
    worker.postMessage(pendingTask.task)
  }

  private onWorkerComplete(worker: Worker, result: WorkerResult): void {
    const pendingTask = this.workerTasks.get(worker)
    if (pendingTask) {
      pendingTask.resolve(result)
      this.workerTasks.delete(worker)
    }

    // Process next queued task or return worker to pool
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift()!
      this.executeTask(nextTask)
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

    this.availableWorkers.push(worker)
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
}
