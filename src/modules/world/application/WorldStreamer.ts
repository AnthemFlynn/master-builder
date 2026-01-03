// src/modules/world/application/WorldStreamer.ts
/**
 * WorldStreamer - Manages chunk streaming based on player position
 *
 * Coordinates chunk loading/unloading as player moves through the world.
 * Uses spiral loading pattern for optimal perceived loading.
 */
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { generateSpiralOrder } from '../infrastructure/ChunkPriorityQueue'
import { ChunkStorage } from './ChunkStorage'
import { ChunkGenerator } from './ChunkGenerator'

export interface WorldStreamerConfig {
  renderDistance: number    // Chunks to load around player
  unloadDistance: number    // Distance at which to unload chunks
  unloadInterval?: number   // How often to check for unloading (ms)
}

export interface WorldStreamerDependencies {
  chunkStorage: ChunkStorage
  chunkGenerator: ChunkGenerator
  eventBus: EventBus
}

export class WorldStreamer {
  private chunkStorage: ChunkStorage
  private chunkGenerator: ChunkGenerator
  private eventBus: EventBus

  private renderDistance: number
  private unloadDistance: number
  private unloadInterval: number

  private lastUnloadTime = 0
  private lastPlayerChunk: ChunkCoordinate | null = null

  constructor(
    deps: WorldStreamerDependencies,
    config: WorldStreamerConfig
  ) {
    this.chunkStorage = deps.chunkStorage
    this.chunkGenerator = deps.chunkGenerator
    this.eventBus = deps.eventBus

    this.renderDistance = config.renderDistance
    this.unloadDistance = config.unloadDistance
    this.unloadInterval = config.unloadInterval ?? 30000
  }

  /**
   * Update render distance (can be changed dynamically via settings)
   */
  setRenderDistance(distance: number): void {
    this.renderDistance = distance
    this.unloadDistance = distance + 4  // Keep unload distance proportional
  }

  /**
   * Get current render distance
   */
  getRenderDistance(): number {
    return this.renderDistance
  }

  /**
   * Called when player moves - handles chunk loading and unloading
   * Returns true if player moved to a new chunk
   */
  updatePlayerPosition(chunkX: number, chunkZ: number, currentTime: number): boolean {
    const currentChunk = new ChunkCoordinate(chunkX, chunkZ)
    const chunkChanged = !this.lastPlayerChunk ||
      this.lastPlayerChunk.x !== chunkX ||
      this.lastPlayerChunk.z !== chunkZ

    if (chunkChanged) {
      this.lastPlayerChunk = currentChunk

      // Load chunks around new position
      this.loadChunksAround(currentChunk)

      // Unload distant chunks (throttled)
      if (currentTime - this.lastUnloadTime > this.unloadInterval) {
        const unloaded = this.unloadDistantChunks(currentChunk)
        if (unloaded > 0) {
          this.lastUnloadTime = currentTime
        }
      }
    }

    return chunkChanged
  }

  /**
   * Load chunks in spiral order around center
   */
  loadChunksAround(center: ChunkCoordinate): void {
    const spiralOrder = generateSpiralOrder(center, this.renderDistance)
    for (const coord of spiralOrder) {
      this.chunkGenerator.generateChunkAsync(coord, this.renderDistance)
    }
  }

  /**
   * Force-fill chunks around a position (used during initial load)
   */
  fillChunksAround(center: ChunkCoordinate): void {
    this.loadChunksAround(center)
  }

  /**
   * Unload chunks outside the unload distance
   * Returns number of chunks unloaded
   */
  unloadDistantChunks(center: ChunkCoordinate): number {
    return this.chunkStorage.unloadChunksOutsideRadius(center, this.unloadDistance)
  }

  /**
   * Get streaming stats for debugging
   */
  getStats(): { loaded: number; renderDistance: number; unloadDistance: number } {
    return {
      loaded: this.chunkStorage.getLoadedChunkCount(),
      renderDistance: this.renderDistance,
      unloadDistance: this.unloadDistance
    }
  }
}
