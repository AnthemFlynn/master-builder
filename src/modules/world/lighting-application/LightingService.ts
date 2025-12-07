// src/modules/world/lighting-application/LightingService.ts
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { IVoxelQuery } from '../ports/IVoxelQuery'
import { LightData } from '../lighting-domain/LightData'
import { LightValue } from '../lighting-domain/LightValue'
import { ILightingQuery } from '../lighting-ports/ILightingQuery'
import { ILightStorage } from '../lighting-ports/ILightStorage'
import { LightingPipeline } from './LightingPipeline' // Keep for sync fallback or remove?
import { EventBus } from '../../game/infrastructure/EventBus'
import { WorldService } from '../application/WorldService'

export class LightingService implements ILightingQuery, ILightStorage {
  private lightDataMap = new Map<string, LightData>()

  constructor(
    private worldService: WorldService, // Need full WorldService, not just IVoxelQuery
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for chunk generation
    this.eventBus.on('world', 'ChunkGeneratedEvent', (e: any) => {
      this.calculateForChunk(e.chunkCoord)
    })
    
    // Listen for worker completion
    this.eventBus.on('lighting', 'LightingWorkerCompleteEvent', (e: any) => {
        const coord = e.chunkCoord
        const lightData = new LightData(coord)
        
        // Unpack buffers
        const size = 24 * 256 * 24
        const skyArr = new Uint8Array(e.lightBuffer.sky)
        const blockArr = new Uint8Array(e.lightBuffer.block)
        
        // Manual hydration (until setBuffers is official)
        // Accessing private members via `any` cast for prototype speed
        // TODO: Add proper public API to LightData
        const raw = lightData as any
        raw.skyLightR = skyArr.slice(0, size)
        raw.skyLightG = skyArr.slice(size, size * 2)
        raw.skyLightB = skyArr.slice(size * 2, size * 3)
        raw.blockLightR = blockArr.slice(0, size)
        raw.blockLightG = blockArr.slice(size, size * 2)
        raw.blockLightB = blockArr.slice(size * 2, size * 3)
        
        this.lightDataMap.set(coord.toKey(), lightData)
        
        this.eventBus.emit('lighting', {
            type: 'LightingCalculatedEvent',
            timestamp: Date.now(),
            chunkCoord: coord
        })
    })

    // Listen for block placement/removal - recalculate lighting
    // SYNC for interactions? Or Async?
    // Interactions should probably remain Sync for instant feedback, 
    // OR optimistic updates.
    // Let's keep interactions sync for now? Or use worker?
    // Using worker for single block update is overkill latency?
    // Actually, light propagation can take 10-20ms. Worker is better.
    this.eventBus.on('world', 'BlockPlacedEvent', (e: any) => {
      this.calculateForChunk(e.chunkCoord)
      this.updateNeighbors(e.chunkCoord)
    })

    this.eventBus.on('world', 'BlockRemovedEvent', (e: any) => {
      this.calculateForChunk(e.chunkCoord)
      this.updateNeighbors(e.chunkCoord)
    })
  }

  calculateForChunk(coord: ChunkCoordinate): void {
     // Delegate to WorldService -> Worker
     this.worldService.calculateLightAsync(coord)
  }

  getLightData(coord: ChunkCoordinate): LightData | undefined {
    return this.lightDataMap.get(coord.toKey())
  }
  
  // Public method to accept results from WorldService (callback/event)
  // Actually, WorldService receives the message. 
  // WorldService should emit an event or call this service?
  // Ideally, WorldService handles the worker entirely.
  // LightingService should just listen to 'LightCalculated' from WorldService?
  // YES. WorldService owns the Worker.
  
  // So setupEventListeners should listen to a new event from WorldService.

  private updateNeighbors(coord: ChunkCoordinate): void {
    const neighbors = [
      { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
      { dx: 0, dz: 1 }, { dx: 0, dz: -1 }
    ]

    for (const { dx, dz } of neighbors) {
      const neighborCoord = new ChunkCoordinate(coord.x + dx, coord.z + dz)
      // Only update if neighbor exists (is loaded)
      if (this.lightDataMap.has(neighborCoord.toKey())) {
        this.calculateForChunk(neighborCoord)
      }
    }
  }

  getLight(worldX: number, worldY: number, worldZ: number): LightValue {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const lightData = this.lightDataMap.get(coord.toKey())

    if (!lightData) {
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
  
  // Helper methods...
  private worldToChunkCoord(worldX: number, worldZ: number): ChunkCoordinate {
      return new ChunkCoordinate(Math.floor(worldX / 24), Math.floor(worldZ / 24))
  }
  private worldToLocal(worldX: number, worldY: number, worldZ: number) {
      return { x: ((worldX % 24) + 24) % 24, y: worldY, z: ((worldZ % 24) + 24) % 24 }
  }
}
