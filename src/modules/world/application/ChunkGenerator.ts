// src/modules/world/application/ChunkGenerator.ts
/**
 * ChunkGenerator - Chunk generation via worker pool
 *
 * Extracted from WorldService to separate generation concerns.
 * Manages worker pool, pending chunk tracking, and modification application.
 */
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { IModificationQuery } from '../../../shared/ports/IModificationQuery'
import { ChunkWorkerPool } from '../infrastructure/ChunkWorkerPool'
import { ChunkStorage } from './ChunkStorage'

export interface ChunkGeneratorDependencies {
  chunkStorage: ChunkStorage
  eventBus: EventBus
  workerCount?: number
}

export class ChunkGenerator {
  private workerPool: ChunkWorkerPool
  private pendingChunks = new Set<string>()
  private modificationQuery?: IModificationQuery

  private chunkStorage: ChunkStorage
  private eventBus: EventBus

  // Callback to trigger lighting after chunk generation
  private onChunkGenerated?: (coord: ChunkCoordinate) => void

  constructor(deps: ChunkGeneratorDependencies) {
    this.chunkStorage = deps.chunkStorage
    this.eventBus = deps.eventBus

    // Use worker pool with configurable worker count
    // Default: hardware-based (navigator.hardwareConcurrency - 2, clamped to 2-8)
    const workerCount = deps.workerCount ?? 4  // Fallback if not provided
    this.workerPool = new ChunkWorkerPool(workerCount)

    console.log(`🔧 ChunkGenerator initialized with ${workerCount} workers`)
  }

  /**
   * Set modification query for applying saved changes
   */
  setModificationQuery(query: IModificationQuery): void {
    this.modificationQuery = query
  }

  /**
   * Set callback for when a chunk is generated (used for lighting)
   */
  setOnChunkGenerated(callback: (coord: ChunkCoordinate) => void): void {
    this.onChunkGenerated = callback
  }

  /**
   * Set world type on all workers
   */
  async setWorldType(worldType: string, seed?: number): Promise<void> {
    await this.workerPool.setWorldType(worldType, seed)
  }

  /**
   * Generate a chunk asynchronously
   */
  generateChunkAsync(coord: ChunkCoordinate, renderDistance: number): void {
    const key = coord.toKey()

    // Skip if already generated or pending
    if (this.chunkStorage.hasChunk(coord) || this.pendingChunks.has(key)) {
      return
    }

    // Mark as pending to avoid duplicate requests
    this.pendingChunks.add(key)

    // Use worker pool for parallel generation
    this.workerPool.generateChunk(coord, renderDistance)
      .then(result => {
        // Remove from pending
        this.pendingChunks.delete(key)

        const { x, z, blockBuffer, metadata } = result
        const chunkCoord = new ChunkCoordinate(x, z)

        // Create ChunkData from buffer
        const newChunk = new ChunkData(chunkCoord, blockBuffer, metadata)

        // Apply saved modifications if any exist
        if (this.modificationQuery) {
          const mods = this.modificationQuery.getChunkModifications(key)
          if (mods && mods.size > 0) {
            for (const [localKey, blockType] of mods) {
              const [lx, ly, lz] = localKey.split(',').map(Number)
              newChunk.setBlockId(lx, ly, lz, blockType)
            }
            console.log(`📝 Applied ${mods.size} modifications to chunk (${x}, ${z})`)
          }
        }

        // Store in chunk storage
        this.chunkStorage.setChunk(chunkCoord, newChunk)

        // Emit generation event
        this.eventBus.emit('world', {
          type: 'ChunkGeneratedEvent',
          timestamp: Date.now(),
          chunkCoord,
          renderDistance
        })

        // Trigger lighting calculation callback
        this.onChunkGenerated?.(chunkCoord)
      })
      .catch(error => {
        console.error(`[ChunkGenerator] Failed to generate chunk (${coord.x}, ${coord.z}):`, error)
        this.pendingChunks.delete(key)
      })
  }

  /**
   * Check if a chunk is pending generation
   */
  isPending(coord: ChunkCoordinate): boolean {
    return this.pendingChunks.has(coord.toKey())
  }

  /**
   * Clear pending chunks (used when resetting world)
   */
  clearPending(): void {
    this.pendingChunks.clear()
  }

  /**
   * Get worker utilization stats
   */
  getWorkerUtilization(): { busy: number; total: number } {
    return this.workerPool.getUtilization()
  }
}
