// src/modules/rendering/meshing-application/MeshingService.ts
import * as THREE from 'three'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ILightingQuery } from '../../world/lighting-ports/ILightingQuery'
import { EventBus } from '../../game/infrastructure/EventBus'
import { ChunkMesher } from './ChunkMesher'
import { VertexBuilder } from './VertexBuilder'
import { WorldService } from '../../world/application/WorldService'
import { ILightStorage } from '../../world/lighting-ports/ILightStorage'

export class MeshingService {
  private dirtyQueue = new Map<string, 'block' | 'light' | 'global'>()
  private rebuildBudgetMs = 3

  constructor(
    private worldService: WorldService, // Need WorldService for async meshing
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery & ILightStorage, // Need storage access to get raw buffers
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for lighting ready
    this.eventBus.on('lighting', 'LightingCalculatedEvent', (e: any) => {
      this.markDirty(e.chunkCoord, 'global')
    })
    
    // Listen for worker completion
    this.eventBus.on('meshing', 'MeshingWorkerCompleteEvent', (e: any) => {
        const { chunkCoord, geometry } = e
        const coord = new ChunkCoordinate(chunkCoord.x, chunkCoord.z)
        
        const geometryMap = new Map<string, THREE.BufferGeometry>()
        
        for (const [key, buffers] of Object.entries(geometry as Record<string, any>)) {
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3))
            geo.setAttribute('color', new THREE.Float32BufferAttribute(buffers.colors, 3))
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2))
            geo.setIndex(new THREE.Uint16BufferAttribute(buffers.indices, 1))
            geo.computeVertexNormals() // Recompute normals or pass them? Naive mesher has simple normals.
            // Actually, we didn't pass normals from worker, but computeVertexNormals works fine for flat shading.
            // Or we can construct them if we want precise control.
            geometryMap.set(key, geo)
        }
        
        this.eventBus.emit('meshing', {
            type: 'ChunkMeshBuiltEvent',
            timestamp: Date.now(),
            chunkCoord: coord,
            geometryMap
        })
        
        console.log(`🔨 Mesh received from worker for (${coord.x}, ${coord.z})`)
    })
  }

  buildMesh(coord: ChunkCoordinate): void {
    // Collect Neighbor Light Data
    const neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }> = {}
    const offsets = ['0,0', '1,0', '-1,0', '0,1', '0,-1']
    
    for (const key of offsets) {
        const [dx, dz] = key.split(',').map(Number)
        const c = new ChunkCoordinate(coord.x + dx, coord.z + dz)
        const lightData = this.lighting.getLightData(c)
        if (lightData) {
            // Need packed buffers or separate?
            // Types expect { sky: ArrayBuffer, block: ArrayBuffer }
            // But getSkyBuffers returns {r,g,b}.
            // We need to pack them to match what Worker expects in CALC_LIGHT response format?
            // Actually, in GEN_MESH handler in worker, we unpack using the same "slice" logic
            // as we used in CALC_LIGHT response packing.
            // So we must pack them identically here.
            
            // This duplication of packing logic is risky. 
            // Ideally LightData should have .getPackedBuffers().
            // For now, I'll inline pack them here.
            
            const size = 24 * 256 * 24
            const sky = lightData.getSkyBuffers()
            const block = lightData.getBlockBuffers()
            
            const skyBuffer = new Uint8Array(size * 3)
            skyBuffer.set(new Uint8Array(sky.r), 0)
            skyBuffer.set(new Uint8Array(sky.g), size)
            skyBuffer.set(new Uint8Array(sky.b), size * 2)

            const blockBuffer = new Uint8Array(size * 3)
            blockBuffer.set(new Uint8Array(block.r), 0)
            blockBuffer.set(new Uint8Array(block.g), size)
            blockBuffer.set(new Uint8Array(block.b), size * 2)
            
            neighborLight[key] = {
                sky: skyBuffer.buffer,
                block: blockBuffer.buffer
            }
        }
    }
    
    // Check if Center Light exists (it must)
    if (!neighborLight['0,0']) {
         console.warn(`⚠️ Attempted to build mesh before lighting ready: (${coord.x}, ${coord.z})`)
         return
    }

    this.worldService.buildMeshAsync(coord, neighborLight)
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
