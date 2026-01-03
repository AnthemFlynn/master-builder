// src/modules/world/application/WorldService.ts
/**
 * WorldService - Voxel queries and world coordination
 *
 * Refactored to delegate storage to ChunkStorage and generation to ChunkGenerator.
 * Implements IVoxelQuery for block-level operations.
 */
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { IModificationQuery } from '../../../shared/ports/IModificationQuery'
import { blockRegistry } from '../blocks'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { EnvironmentService } from '../../environment/application/EnvironmentService'
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../../../shared/constants/ChunkConstants'

// Extracted classes
import { ChunkStorage } from './ChunkStorage'
import { ChunkGenerator } from './ChunkGenerator'

export class WorldService implements IVoxelQuery {
  // Extracted components
  private chunkStorage: ChunkStorage
  private chunkGenerator: ChunkGenerator

  // Dependencies
  private environmentService?: EnvironmentService

  // Debounce lighting recalculations to prevent CPU overload
  private pendingLightingChunks = new Set<string>()
  private lightingDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private readonly LIGHTING_DEBOUNCE_MS = 50 // Batch lighting updates

  constructor(private eventBus?: EventBus, workerPoolSize?: number) {
    // Create extracted components
    this.chunkStorage = new ChunkStorage(eventBus)
    this.chunkGenerator = new ChunkGenerator({
      chunkStorage: this.chunkStorage,
      eventBus: eventBus!,
      workerCount: workerPoolSize
    })

    // Wire up lighting callback
    this.chunkGenerator.setOnChunkGenerated((coord) => {
      this.calculateLightAsync(coord)
    })

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
    this.chunkGenerator.setModificationQuery(query)
  }

  // === Delegation to ChunkGenerator ===

  async setWorldType(worldType: string, seed?: number): Promise<void> {
    await this.chunkGenerator.setWorldType(worldType, seed)
  }

  generateChunkAsync(coord: ChunkCoordinate, renderDistance: number): void {
    this.chunkGenerator.generateChunkAsync(coord, renderDistance)
  }

  getWorkerUtilization(): { busy: number; total: number } {
    return this.chunkGenerator.getWorkerUtilization()
  }

  // === Delegation to ChunkStorage ===

  getChunk(coord: ChunkCoordinate): ChunkData | null {
    return this.chunkStorage.getChunk(coord)
  }

  getOrCreateChunk(coord: ChunkCoordinate): ChunkData {
    return this.chunkStorage.getOrCreateChunk(coord)
  }

  getAllChunks(): ChunkData[] {
    return this.chunkStorage.getAllChunks()
  }

  getLoadedChunkCount(): number {
    return this.chunkStorage.getLoadedChunkCount()
  }

  unloadChunk(coord: ChunkCoordinate): void {
    this.chunkStorage.unloadChunk(coord)
  }

  unloadChunksOutsideRadius(centerChunk: ChunkCoordinate, maxDistance: number): number {
    return this.chunkStorage.unloadChunksOutsideRadius(centerChunk, maxDistance)
  }

  clearAllChunks(): void {
    this.chunkStorage.clearAllChunks()
    this.chunkGenerator.clearPending()
  }

  // === Lighting Coordination ===

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
          neighborVoxels[offsetKey] = nChunk.getSharedBuffer()
        }
      }

      // Delegate to Environment
      this.environmentService.calculateLight(coord, neighborVoxels)
    }

    // Clear pending set
    this.pendingLightingChunks.clear()
    this.lightingDebounceTimer = null
  }

  // === IVoxelQuery Implementation ===

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
    if (local.x === CHUNK_WIDTH - 1) neighborsToUpdate.add(`${coord.x + 1},${coord.z}`)
    if (local.z === 0) neighborsToUpdate.add(`${coord.x},${coord.z - 1}`)
    if (local.z === CHUNK_DEPTH - 1) neighborsToUpdate.add(`${coord.x},${coord.z + 1}`)

    for (const key of neighborsToUpdate) {
      const [x, z] = key.split(',').map(Number)
      this.calculateLightAsync(new ChunkCoordinate(x, z))
    }
  }

  // === Coordinate Helpers ===

  worldToChunkCoord(worldX: number, worldZ: number): ChunkCoordinate {
    return new ChunkCoordinate(
      Math.floor(worldX / CHUNK_WIDTH),
      Math.floor(worldZ / CHUNK_DEPTH)
    )
  }

  private worldToLocal(worldX: number, worldY: number, worldZ: number): { x: number, y: number, z: number } {
    return {
      x: ((worldX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH,
      y: worldY,
      z: ((worldZ % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH
    }
  }
}
