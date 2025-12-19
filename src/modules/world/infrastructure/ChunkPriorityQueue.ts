import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'

/**
 * Generates chunk coordinates in spiral order from center outward.
 * This ensures center chunks (where the player is) load first for
 * fast time-to-playable.
 */
export function generateSpiralOrder(
  center: ChunkCoordinate,
  renderDistance: number
): ChunkCoordinate[] {
  const chunks: ChunkCoordinate[] = []

  // Add center first (highest priority)
  chunks.push(center)

  // Spiral outward
  for (let ring = 1; ring <= renderDistance; ring++) {
    // Top edge (left to right)
    for (let x = -ring; x <= ring; x++) {
      chunks.push(new ChunkCoordinate(center.x + x, center.z - ring))
    }

    // Right edge (top to bottom, excluding corners)
    for (let z = -ring + 1; z <= ring - 1; z++) {
      chunks.push(new ChunkCoordinate(center.x + ring, center.z + z))
    }

    // Bottom edge (right to left)
    for (let x = ring; x >= -ring; x--) {
      chunks.push(new ChunkCoordinate(center.x + x, center.z + ring))
    }

    // Left edge (bottom to top, excluding corners)
    for (let z = ring - 1; z >= -ring + 1; z--) {
      chunks.push(new ChunkCoordinate(center.x - ring, center.z + z))
    }
  }

  return chunks
}

/**
 * Priority queue for chunk generation that supports:
 * - Spiral ordering from center
 * - Skip already-generated chunks
 * - Progressive generation with async iteration
 */
export class ChunkPriorityQueue {
  private queue: ChunkCoordinate[] = []
  private generatedChunks: Set<string>

  constructor(generatedChunks: Set<string>) {
    this.generatedChunks = generatedChunks
  }

  /**
   * Fill queue with spiral-ordered chunks, skipping already generated ones
   */
  fillFromCenter(center: ChunkCoordinate, renderDistance: number): void {
    const spiralOrder = generateSpiralOrder(center, renderDistance)

    // Filter out already generated chunks
    this.queue = spiralOrder.filter(
      coord => !this.generatedChunks.has(coord.toKey())
    )
  }

  /**
   * Get next chunk to generate (or null if empty)
   */
  next(): ChunkCoordinate | null {
    return this.queue.shift() ?? null
  }

  /**
   * Check if queue has more chunks
   */
  hasMore(): boolean {
    return this.queue.length > 0
  }

  /**
   * Get remaining count
   */
  remaining(): number {
    return this.queue.length
  }

  /**
   * Take up to N chunks from the front of the queue
   */
  takeN(n: number): ChunkCoordinate[] {
    const taken: ChunkCoordinate[] = []
    while (taken.length < n && this.queue.length > 0) {
      taken.push(this.queue.shift()!)
    }
    return taken
  }
}
