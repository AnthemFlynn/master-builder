// src/modules/rendering/meshing-application/MeshingService.ts
import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../../shared/ports/ILightingQuery'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ILightStorage } from '../../../shared/ports/ILightStorage'
import { WorkerMessage, MainMessage } from '../workers/types'
import { MeshingWorkerPool } from '../infrastructure/MeshingWorkerPool'

export class MeshingService {
  private dirtyQueue = new Map<string, 'block' | 'light' | 'global'>()
  private rebuildBudgetMs = 3
  private meshingWorkerPool: MeshingWorkerPool
  // Backpressure: track in-flight mesh builds to prevent overwhelming GPU
  private inFlightMeshes = new Set<string>()
  private maxConcurrentMeshes = 4  // Limit concurrent builds (can be boosted for startup)

  // Startup boost: allow more concurrent builds during initial load
  private boostMode = true
  private readonly BOOST_CONCURRENT = 12  // Higher concurrency during startup
  private readonly NORMAL_CONCURRENT = 4  // Normal concurrency after startup

  constructor(
    private voxels: IVoxelQuery & { getChunk: any }, // Need getChunk for buffers
    private lighting: ILightingQuery & ILightStorage, // Need storage access to get raw buffers
    private eventBus: EventBus
  ) {
    this.meshingWorkerPool = new MeshingWorkerPool(6)
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for lighting ready
    this.eventBus.on('lighting', 'LightingCalculatedEvent', (e: any) => {
      this.markDirty(e.chunkCoord, 'global')

      // Also mark neighbors dirty because their border faces need matching lighting
      // values at chunk boundaries for seamless rendering.
      const { x, z } = e.chunkCoord
      this.markDirty(new ChunkCoordinate(x + 1, z), 'global')
      this.markDirty(new ChunkCoordinate(x - 1, z), 'global')
      this.markDirty(new ChunkCoordinate(x, z + 1), 'global')
      this.markDirty(new ChunkCoordinate(x, z - 1), 'global')
    })

    // Listen for chunk unloads to clean up dirty queue
    this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
      const key = e.chunkCoord.toKey()
      this.dirtyQueue.delete(key)
    })
  }

  async buildMesh(coord: ChunkCoordinate): Promise<void> {
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

    // Send to worker pool
    const result = await this.meshingWorkerPool.generateMesh(
      coord,
      neighborVoxels,
      {} // neighborLight is empty as it's now in neighborVoxels
    )

    const { x, z, opaqueGeometry, transparentGeometry } = result
    const resultCoord = new ChunkCoordinate(x, z)

    // Helper to convert buffer records to BufferGeometry maps
    const createGeometryMap = (geometryRecord: Record<string, any>) => {
      const map = new Map<string, THREE.BufferGeometry>()
      for (const [key, buffers] of Object.entries(geometryRecord)) {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3))
        geo.setAttribute('color', new THREE.Float32BufferAttribute(buffers.colors, 3))
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2))
        geo.setIndex(new THREE.Uint16BufferAttribute(buffers.indices, 1))
        geo.computeVertexNormals()
        map.set(key, geo)
      }
      return map
    }

    const opaqueGeometryMap = createGeometryMap(opaqueGeometry)
    const transparentGeometryMap = createGeometryMap(transparentGeometry)

    this.eventBus.emit('meshing', {
        type: 'ChunkMeshBuiltEvent',
        timestamp: Date.now(),
        chunkCoord: resultCoord,
        opaqueGeometryMap,
        transparentGeometryMap
    })
  }

  markDirty(coord: ChunkCoordinate, reason: 'block' | 'light' | 'global'): void {
    const key = coord.toKey()
    const current = this.dirtyQueue.get(key)

    // Priority: block > light > global
    if (current === 'block') return

    this.dirtyQueue.set(key, reason)
  }

  processDirtyQueue(budgetOverrideMs?: number): { budgetUsedMs: number; chunksProcessed: number } {
    const startTime = performance.now()
    let chunksProcessed = 0

    // During boost mode: higher budget (10ms) and more concurrent builds
    const effectiveBudgetMs = budgetOverrideMs ?? (this.boostMode ? 10 : this.rebuildBudgetMs)
    const effectiveMaxConcurrent = this.boostMode ? this.BOOST_CONCURRENT : this.maxConcurrentMeshes

    if (this.dirtyQueue.size === 0) {
      // Auto-disable boost when queue is empty (initial load complete)
      if (this.boostMode && this.inFlightMeshes.size === 0) {
        this.disableBoostMode()
      }
      return { budgetUsedMs: 0, chunksProcessed: 0 }
    }

    // Backpressure: don't start new builds if we're at capacity
    if (this.inFlightMeshes.size >= effectiveMaxConcurrent) {
      return { budgetUsedMs: 0, chunksProcessed: 0 }
    }

    const entries = Array.from(this.dirtyQueue.entries())

    for (const [key, reason] of entries) {
      const elapsed = performance.now() - startTime

      // Enforce budget (higher during boost mode)
      if (elapsed >= effectiveBudgetMs) {
        break
      }

      // Backpressure: stop if we've hit max concurrent builds
      if (this.inFlightMeshes.size >= effectiveMaxConcurrent) {
        break
      }

      // Skip if this chunk is already being built
      if (this.inFlightMeshes.has(key)) {
        continue
      }

      const coord = ChunkCoordinate.fromKey(key)

      // Track in-flight mesh
      this.inFlightMeshes.add(key)

      this.buildMesh(coord)
        .catch((error) => {
          console.error(`[MeshingService] Failed to build mesh for chunk (${coord.x}, ${coord.z}):`, error)
          // Re-queue chunk for retry
          this.markDirty(coord, reason)
        })
        .finally(() => {
          // Remove from in-flight when done (success or failure)
          this.inFlightMeshes.delete(key)
        })

      this.dirtyQueue.delete(key)
      chunksProcessed++
    }

    // Return budget usage for monitoring
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

  /**
   * Disable startup boost mode (call after initial chunks are rendered)
   */
  disableBoostMode(): void {
    if (this.boostMode) {
      this.boostMode = false
      this.maxConcurrentMeshes = this.NORMAL_CONCURRENT
      console.log('🚀 Startup boost disabled, switching to normal meshing rate')
    }
  }

  /**
   * Check if boost mode is active
   */
  isBoostMode(): boolean {
    return this.boostMode
  }
}
