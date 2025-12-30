import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { WorkerPool } from '../WorkerPool'

describe('WorkerPool', () => {
  let pool: WorkerPool
  let mockWorkers: MockWorker[] = []

  class MockWorker {
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null

    constructor() {
      mockWorkers.push(this)
    }

    postMessage(data: any) {
      // Simulate async response
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data: { type: 'COMPLETE' } }))
        }
      }, data.delay || 0)
    }

    terminate() {
      // Mock terminate
    }
  }

  beforeEach(() => {
    mockWorkers = []
    // Mock Worker constructor
    global.Worker = MockWorker as any
  })

  afterEach(() => {
    pool?.terminate()
    mockWorkers = []
  })

  it('should create pool with N workers', () => {
    pool = new WorkerPool(4, '/workers/dummy.js')
    expect(pool.getWorkerCount()).toBe(4)
    expect(pool.getAvailableCount()).toBe(4)
    expect(mockWorkers.length).toBe(4)
  })

  it('should execute task on available worker', async () => {
    pool = new WorkerPool(2, '/workers/dummy.js')

    const result = await pool.execute({ type: 'TEST', data: 42 })

    expect(result).toBeDefined()
    expect(result.type).toBe('COMPLETE')
  })

  it('should queue tasks when all workers busy', async () => {
    pool = new WorkerPool(2, '/workers/dummy.js')

    // Start 3 tasks (pool has 2 workers)
    const promises = [
      pool.execute({ type: 'SLOW_TASK', delay: 50 }),
      pool.execute({ type: 'SLOW_TASK', delay: 50 }),
      pool.execute({ type: 'SLOW_TASK', delay: 50 })
    ]

    // Third task should queue (check before any complete)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(pool.getAvailableCount()).toBe(0)

    await Promise.all(promises)

    // All workers should be available again
    expect(pool.getAvailableCount()).toBe(2)
  })

  it('should track worker utilization', async () => {
    pool = new WorkerPool(6, '/workers/dummy.js')

    // Start 2 tasks without awaiting
    pool.execute({ type: 'TEST', delay: 50 })
    pool.execute({ type: 'TEST', delay: 50 })

    // Check utilization immediately
    await new Promise(resolve => setTimeout(resolve, 10))
    const util = pool.getUtilization()
    expect(util.busy).toBe(2)
    expect(util.total).toBe(6)
  })

  it('should process tasks by priority (lower number first)', async () => {
    pool = new WorkerPool(1, '/workers/dummy.js')

    const results: number[] = []

    // Block the single worker with a slow task first
    const blocker = pool.execute({ type: 'BLOCKER', delay: 20 })

    // Now queue 3 tasks with different priorities - all will queue since worker is busy
    const p1 = pool.execute({ type: 'TEST', priority: 2, id: 1, delay: 10 }).then(() => results.push(1))
    const p2 = pool.execute({ type: 'TEST', priority: 0, id: 2, delay: 10 }).then(() => results.push(2))
    const p3 = pool.execute({ type: 'TEST', priority: 1, id: 3, delay: 10 }).then(() => results.push(3))

    await Promise.all([blocker, p1, p2, p3])

    // Should process in priority order: 2 (priority 0), 3 (priority 1), 1 (priority 2)
    expect(results).toEqual([2, 3, 1])
  })
})
