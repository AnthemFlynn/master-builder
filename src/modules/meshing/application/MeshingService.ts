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

export class MeshingService {
  private dirtyQueue = new Map<string, 'block' | 'light' | 'global'>()
  private rebuildBudgetMs = 3
  private meshingWorkerPool: MeshingWorkerPool
  private inFlightMeshes = new Set<string>()
  private maxConcurrentMeshes = 4

  // Startup boost
  private boostMode = true
  private readonly BOOST_CONCURRENT = 12
  private readonly NORMAL_CONCURRENT = 4

  constructor(
    private voxels: IVoxelQuery & { getChunk: any },
    private lighting: ILightingQuery & ILightStorage,
    private eventBus: EventBus
  ) {
    this.meshingWorkerPool = new MeshingWorkerPool(6)
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

  async buildMesh(coord: ChunkCoordinate): Promise<void> {
    const centerChunk = this.voxels.getChunk(coord)
    if (!centerChunk) return

    // Collect neighbor voxel data
    const neighborVoxels: Record<string, ArrayBuffer> = {}
    const offsets = ['0,0', '1,0', '-1,0', '0,1', '0,-1']

    for (const key of offsets) {
      const [dx, dz] = key.split(',').map(Number)
      const c = new ChunkCoordinate(coord.x + dx, coord.z + dz)
      const chunk = this.voxels.getChunk(c)
      if (chunk) {
        neighborVoxels[key] = chunk.getRawBuffer()
      }
    }

    // Send to worker pool
    const result = await this.meshingWorkerPool.generateMesh(
      coord,
      neighborVoxels,
      {}
    )

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

        // Create Uint32Array views from ArrayBuffers
        const packedVertices = new Uint32Array(buffers.packedVertices)
        const indices = new Uint32Array(buffers.indices)

        const vertexCount = packedVertices.length / PACKED_VERTEX_UINT32S

        // Extract the 3 packed uint32s into separate attributes
        // Each vertex has: [posNormal, uvTex, color] = 3 uint32s
        const posNormalData = new Uint32Array(vertexCount)
        const uvTexData = new Uint32Array(vertexCount)
        const colorData = new Uint32Array(vertexCount)

        for (let i = 0; i < vertexCount; i++) {
          posNormalData[i] = packedVertices[i * 3 + 0]
          uvTexData[i] = packedVertices[i * 3 + 1]
          colorData[i] = packedVertices[i * 3 + 2]
        }

        // Set packed attributes (GLSL3 uint)
        geo.setAttribute('aPackedPosNormal', new THREE.Uint32BufferAttribute(posNormalData, 1))
        geo.setAttribute('aPackedUVTex', new THREE.Uint32BufferAttribute(uvTexData, 1))
        geo.setAttribute('aPackedColor', new THREE.Uint32BufferAttribute(colorData, 1))

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

    const effectiveBudgetMs = budgetOverrideMs ?? (this.boostMode ? 10 : this.rebuildBudgetMs)
    const effectiveMaxConcurrent = this.boostMode ? this.BOOST_CONCURRENT : this.maxConcurrentMeshes

    if (this.dirtyQueue.size === 0) {
      if (this.boostMode && this.inFlightMeshes.size === 0) {
        this.disableBoostMode()
      }
      return { budgetUsedMs: 0, chunksProcessed: 0 }
    }

    if (this.inFlightMeshes.size >= effectiveMaxConcurrent) {
      return { budgetUsedMs: 0, chunksProcessed: 0 }
    }

    const entries = Array.from(this.dirtyQueue.entries())

    for (const [key, reason] of entries) {
      const elapsed = performance.now() - startTime

      if (elapsed >= effectiveBudgetMs) break
      if (this.inFlightMeshes.size >= effectiveMaxConcurrent) break
      if (this.inFlightMeshes.has(key)) continue

      const coord = ChunkCoordinate.fromKey(key)
      this.inFlightMeshes.add(key)

      this.buildMesh(coord)
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

  disableBoostMode(): void {
    if (this.boostMode) {
      this.boostMode = false
      this.maxConcurrentMeshes = this.NORMAL_CONCURRENT
      console.log('🚀 Startup boost disabled, switching to normal meshing rate')
    }
  }

  isBoostMode(): boolean {
    return this.boostMode
  }
}
