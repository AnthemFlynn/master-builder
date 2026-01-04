// src/modules/meshing/application/MeshingService.ts
/**
 * MeshingService - Coordinates chunk mesh generation
 *
 * Uses SOTA packed vertex format (12 bytes per vertex, 4× reduction).
 * Creates BufferGeometry with packed uint32 attributes.
 */
import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../../shared/ports/ILightingQuery'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ILightStorage } from '../../../shared/ports/ILightStorage'
import { MainMessage, PackedGeometryBuffers, PACKED_VERTEX_UINT32S } from '../workers/types'
import { MeshingWorkerPool } from '../infrastructure/MeshingWorkerPool'
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../../../shared/constants/ChunkConstants'
import { textureArrayLoader } from '../../rendering/application/TextureArrayLoader'

export class MeshingService {
  private dirtyQueue = new Map<string, 'block' | 'light' | 'global'>()
  private rebuildBudgetMs = 5
  private meshingWorkerPool: MeshingWorkerPool
  private inFlightMeshes = new Set<string>()
  private maxConcurrentMeshes = 4

  // LOD level tracking per chunk
  private chunkLODLevels = new Map<string, 0 | 1 | 2 | 3>()

  constructor(
    private voxels: IVoxelQuery & { getChunk: any },
    private lighting: ILightingQuery & ILightStorage,
    private eventBus: EventBus
  ) {
    this.meshingWorkerPool = new MeshingWorkerPool(4)
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventBus.on('lighting', 'LightingCalculatedEvent', (e: any) => {
      this.markDirty(e.chunkCoord, 'global')

      const { x, z } = e.chunkCoord
      this.markDirty(new ChunkCoordinate(x + 1, z), 'global')
      this.markDirty(new ChunkCoordinate(x - 1, z), 'global')
      this.markDirty(new ChunkCoordinate(x, z + 1), 'global')
      this.markDirty(new ChunkCoordinate(x, z - 1), 'global')
    })

    this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
      const key = e.chunkCoord.toKey()
      this.dirtyQueue.delete(key)
    })
  }

  async buildMesh(coord: ChunkCoordinate, lodLevel: 0 | 1 | 2 | 3 = 0): Promise<void> {
    const centerChunk = this.voxels.getChunk(coord)
    if (!centerChunk) return

    // Collect neighbor voxel data using compact native format
    // serializeNative() only includes non-empty sections (much smaller than full 400KB buffer)
    const neighborVoxels: Record<string, ArrayBuffer> = {}
    const transferList: ArrayBuffer[] = []
    const offsets = ['0,0', '1,0', '-1,0', '0,1', '0,-1']

    for (const key of offsets) {
      const [dx, dz] = key.split(',').map(Number)
      const c = new ChunkCoordinate(coord.x + dx, coord.z + dz)
      const chunk = this.voxels.getChunk(c)
      if (chunk) {
        // Use serializeNative() for compact format (only non-empty sections)
        const buffer = chunk.serializeNative()
        neighborVoxels[key] = buffer
        transferList.push(buffer)
      }
    }

    // Get texture layer map for worker
    const textureLayerMap = textureArrayLoader.getLayerMapAsObject()

    // Send to worker pool with LOD level and transfer list for zero-copy
    const result = await this.meshingWorkerPool.generateMesh(
      coord,
      neighborVoxels,
      {},
      textureLayerMap,
      lodLevel,
      0,  // priority
      { useNativeFormat: true, transferList }
    )

    // Track LOD level for this chunk
    this.chunkLODLevels.set(coord.toKey(), lodLevel)

    const { x, z, opaquePackedGeometry, transparentPackedGeometry, nonEmptySections, vegetationInstances, vegetationCount } = result
    const resultCoord = new ChunkCoordinate(x, z)

    // Calculate chunk world offset for shader
    const chunkOffset = new THREE.Vector3(
      coord.x * CHUNK_WIDTH,
      0,
      coord.z * CHUNK_DEPTH
    )

    // Create BufferGeometry from packed data
    const createPackedGeometryMap = (geometryRecord: Record<string, PackedGeometryBuffers>) => {
      const map = new Map<string, THREE.BufferGeometry>()

      for (const [key, buffers] of Object.entries(geometryRecord)) {
        const geo = new THREE.BufferGeometry()

        // Use InterleavedBuffer to avoid redundant copies of packed data
        const packedVertices = new Uint32Array(buffers.packedVertices)
        const indices = new Uint32Array(buffers.indices)

        const interleavedBuffer = new THREE.InterleavedBuffer(packedVertices, 3)
        
        // Set packed attributes directly from the interleaved buffer
        geo.setAttribute('aPackedPosNormal', new THREE.InterleavedBufferAttribute(interleavedBuffer, 1, 0))
        geo.setAttribute('aPackedUVTex', new THREE.InterleavedBufferAttribute(interleavedBuffer, 1, 1))
        geo.setAttribute('aPackedColor', new THREE.InterleavedBufferAttribute(interleavedBuffer, 1, 2))

        // Set indices
        geo.setIndex(new THREE.Uint32BufferAttribute(indices, 1))

        // Store chunk offset in geometry userData for material setup
        geo.userData.chunkOffset = chunkOffset.clone()

        map.set(key, geo)
      }

      return map
    }

    const opaqueGeometryMap = createPackedGeometryMap(opaquePackedGeometry)
    const transparentGeometryMap = createPackedGeometryMap(transparentPackedGeometry)

    // Emit mesh built event
    this.eventBus.emit('meshing', {
      type: 'ChunkMeshBuiltEvent',
      timestamp: Date.now(),
      chunkCoord: resultCoord,
      opaqueGeometryMap,
      transparentGeometryMap,
      chunkOffset,
      // Non-empty sections for per-section frustum culling
      nonEmptySections: nonEmptySections || [],
      // Vegetation data for InstancedMesh
      vegetationInstances: vegetationInstances ? new Float32Array(vegetationInstances) : null,
      vegetationCount: vegetationCount || 0,
      // Flag to indicate packed format
      isPacked: true
    })
  }

  markDirty(coord: ChunkCoordinate, reason: 'block' | 'light' | 'global'): void {
    const key = coord.toKey()
    const current = this.dirtyQueue.get(key)

    if (current === 'block') return
    this.dirtyQueue.set(key, reason)
  }

  processDirtyQueue(budgetOverrideMs?: number): { budgetUsedMs: number; chunksProcessed: number } {
    const startTime = performance.now()
    let chunksProcessed = 0

    const effectiveBudgetMs = budgetOverrideMs ?? this.rebuildBudgetMs

    if (this.dirtyQueue.size === 0) {
      return { budgetUsedMs: 0, chunksProcessed: 0 }
    }

    if (this.inFlightMeshes.size >= this.maxConcurrentMeshes) {
      return { budgetUsedMs: 0, chunksProcessed: 0 }
    }

    const entries = Array.from(this.dirtyQueue.entries())

    for (const [key, reason] of entries) {
      const elapsed = performance.now() - startTime

      if (elapsed >= effectiveBudgetMs) break
      if (this.inFlightMeshes.size >= this.maxConcurrentMeshes) break
      if (this.inFlightMeshes.has(key)) continue

      const coord = ChunkCoordinate.fromKey(key)
      this.inFlightMeshes.add(key)

      // Use stored LOD level or default to 0 (full detail)
      const lodLevel = this.chunkLODLevels.get(key) ?? 0

      this.buildMesh(coord, lodLevel)
        .catch((error) => {
          console.error(`[MeshingService] Failed to build mesh for chunk (${coord.x}, ${coord.z}):`, error)
          this.markDirty(coord, reason)
        })
        .finally(() => {
          this.inFlightMeshes.delete(key)
        })

      this.dirtyQueue.delete(key)
      chunksProcessed++
    }

    return {
      budgetUsedMs: performance.now() - startTime,
      chunksProcessed
    }
  }

  getQueueDepth(): number {
    return this.dirtyQueue.size
  }

  getWorkerUtilization(): { busy: number; total: number } {
    return this.meshingWorkerPool.getUtilization()
  }

  // LOD Management
  setChunkLODLevel(coord: ChunkCoordinate, level: 0 | 1 | 2 | 3): void {
    const key = coord.toKey()
    const currentLevel = this.chunkLODLevels.get(key)

    if (currentLevel !== level) {
      this.chunkLODLevels.set(key, level)
      // Mark dirty to rebuild at new LOD level
      this.markDirty(coord, 'global')
    }
  }

  getChunkLODLevel(coord: ChunkCoordinate): 0 | 1 | 2 | 3 | undefined {
    return this.chunkLODLevels.get(coord.toKey())
  }

  getChunkLODLevels(): Map<string, 0 | 1 | 2 | 3> {
    return this.chunkLODLevels
  }

  clearChunkLODLevel(coord: ChunkCoordinate): void {
    this.chunkLODLevels.delete(coord.toKey())
  }
}
