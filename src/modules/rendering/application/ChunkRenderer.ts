import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { MaterialSystem } from './MaterialSystem'

// Two-VBO approach: separate opaque and transparent mesh groups per chunk
interface ChunkMeshes {
  opaque: THREE.Group
  transparent: THREE.Group
}

export class ChunkRenderer {
  private meshes = new Map<string, ChunkMeshes>()

  constructor(
    private scene: THREE.Scene,
    private materialSystem: MaterialSystem,
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e: any) => {
      this.updateMesh(e.chunkCoord, e.opaqueGeometryMap, e.transparentGeometryMap)
    })

    this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
      this.disposeChunk(e.chunkCoord)
    })

    this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
      this.disposeChunk(e.chunkCoord)
    })
  }

  private updateMesh(
    coord: ChunkCoordinate,
    opaqueGeometryMap: Map<string, THREE.BufferGeometry>,
    transparentGeometryMap: Map<string, THREE.BufferGeometry>
  ): void {
    const key = coord.toKey()
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Debug: log mesh creation
    const opaqueCount = opaqueGeometryMap.size
    const transparentCount = transparentGeometryMap.size
    if (opaqueCount === 0 && transparentCount === 0) {
      console.warn(`⚠️ Empty mesh for chunk ${key} - no geometry!`)
    }

    // Dispose old meshes
    const old = this.meshes.get(key)
    if (old) {
      this.disposeGroup(old.opaque)
      this.disposeGroup(old.transparent)
    }

    // Create OPAQUE group (renderOrder = 0, renders first)
    const opaqueGroup = new THREE.Group()
    opaqueGroup.renderOrder = 0
    opaqueGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getOpaqueMaterial(materialKey)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      opaqueGroup.add(mesh)
    })
    opaqueGroup.position.set(worldX, 0, worldZ)
    this.scene.add(opaqueGroup)

    // Create TRANSPARENT group (renderOrder = 1, renders after opaque)
    const transparentGroup = new THREE.Group()
    transparentGroup.renderOrder = 1
    transparentGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getTransparentMaterial(materialKey)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.renderOrder = 1
      // Transparent meshes typically don't cast shadows
      mesh.castShadow = false
      mesh.receiveShadow = true
      transparentGroup.add(mesh)
    })
    transparentGroup.position.set(worldX, 0, worldZ)
    this.scene.add(transparentGroup)

    this.meshes.set(key, { opaque: opaqueGroup, transparent: transparentGroup })
  }

  private disposeGroup(group: THREE.Group): void {
    group.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
      }
    })
    this.scene.remove(group)
  }

  disposeChunk(coord: ChunkCoordinate): void {
    const key = coord.toKey()
    const chunkMeshes = this.meshes.get(key)

    if (chunkMeshes) {
      this.disposeGroup(chunkMeshes.opaque)
      this.disposeGroup(chunkMeshes.transparent)
      this.meshes.delete(key)
    }
  }

  disposeChunk(coord: ChunkCoordinate): void {
    const key = coord.toKey()
    const group = this.meshes.get(key)

    if (group) {
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
        }
      })
      this.scene.remove(group)
      this.meshes.delete(key)
    }
  }

  disposeAll(): void {
    for (const chunkMeshes of this.meshes.values()) {
      this.disposeGroup(chunkMeshes.opaque)
      this.disposeGroup(chunkMeshes.transparent)
    }
    this.meshes.clear()
  }
}
