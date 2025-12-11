// src/modules/rendering/meshing-application/MeshingService.ts
import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../environment/ports/ILightingQuery'
import { EventBus } from '../../game/infrastructure/EventBus'
import { ILightStorage } from '../../environment/ports/ILightStorage'
import { WorkerMessage, MainMessage } from '../workers/types'

export class MeshingService {
  private dirtyQueue = new Map<string, 'block' | 'light' | 'global'>()
  private rebuildBudgetMs = 3
  private worker: Worker

  constructor(
    private voxels: IVoxelQuery & { getChunk: any }, // Need getChunk for buffers
    private lighting: ILightingQuery & ILightStorage, // Need storage access to get raw buffers
    private eventBus: EventBus
  ) {
    this.worker = new Worker("/assets/MeshingWorker.js")
    this.worker.onmessage = this.handleWorkerMessage.bind(this)
    this.setupEventListeners()
  }

  private handleWorkerMessage(e: MessageEvent<MainMessage>) {
      const msg = e.data
      if (msg.type === 'MESH_GENERATED') {
        const { x, z, geometry } = msg
        const coord = new ChunkCoordinate(x, z)
        
        const geometryMap = new Map<string, THREE.BufferGeometry>()
        
        for (const [key, buffers] of Object.entries(geometry as Record<string, any>)) {
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3))
            geo.setAttribute('color', new THREE.Float32BufferAttribute(buffers.colors, 3))
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2))
            geo.setIndex(new THREE.Uint16BufferAttribute(buffers.indices, 1))
            geo.computeVertexNormals()
            geometryMap.set(key, geo)
        }
        
        this.eventBus.emit('meshing', {
            type: 'ChunkMeshBuiltEvent',
            timestamp: Date.now(),
            chunkCoord: coord,
            geometryMap
        })
      }
  }

  private setupEventListeners(): void {
    // Listen for lighting ready
    this.eventBus.on('lighting', 'LightingCalculatedEvent', (e: any) => {
      this.markDirty(e.chunkCoord, 'global')
      
      // Also mark neighbors dirty because their faces might be revealed/hidden
      // by changes in this chunk (border culling).
      const { x, z } = e.chunkCoord
      this.markDirty(new ChunkCoordinate(x + 1, z), 'global')
      this.markDirty(new ChunkCoordinate(x - 1, z), 'global')
      this.markDirty(new ChunkCoordinate(x, z + 1), 'global')
      this.markDirty(new ChunkCoordinate(x, z - 1), 'global')
    })
  }

  buildMesh(coord: ChunkCoordinate): void {
    // Collect Neighbor Light Data (Light is now inside ChunkData)
    // We only need to check if the center chunk data is available to proceed
    const centerChunk = this.voxels.getChunk(coord)
    if (!centerChunk) {
        // console.warn(`MeshingService: Center chunk data not available for (${coord.x}, ${coord.z})`)
        return
    }

    // Collect Neighbor Voxel Data (which now includes Light Data)
    const neighborVoxels: Record<string, ArrayBuffer> = {}
    const offsets = ['0,0', '1,0', '-1,0', '0,1', '0,-1']
    
    for (const key of offsets) {
        const [dx, dz] = key.split(',').map(Number)
        const c = new ChunkCoordinate(coord.x + dx, coord.z + dz)
        const chunk = this.voxels.getChunk(c)
        if (chunk) { // Chunk can be null if not loaded
            neighborVoxels[key] = chunk.getRawBuffer()
        }
    }

    // Send to worker
    const request: WorkerMessage = {
        type: 'GEN_MESH',
        x: coord.x,
        z: coord.z,
        neighborVoxels,
        neighborLight: {} // Empty as it's now in neighborVoxels
    }
    this.worker.postMessage(request) // Browser will copy buffers, preventing DataCloneError
  }

  markDirty(coord: ChunkCoordinate, reason: 'block' | 'light' | 'global'): void {
    const key = coord.toKey()
    const current = this.dirtyQueue.get(key)

    // Priority: block > light > global
    if (current === 'block') return

    this.dirtyQueue.set(key, reason)
  }

  processDirtyQueue(): void {
    if (this.dirtyQueue.size === 0) return

    // Throttle requests? 
    // Worker is async, so we can flood it, but maybe limit active jobs?
    // For now, just process all.
    
    const entries = Array.from(this.dirtyQueue.entries())

    for (const [key, reason] of entries) {
      const coord = ChunkCoordinate.fromKey(key)
      this.buildMesh(coord)
      this.dirtyQueue.delete(key)
    }
  }
}
