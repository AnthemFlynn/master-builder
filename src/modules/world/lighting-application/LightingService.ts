// src/modules/world/lighting-application/LightingService.ts
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { IVoxelQuery } from '../ports/IVoxelQuery'
import { LightData } from '../lighting-domain/LightData'
import { LightValue } from '../lighting-domain/LightValue'
import { ILightingQuery } from '../lighting-ports/ILightingQuery'
import { LightingPipeline } from './LightingPipeline'
import { EventBus } from '../../game/infrastructure/EventBus'

export class LightingService implements ILightingQuery {
  private lightDataMap = new Map<string, LightData>()
  private pipeline: LightingPipeline

  constructor(
    private voxelQuery: IVoxelQuery,
    private eventBus: EventBus
  ) {
    this.pipeline = new LightingPipeline(voxelQuery)
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for chunk generation
    this.eventBus.on('world', 'ChunkGeneratedEvent', (e: any) => {
      this.calculateForChunk(e.chunkCoord, e.renderDistance)
    })

    // Listen for block placement/removal - recalculate lighting
    this.eventBus.on('world', 'BlockPlacedEvent', (e: any) => {
      // Recalculate lighting for the affected chunk
      this.executeImmediately(e.chunkCoord)

      // Emit invalidation event for mesh rebuild
      this.eventBus.emit('lighting', {
        type: 'LightingInvalidatedEvent',
        timestamp: Date.now(),
        chunkCoord: e.chunkCoord
      })
    })

    this.eventBus.on('world', 'BlockRemovedEvent', (e: any) => {
      // Recalculate lighting for the affected chunk
      this.executeImmediately(e.chunkCoord)

      // Emit invalidation event for mesh rebuild
      this.eventBus.emit('lighting', {
        type: 'LightingInvalidatedEvent',
        timestamp: Date.now(),
        chunkCoord: e.chunkCoord
      })
    })
  }

  calculateForChunk(coord: ChunkCoordinate, renderDistance: number): void {
    // For now, always calculate immediately (TODO: Add progressive loading)
    this.executeImmediately(coord)
  }

  private executeImmediately(coord: ChunkCoordinate): void {
    const lightData = this.pipeline.execute(coord)
    this.lightDataMap.set(coord.toKey(), lightData)

    // Emit completion event
    this.eventBus.emit('lighting', {
      type: 'LightingCalculatedEvent',
      timestamp: Date.now(),
      chunkCoord: coord
    })
  }

  getLight(worldX: number, worldY: number, worldZ: number): LightValue {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const lightData = this.lightDataMap.get(coord.toKey())

    if (!lightData) {
      // Chunk not lit yet - return default (should not happen if pipeline works)
      return {
        sky: { r: 15, g: 15, b: 15 },
        block: { r: 0, g: 0, b: 0 }
      }
    }

    const local = this.worldToLocal(worldX, worldY, worldZ)
    return lightData.getLight(local.x, local.y, local.z)
  }

  isLightingReady(coord: ChunkCoordinate): boolean {
    return this.lightDataMap.has(coord.toKey())
  }

  private worldToChunkCoord(worldX: number, worldZ: number): ChunkCoordinate {
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

  private getPlayerChunk(): ChunkCoordinate {
    // TODO: Get from player service (for now assume origin)
    return new ChunkCoordinate(0, 0)
  }
}
