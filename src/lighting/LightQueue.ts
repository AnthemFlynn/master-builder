import { RGB } from '../blocks/types'

/**
 * Light update in the queue
 */
export interface LightUpdate {
  x: number
  y: number
  z: number
  channel: 'sky' | 'block'
  color: RGB
  priority: number  // Higher = process sooner
}

/**
 * Incremental light update queue
 * Processes updates with fixed time budget per frame
 */
export class LightQueue {
  private queue: LightUpdate[] = []
  private blocksPerFrame = 100  // Start conservative
  private frameBudget = 2.0  // milliseconds

  /**
   * Add light update to queue
   */
  add(update: LightUpdate): void {
    this.queue.push(update)

    // Sort by priority (high to low)
    this.queue.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Add multiple updates at once
   */
  addBatch(updates: LightUpdate[]): void {
    this.queue.push(...updates)
    this.queue.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Process queued updates within time budget
   * Call this every frame
   */
  update(processor: (update: LightUpdate) => void): number {
    if (this.queue.length === 0) return 0

    const startTime = performance.now()
    let processed = 0

    while (this.queue.length > 0 && performance.now() - startTime < this.frameBudget) {
      const update = this.queue.shift()
      if (update) {
        processor(update)
        processed++
      }
    }

    return processed
  }

  /**
   * Get queue status
   */
  getStatus(): { queued: number, budget: number } {
    return {
      queued: this.queue.length,
      budget: this.frameBudget
    }
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = []
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0
  }
}
