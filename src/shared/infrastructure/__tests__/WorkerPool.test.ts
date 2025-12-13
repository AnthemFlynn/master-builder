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
})
