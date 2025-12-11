import * as THREE from 'three'
import { ChunkCoordinate } from '../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../game/infrastructure/EventBus'
import { MaterialSystem } from './MaterialSystem'

export class ChunkRenderer {
  private meshes = new Map<string, THREE.Group>()

  constructor(
    private scene: THREE.Scene,
    private materialSystem: MaterialSystem,
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e: any) => {
      this.updateMesh(e.chunkCoord, e.geometryMap)
    })
  }

  private updateMesh(coord: ChunkCoordinate, geometryMap: Map<string, THREE.BufferGeometry>): void {
    const key = coord.toKey()

    const oldGroup = this.meshes.get(key)
    if (oldGroup) {
      oldGroup.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
        }
      })
      this.scene.remove(oldGroup)
    }

    const group = new THREE.Group()
    geometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getMaterial(materialKey)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    })

    group.position.set(coord.x * 24, 0, coord.z * 24)
    this.scene.add(group)
    this.meshes.set(key, group)
  }

  disposeAll(): void {
    for (const group of this.meshes.values()) {
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
        }
      })
      this.scene.remove(group)
    }
    this.meshes.clear()
  }
}
