// src/modules/world/application/WorldService.ts
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { IModificationQuery } from '../../../shared/ports/IModificationQuery'
import { blockRegistry } from '../blocks'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { EnvironmentService } from '../../environment/application/EnvironmentService'
import { ChunkWorkerPool } from '../infrastructure/ChunkWorkerPool'

export class WorldService implements IVoxelQuery {
  private chunks = new Map<string, ChunkData>()
  private workerPool: ChunkWorkerPool
  private environmentService?: EnvironmentService
  private modificationQuery?: IModificationQuery

  // Track pending chunk requests to avoid duplicates
  private pendingChunks = new Set<string>()

  // Debounce lighting recalculations to prevent CPU overload
  private pendingLightingChunks = new Set<string>()
  private lightingDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private readonly LIGHTING_DEBOUNCE_MS = 50 // Batch lighting updates

  constructor(private eventBus?: EventBus) {
    // Use worker pool with 6 workers for parallel chunk generation
    this.workerPool = new ChunkWorkerPool(6)

    if (this.eventBus) {
        this.eventBus.on('lighting', 'LightingCalculatedEvent', (e: any) => {
            const coord = new ChunkCoordinate(e.chunkCoord.x, e.chunkCoord.z)
            const chunk = this.getChunk(coord)
            if (chunk && e.lightBuffer) {
                chunk.setBuffer(e.lightBuffer)
            }
        })
    }
  }

  setEnvironmentService(service: EnvironmentService) {
      this.environmentService = service
  }

  setModificationTracker(query: IModificationQuery) {
      this.modificationQuery = query
  }

  generateChunkAsync(coord: ChunkCoordinate, renderDistance: number): void {
    const key = coord.toKey()

    // Skip if already generated or pending
    if (this.chunks.has(key) || this.pendingChunks.has(key)) {
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

        this.chunks.set(key, newChunk)

        if (this.eventBus) {
          this.eventBus.emit('world', {
            type: 'ChunkGeneratedEvent',
            timestamp: Date.now(),
            chunkCoord,
            renderDistance
          })
        }

        // Trigger lighting calculation for the newly generated chunk
        this.calculateLightAsync(chunkCoord)
      })
      .catch(error => {
        console.error(`[WorldService] Failed to generate chunk (${coord.x}, ${coord.z}):`, error)
        this.pendingChunks.delete(key)
      })
  }

  getWorkerUtilization(): { busy: number; total: number } {
    return this.workerPool.getUtilization()
  }

  calculateLightAsync(coord: ChunkCoordinate): void {
      if (!this.environmentService) {
          console.error("WorldService: EnvironmentService not linked, cannot calc light")
          return
      }

      // Add to pending set (deduplicates automatically)
      this.pendingLightingChunks.add(coord.toKey())

      // Debounce: wait for more chunks to accumulate before processing
      if (this.lightingDebounceTimer) {
          clearTimeout(this.lightingDebounceTimer)
      }

      this.lightingDebounceTimer = setTimeout(() => {
          this.flushPendingLighting()
      }, this.LIGHTING_DEBOUNCE_MS)
  }

  private flushPendingLighting(): void {
      if (!this.environmentService || this.pendingLightingChunks.size === 0) {
          return
      }

      // Process all pending chunks
      for (const key of this.pendingLightingChunks) {
          const [x, z] = key.split(',').map(Number)
          const coord = new ChunkCoordinate(x, z)

          const neighborVoxels: Record<string, ArrayBuffer> = {}

          // Center and Neighbors (for propagation)
          const offsets = ['0,0', '1,0', '-1,0', '0,1', '0,-1']

          for (const offsetKey of offsets) {
              const [dx, dz] = offsetKey.split(',').map(Number)
              const nCoord = new ChunkCoordinate(coord.x + dx, coord.z + dz)
              const nChunk = this.getChunk(nCoord)
              if (nChunk) {
                  neighborVoxels[offsetKey] = nChunk.getRawBuffer()
              }
          }

          // Delegate to Environment
          this.environmentService.calculateLight(coord, neighborVoxels)
      }

      // Clear pending set
      this.pendingLightingChunks.clear()
      this.lightingDebounceTimer = null
  }

  getChunk(coord: ChunkCoordinate): ChunkData | null {
    return this.chunks.get(coord.toKey()) || null
  }

  getOrCreateChunk(coord: ChunkCoordinate): ChunkData {
    const existing = this.chunks.get(coord.toKey())
    if (existing) return existing

    const chunk = new ChunkData(coord)
    this.chunks.set(coord.toKey(), chunk)
    return chunk
  }

  getBlockType(worldX: number, worldY: number, worldZ: number): number {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const chunk = this.getChunk(coord)

    if (!chunk) return -1

    const local = this.worldToLocal(worldX, worldY, worldZ)
    return chunk.getBlockId(local.x, local.y, local.z)
  }

  isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
    const blockType = this.getBlockType(worldX, worldY, worldZ)
    if (blockType === -1) return false  // Air is not solid

    // Check block definition for collidable flag
    const blockDef = blockRegistry.get(blockType)
    return blockDef ? blockDef.collidable : false // Default to false (Air) if unknown
  }

  getLightAbsorption(worldX: number, worldY: number, worldZ: number): number {
    const type = this.getBlockType(worldX, worldY, worldZ)
    if (type === -1 || type === 0) return 0
    
    const def = blockRegistry.get(type)
    if (!def) return 15
    
    if (def.transparent) {
        return def.lightAbsorption ? Math.floor(def.lightAbsorption * 15) : 1
    }
    return 15
  }

  setBlock(worldX: number, worldY: number, worldZ: number, blockType: number): void {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const chunk = this.getOrCreateChunk(coord)
    const local = this.worldToLocal(worldX, worldY, worldZ)
    chunk.setBlockId(local.x, local.y, local.z, blockType)
    
    // Trigger Lighting Calculation
    this.calculateLightAsync(coord)
    
    // Check if we need to update neighbors (if on edge)
    const neighborsToUpdate = new Set<string>()
    if (local.x === 0) neighborsToUpdate.add(`${coord.x - 1},${coord.z}`)
    if (local.x === 23) neighborsToUpdate.add(`${coord.x + 1},${coord.z}`)
    if (local.z === 0) neighborsToUpdate.add(`${coord.x},${coord.z - 1}`)
    if (local.z === 23) neighborsToUpdate.add(`${coord.x},${coord.z + 1}`)
    
    for (const key of neighborsToUpdate) {
        const [x, z] = key.split(',').map(Number)
        this.calculateLightAsync(new ChunkCoordinate(x, z))
    }
  }

  getAllChunks(): ChunkData[] {
    return Array.from(this.chunks.values())
  }

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
   * Clear all chunks (used when loading a save)
   */
  clearAllChunks(): void {
    const coords = Array.from(this.chunks.values()).map(c => c.coord)
    for (const coord of coords) {
      this.unloadChunk(coord)
    }
    this.pendingChunks.clear()
    console.log('🗑️ Cleared all chunks')
  }

  /**
   * Get the number of currently loaded chunks
   */
  getLoadedChunkCount(): number {
    return this.chunks.size
  }

  worldToChunkCoord(worldX: number, worldZ: number): ChunkCoordinate {
    return new ChunkCoordinate(
      Math.floor(worldX / 24),
      Math.floor(worldZ / 24)
    )
  }

  private worldToLocal(worldX: number, worldY: number, worldZ: number): { x: number, y: number, z: number } {
    return {
      x: ((worldX % 24) + 24) % 24,
      y: worldY,
      z: ((worldZ % 24) + 24) % 24
    }
  }
}
