// src/modules/lighting/application/LightingService.ts
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { LightData } from '../domain/LightData'
import { LightValue } from '../domain/LightValue'
import { ILightingQuery } from '../ports/ILightingQuery'
import { LightingPipeline } from './LightingPipeline'
import { EventBus } from '../../terrain/application/EventBus'

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
  }

  calculateForChunk(coord: ChunkCoordinate, renderDistance: number): void {
    // Check visibility (eager vs progressive)
    const playerChunk = this.getPlayerChunk()  // TODO: Get from player service
    const distance = Math.max(
      Math.abs(coord.x - playerChunk.x),
      Math.abs(coord.z - playerChunk.z)
    )

    if (distance <= renderDistance) {
      // EAGER: In render distance, calculate immediately
      this.executeImmediately(coord)
    } else {
      // PROGRESSIVE: Defer until needed
      console.log(`⏳ Deferring lighting for distant chunk (${coord.x}, ${coord.z})`)
    }
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
