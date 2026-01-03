// src/modules/world/application/ChunkStorage.ts
/**
 * ChunkStorage - Pure chunk data storage
 *
 * Extracted from WorldService to separate storage concerns from generation and queries.
 * Manages the chunk map with get/set/unload operations.
 */
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { EventBus } from '../../../shared/infrastructure/EventBus'

export class ChunkStorage {
  private chunks = new Map<string, ChunkData>()

  constructor(private eventBus?: EventBus) {}

  /**
   * Get a chunk by coordinate
   */
  getChunk(coord: ChunkCoordinate): ChunkData | null {
    return this.chunks.get(coord.toKey()) || null
  }

  /**
   * Get or create a chunk (creates empty chunk if not exists)
   */
  getOrCreateChunk(coord: ChunkCoordinate): ChunkData {
    const existing = this.chunks.get(coord.toKey())
    if (existing) return existing

    const chunk = new ChunkData(coord)
    this.chunks.set(coord.toKey(), chunk)
    return chunk
  }

  /**
   * Set a chunk directly
   */
  setChunk(coord: ChunkCoordinate, chunk: ChunkData): void {
    this.chunks.set(coord.toKey(), chunk)
  }

  /**
   * Check if a chunk exists
   */
  hasChunk(coord: ChunkCoordinate): boolean {
    return this.chunks.has(coord.toKey())
  }

  /**
   * Get all loaded chunks
   */
  getAllChunks(): ChunkData[] {
    return Array.from(this.chunks.values())
  }

  /**
   * Get the number of loaded chunks
   */
  getLoadedChunkCount(): number {
    return this.chunks.size
  }

  /**
   * Unload a single chunk
   */
  unloadChunk(coord: ChunkCoordinate): void {
    const key = coord.toKey()
    const chunk = this.chunks.get(key)

    if (chunk) {
      this.chunks.delete(key)

      if (this.eventBus) {
        this.eventBus.emit('world', {
          type: 'ChunkUnloadedEvent',
          timestamp: Date.now(),
          chunkCoord: coord
        })
      }

      console.log(`🗑️ Unloaded chunk (${coord.x}, ${coord.z})`)
    }
  }

  /**
   * Unload chunks outside a radius from center
   */
  unloadChunksOutsideRadius(centerChunk: ChunkCoordinate, maxDistance: number): number {
    const chunksToUnload: ChunkCoordinate[] = []

    for (const chunk of this.chunks.values()) {
      const dx = chunk.coord.x - centerChunk.x
      const dz = chunk.coord.z - centerChunk.z
      const distanceSquared = dx * dx + dz * dz

      // Unload if beyond max distance (add 4 to cover square grid corners: sqrt(6²+6²) ≈ 8.49)
      if (distanceSquared > (maxDistance + 4) * (maxDistance + 4)) {
        chunksToUnload.push(chunk.coord)
      }
    }

    for (const coord of chunksToUnload) {
      this.unloadChunk(coord)
    }

    return chunksToUnload.length
  }

  /**
   * Clear all chunks
   */
  clearAllChunks(): void {
    const coords = Array.from(this.chunks.values()).map(c => c.coord)
    for (const coord of coords) {
      this.unloadChunk(coord)
    }
    console.log('🗑️ Cleared all chunks')
  }
}
