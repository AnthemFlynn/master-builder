import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { WorkerPool } from '../WorkerPool'

describe('WorkerPool', () => {
  let pool: WorkerPool

  afterEach(() => {
    pool?.terminate()
  })

  it('should create pool with N workers', () => {
    pool = new WorkerPool(4, '/workers/test-worker.js')
    expect(pool.getWorkerCount()).toBe(4)
    expect(pool.getAvailableCount()).toBe(4)
  })

  it('should execute task on available worker', async () => {
    pool = new WorkerPool(2, '/workers/test-worker.js')

    const result = await pool.execute({ type: 'TEST', data: 42 })

    expect(result).toBeDefined()
  })

  it('should queue tasks when all workers busy', async () => {
    pool = new WorkerPool(2, '/workers/test-worker.js')

    // Start 3 tasks (pool has 2 workers)
    const promises = [
      pool.execute({ type: 'SLOW_TASK', delay: 100 }),
      pool.execute({ type: 'SLOW_TASK', delay: 100 }),
      pool.execute({ type: 'SLOW_TASK', delay: 100 })
    ]

    // Third task should queue
    expect(pool.getAvailableCount()).toBe(0)

    await Promise.all(promises)

    // All workers should be available again
    expect(pool.getAvailableCount()).toBe(2)
  })

  it('should track worker utilization', () => {
    pool = new WorkerPool(6, '/workers/test-worker.js')

    pool.execute({ type: 'TEST' })
    pool.execute({ type: 'TEST' })

    const util = pool.getUtilization()
    expect(util.busy).toBe(2)
    expect(util.total).toBe(6)
  })
})
