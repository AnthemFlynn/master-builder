// src/modules/world/application/WorldService.ts
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { VoxelChunk } from '../domain/VoxelChunk'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { blockRegistry } from '../../../blocks'
import ChunkWorker from '../workers/ChunkWorker?worker'
import { ChunkRequest, MainMessage } from '../workers/types'
import { EventBus } from '../../game/infrastructure/EventBus'
import { EnvironmentService } from '../../environment/application/EnvironmentService'

export class WorldService implements IVoxelQuery {
  private chunks = new Map<string, VoxelChunk>()
  private worker: Worker
  private environmentService?: EnvironmentService

  constructor(private eventBus?: EventBus) {
    this.worker = new ChunkWorker()
    this.worker.onmessage = this.handleWorkerMessage.bind(this)
  }

  setEnvironmentService(service: EnvironmentService) {
      this.environmentService = service
  }

  private handleWorkerMessage(e: MessageEvent<MainMessage>) {
    const msg = e.data
    
    if (msg.type === 'CHUNK_GENERATED') {
      const { x, z, blockBuffer, renderDistance } = msg
      const coord = new ChunkCoordinate(x, z)
      const chunk = this.getOrCreateChunk(coord)
      
      chunk.setRawBuffer(blockBuffer)
      chunk.markGenerated()
      
      console.log(`🌍 Worker generated chunk (${x}, ${z})`)

      if (this.eventBus) {
        this.eventBus.emit('world', {
          type: 'ChunkGeneratedEvent',
          timestamp: Date.now(),
          chunkCoord: coord,
          renderDistance
        })
      }
    }
    else if (msg.type === 'MESH_GENERATED') {
        const { x, z, geometry } = msg
        const coord = new ChunkCoordinate(x, z)
        
        if (this.eventBus) {
            this.eventBus.emit('meshing', {
                type: 'MeshingWorkerCompleteEvent',
                chunkCoord: coord,
                geometry
            })
        }
    }
  }

  generateChunkAsync(coord: ChunkCoordinate, renderDistance: number): void {
    const chunk = this.getOrCreateChunk(coord)
    
    if (chunk.isGenerated()) {
      return
    }

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
          if (nChunk && nChunk.isGenerated()) {
              neighborVoxels[key] = nChunk.getRawBuffer()
          }
      }
      
      // Delegate to Environment
      this.environmentService.calculateLight(coord, neighborVoxels)
  }

  getChunk(coord: ChunkCoordinate): VoxelChunk | null {
    return this.chunks.get(coord.toKey()) || null
  }

  getOrCreateChunk(coord: ChunkCoordinate): VoxelChunk {
    const existing = this.chunks.get(coord.toKey())
    if (existing) return existing

    const chunk = new VoxelChunk(coord)
    this.chunks.set(coord.toKey(), chunk)
    console.log(`📦 Created VoxelChunk at (${coord.x}, ${coord.z})`)
    return chunk
  }

  getBlockType(worldX: number, worldY: number, worldZ: number): number {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const chunk = this.getChunk(coord)

    if (!chunk) return -1

    const local = this.worldToLocal(worldX, worldY, worldZ)
    return chunk.getBlockType(local.x, local.y, local.z)
  }

  isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
    const blockType = this.getBlockType(worldX, worldY, worldZ)
    if (blockType === -1) return false  // Air is not solid

    // Check block definition for collidable flag
    const blockDef = blockRegistry.get(blockType)
    return blockDef ? blockDef.collidable : true
  }

  setBlock(worldX: number, worldY: number, worldZ: number, blockType: number): void {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const chunk = this.getOrCreateChunk(coord)
    const local = this.worldToLocal(worldX, worldY, worldZ)
    chunk.setBlockType(local.x, local.y, local.z, blockType)
  }

  getAllChunks(): VoxelChunk[] {
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
