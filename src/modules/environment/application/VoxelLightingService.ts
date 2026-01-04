// src/modules/environment/application/VoxelLightingService.ts
/**
 * VoxelLightingService - Voxel-based lighting system
 *
 * Extracted from EnvironmentService to separate lighting concerns.
 * Can be tested without Three.js, reusable for server-side generation.
 */
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ILightingQuery } from '../../../shared/ports/ILightingQuery'
import { ILightStorage } from '../../../shared/ports/ILightStorage'
import { LightValue } from '../../../shared/domain/LightValue'
import { LightingWorkerPool } from '../infrastructure/LightingWorkerPool'
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../../../shared/constants/ChunkConstants'

export interface VoxelLightingDependencies {
  eventBus: EventBus
  workerCount?: number
}

export class VoxelLightingService implements ILightingQuery, ILightStorage {
  private lightingWorkerPool: LightingWorkerPool
  private chunkDataMap = new Map<string, ChunkData>()
  private eventBus: EventBus

  constructor(deps: VoxelLightingDependencies) {
    this.eventBus = deps.eventBus

    // Initialize Lighting Worker Pool (default 6 workers)
    const workerCount = deps.workerCount ?? 6
    this.lightingWorkerPool = new LightingWorkerPool(workerCount)

    this.setupEventListeners()
  }

  // === ILightingQuery Implementation ===

  getLight(worldX: number, worldY: number, worldZ: number): LightValue {
    const cx = Math.floor(worldX / CHUNK_WIDTH)
    const cz = Math.floor(worldZ / CHUNK_DEPTH)
    const coord = new ChunkCoordinate(cx, cz)
    const data = this.chunkDataMap.get(coord.toKey())

    // Default to DARKNESS if chunk is missing
    if (!data) return { sky: { r: 0, g: 0, b: 0 }, block: { r: 0, g: 0, b: 0 } }

    const lx = ((worldX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    const lz = ((worldZ % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH

    // Use ChunkData API
    const b = data.getBlockLight(lx, worldY, lz)
    const s = data.getSkyLight(lx, worldY, lz)

    // Sky light is 4-bit intensity (white)
    return {
      sky: { r: s, g: s, b: s },
      block: b
    }
  }

  isLightingReady(coord: ChunkCoordinate): boolean {
    return this.chunkDataMap.has(coord.toKey())
  }

  // === ILightStorage Implementation ===

  getLightData(coord: ChunkCoordinate): ChunkData | undefined {
    return this.chunkDataMap.get(coord.toKey())
  }

  // === Lighting Calculation ===

  /**
   * Calculate lighting for a chunk using worker pool
   */
  async calculateLight(
    coord: ChunkCoordinate,
    neighborVoxels: Record<string, ArrayBuffer>
  ): Promise<void> {
    const result = await this.lightingWorkerPool.calculateLight(coord, neighborVoxels)

    const { x, z, chunkBuffer } = result
    const resultCoord = new ChunkCoordinate(x, z)

    // Create ChunkData from buffer (Bit Packed)
    const chunkData = new ChunkData(resultCoord, chunkBuffer)

    this.chunkDataMap.set(resultCoord.toKey(), chunkData)

    this.eventBus.emit('lighting', {
      type: 'LightingCalculatedEvent',
      chunkCoord: resultCoord,
      lightBuffer: chunkBuffer // Pass the unified buffer back to subscribers (WorldService)
    })
  }

  /**
   * Get worker utilization stats
   */
  getWorkerUtilization(): { busy: number; total: number } {
    return this.lightingWorkerPool.getUtilization()
  }

  // === Event Handling ===

  private setupEventListeners(): void {
    this.eventBus.on('world', 'ChunkGeneratedEvent', (_e: any) => {
      // Trigger handled by WorldService call
    })

    this.eventBus.on('world', 'BlockPlacedEvent', (e: any) => {
      this.handleBlockUpdate(e.chunkCoord)
    })
    this.eventBus.on('world', 'BlockRemovedEvent', (e: any) => {
      this.handleBlockUpdate(e.chunkCoord)
    })

    this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
      const key = e.chunkCoord.toKey()
      this.chunkDataMap.delete(key)
    })
  }

  private handleBlockUpdate(_coord: ChunkCoordinate): void {
    // Placeholder for incremental updates
  }
}
