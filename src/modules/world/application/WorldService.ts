// src/modules/world/application/WorldService.ts
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { blockRegistry } from '../../blocks'
import { ChunkRequest, MainMessage } from '../workers/types'
import { EventBus } from '../../game/infrastructure/EventBus'
import { EnvironmentService } from '../../environment/application/EnvironmentService'

export class WorldService implements IVoxelQuery {
  private chunks = new Map<string, ChunkData>()
  private worker: Worker
  private environmentService?: EnvironmentService

  constructor(private eventBus?: EventBus) {
    this.worker = new Worker("/assets/ChunkWorker.js")
    this.worker.onmessage = this.handleWorkerMessage.bind(this)
    
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

  private handleWorkerMessage(e: MessageEvent<MainMessage>) {
    const msg = e.data
    
    if (msg.type === 'CHUNK_GENERATED') {
      const { x, z, blockBuffer, metadata, renderDistance } = msg
      const coord = new ChunkCoordinate(x, z)
      const chunk = this.getOrCreateChunk(coord)
      
      // Reconstruct ChunkData from buffer
      // We need a way to load the buffer into the existing ChunkData instance or replace it.
      // ChunkData constructor accepts buffer.
      const newChunk = new ChunkData(coord, blockBuffer, metadata)
      this.chunks.set(coord.toKey(), newChunk)
      
      console.log(`🌍 Worker generated chunk (${x}, ${z})`)

      if (this.eventBus) {
        this.eventBus.emit('world', {
          type: 'ChunkGeneratedEvent',
          timestamp: Date.now(),
          chunkCoord: coord,
          renderDistance
        })
      }
      // Trigger lighting calculation for the newly generated chunk
      this.calculateLightAsync(coord)
    }
  }

  generateChunkAsync(coord: ChunkCoordinate, renderDistance: number): void {
    // If already generated? Check chunks map.
    if (this.chunks.has(coord.toKey())) {
      return
    }
    
    // Mark as pending? Or just send request.
    // To avoid duplicate requests, we can add a placeholder or set a pending flag.
    // For now, simple check.

    const request: ChunkRequest = {
      type: 'GENERATE_CHUNK',
      x: coord.x,
      z: coord.z,
      renderDistance
    }
    
    this.worker.postMessage(request)
  }

  calculateLightAsync(coord: ChunkCoordinate): void {
      if (!this.environmentService) {
          console.error("WorldService: EnvironmentService not linked, cannot calc light")
          return
      }

      const neighborVoxels: Record<string, ArrayBuffer> = {}
      
      // Center and Neighbors (for propagation)
      const offsets = ['0,0', '1,0', '-1,0', '0,1', '0,-1']
      
      for (const key of offsets) {
          const [dx, dz] = key.split(',').map(Number)
          const nCoord = new ChunkCoordinate(coord.x + dx, coord.z + dz)
          const nChunk = this.getChunk(nCoord)
          if (nChunk) {
              neighborVoxels[key] = nChunk.getRawBuffer()
          }
      }
      
      // Delegate to Environment
      this.environmentService.calculateLight(coord, neighborVoxels)
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
}
