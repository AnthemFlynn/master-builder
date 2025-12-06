// src/modules/rendering/application/RenderingService.ts
import * as THREE from 'three'
import { EventBus } from '../../terrain/application/EventBus'
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
    this.chunkRenderer = new ChunkRenderer(
      scene,
      this.materialSystem.getChunkMaterial(),
      eventBus
    )
  }

  // Public API is minimal - rendering is event-driven
  // ChunkRenderer listens to ChunkMeshBuiltEvent automatically
}
