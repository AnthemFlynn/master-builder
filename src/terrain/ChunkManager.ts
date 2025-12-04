import { Chunk } from './Chunk'

/**
 * Manages chunk lifecycle and coordinate conversions
 */
export class ChunkManager {
  private chunks = new Map<string, Chunk>()
  private chunkSize: number = 24

  /**
   * Get or create chunk at chunk coordinates
   */
  getChunk(chunkX: number, chunkZ: number): Chunk {
    const key = `${chunkX},${chunkZ}`

    if (!this.chunks.has(key)) {
      const chunk = new Chunk(chunkX, chunkZ)
      this.chunks.set(key, chunk)
    }

    return this.chunks.get(key)!
  }

  /**
   * Convert world coordinates to chunk + local coordinates
   */
  worldToChunk(x: number, y: number, z: number): {
    chunkX: number
    chunkZ: number
    localX: number
    localY: number
    localZ: number
  } {
    const chunkX = Math.floor(x / this.chunkSize)
    const chunkZ = Math.floor(z / this.chunkSize)

    const localX = x - chunkX * this.chunkSize
    const localY = y
    const localZ = z - chunkZ * this.chunkSize

    return { chunkX, chunkZ, localX, localY, localZ }
  }

  /**
   * Get light at world coordinates
   */
  getLightAt(x: number, y: number, z: number): {
    sky: { r: number, g: number, b: number },
    block: { r: number, g: number, b: number }
  } {
    const { chunkX, chunkZ, localX, localY, localZ } = this.worldToChunk(x, y, z)
    const chunk = this.getChunk(chunkX, chunkZ)
    return chunk.getLight(localX, localY, localZ)
  }

  /**
   * Set light at world coordinates
   */
  setLightAt(
    x: number,
    y: number,
    z: number,
    channel: 'sky' | 'block',
    color: { r: number, g: number, b: number }
  ): void {
    const { chunkX, chunkZ, localX, localY, localZ } = this.worldToChunk(x, y, z)
    const chunk = this.getChunk(chunkX, chunkZ)
    chunk.setLight(localX, localY, localZ, channel, color)
  }

  /**
   * Get all loaded chunks
   */
  getAllChunks(): Chunk[] {
    return Array.from(this.chunks.values())
  }

  /**
   * Get total memory usage
   */
  getTotalMemoryUsage(): number {
    return this.getAllChunks().reduce((total, chunk) => total + chunk.getMemoryUsage(), 0)
  }

  /**
   * Unload chunks far from player (future optimization)
   */
  unloadDistantChunks(playerX: number, playerZ: number, maxDistance: number): void {
    // TODO: Implement chunk unloading
  }
}
