// src/modules/rendering/application/RenderingService.ts
import * as THREE from 'three'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ChunkRenderer } from './ChunkRenderer'
import { MaterialSystem } from './MaterialSystem'

export class RenderingService {
  private chunkRenderer: ChunkRenderer
  private materialSystem: MaterialSystem

  constructor(
    private scene: THREE.Scene,
    private eventBus: EventBus
  ) {
    this.materialSystem = new MaterialSystem()
    this.chunkRenderer = new ChunkRenderer(scene, this.materialSystem, eventBus)
  }

  // Public API is minimal - rendering is event-driven
  // ChunkRenderer listens to ChunkMeshBuiltEvent automatically

  getLODDistribution(chunkLODLevels: Map<string, 0 | 1 | 2 | 3>): Record<string, number> {
    const distribution: Record<string, number> = {
      level0: 0,
      level1: 0,
      level2: 0,
      level3: 0
    }

    // Count chunks by LOD level from the provided map
    for (const [key, lodLevel] of chunkLODLevels) {
      const levelKey = `level${lodLevel}`
      distribution[levelKey]++
    }

    return distribution
  }

  getLoadedChunks(): Map<string, THREE.Group> {
    return this.chunkRenderer.getLoadedChunks()
  }
}
