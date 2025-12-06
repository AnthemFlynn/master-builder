// src/modules/rendering/meshing-application/MeshingService.ts
import * as THREE from 'three'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ILightingQuery } from '../../world/lighting-ports/ILightingQuery'
import { EventBus } from '../../game/infrastructure/EventBus'
import { GreedyMesher } from './GreedyMesher'
import { VertexBuilder } from './VertexBuilder'

export class MeshingService {
  private dirtyQueue = new Map<string, 'block' | 'light' | 'global'>()
  private rebuildBudgetMs = 3

  constructor(
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery,
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for lighting ready
    this.eventBus.on('lighting', 'LightingCalculatedEvent', (e: any) => {
      this.buildMesh(e.chunkCoord)
    })

    // Listen for lighting changes (rebuilds)
    this.eventBus.on('lighting', 'LightingInvalidatedEvent', (e: any) => {
      this.markDirty(e.chunkCoord, 'light')
    })
  }

  buildMesh(coord: ChunkCoordinate): void {
    // Check if lighting is ready
    if (!this.lighting.isLightingReady(coord)) {
      console.warn(`⚠️ Attempted to build mesh before lighting ready: (${coord.x}, ${coord.z})`)
      return
    }

    const startTime = performance.now()

    // Build geometry with chunk coordinates for world offset
    const vertexBuilder = new VertexBuilder(this.voxels, this.lighting, coord.x, coord.z)
    const mesher = new GreedyMesher(this.voxels, this.lighting, coord)

    mesher.buildMesh(vertexBuilder)
    const geometry = vertexBuilder.buildGeometry()

    const duration = performance.now() - startTime

    // Emit event with geometry
    this.eventBus.emit('meshing', {
      type: 'ChunkMeshBuiltEvent',
      timestamp: Date.now(),
      chunkCoord: coord,
      geometry: geometry
    })

    console.log(`🔨 Built mesh for chunk (${coord.x}, ${coord.z}) in ${duration.toFixed(2)}ms`)
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

    const startTime = performance.now()
    const entries = Array.from(this.dirtyQueue.entries())

    // Sort by priority
    const priority = { block: 0, light: 1, global: 2 }
    entries.sort((a, b) => priority[a[1]] - priority[b[1]])

    let rebuilt = 0

    for (const [key, reason] of entries) {
      if (performance.now() - startTime > this.rebuildBudgetMs) {
        break
      }

      const coord = ChunkCoordinate.fromKey(key)
      this.buildMesh(coord)
      this.dirtyQueue.delete(key)
      rebuilt++
    }

    if (rebuilt > 0) {
      console.log(`🔨 Rebuilt ${rebuilt} dirty chunks (${this.dirtyQueue.size} remaining)`)
    }
  }
}
