// src/modules/rendering/application/ChunkRenderer.ts
import * as THREE from 'three'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { EventBus } from '../../terrain/application/EventBus'

export class ChunkRenderer {
  private meshes = new Map<string, THREE.Mesh>()

  constructor(
    private scene: THREE.Scene,
    private material: THREE.Material,
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for mesh built
    console.log('🎨 ChunkRenderer: Registering listener for ChunkMeshBuiltEvent')
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e: any) => {
      console.log('🎨 ChunkRenderer: Received ChunkMeshBuiltEvent for', e.chunkCoord)
      this.updateMesh(e.chunkCoord, e.geometry)
    })
  }

  private updateMesh(coord: ChunkCoordinate, geometry: THREE.BufferGeometry): void {
    const key = coord.toKey()
    console.log(`🎨 ChunkRenderer: updateMesh called for (${coord.x}, ${coord.z})`)

    // Remove old mesh
    const oldMesh = this.meshes.get(key)
    if (oldMesh) {
      this.scene.remove(oldMesh)
      oldMesh.geometry.dispose()
    }

    // Create new mesh
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.position.set(coord.x * 24, 0, coord.z * 24)
    mesh.castShadow = true
    mesh.receiveShadow = true

    this.scene.add(mesh)
    this.meshes.set(key, mesh)
    console.log(`✅ ChunkRenderer: Mesh added to scene at (${coord.x * 24}, 0, ${coord.z * 24}), total meshes: ${this.meshes.size}`)
  }

  getMesh(coord: ChunkCoordinate): THREE.Mesh | null {
    return this.meshes.get(coord.toKey()) || null
  }

  disposeAll(): void {
    for (const mesh of this.meshes.values()) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
    }
    this.meshes.clear()
  }
}
