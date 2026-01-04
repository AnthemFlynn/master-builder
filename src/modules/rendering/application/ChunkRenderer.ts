// src/modules/rendering/application/ChunkRenderer.ts
/**
 * ChunkRenderer - Renders chunk meshes with SOTA packed vertex format
 *
 * Uses packed 12-byte vertices unpacked in shader for 4× memory reduction.
 * Supports both packed (new) and legacy formats for backwards compatibility.
 */
import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { MaterialSystem } from './MaterialSystem'
import { CHUNK_WIDTH, CHUNK_DEPTH, SECTION_HEIGHT } from '../../../shared/constants/ChunkConstants'

// Two-VBO approach: separate opaque and transparent mesh groups per chunk
interface ChunkMeshes {
  opaque: THREE.Group
  transparent: THREE.Group
}

export class ChunkRenderer {
  private meshes = new Map<string, ChunkMeshes>()
  
  // Object pools to reduce instantiation churn
  private meshPool: THREE.Mesh[] = []
  private groupPool: THREE.Group[] = []

  constructor(
    private scene: THREE.Scene,
    private materialSystem: MaterialSystem,
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e: any) => {
      if (e.isPacked) {
        // New packed format
        this.updatePackedMesh(
          e.chunkCoord,
          e.opaqueGeometryMap,
          e.transparentGeometryMap,
          e.chunkOffset
        )
      } else {
        // Legacy format (backwards compatibility)
        this.updateMesh(e.chunkCoord, e.opaqueGeometryMap, e.transparentGeometryMap)
      }
    })

    this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
      this.disposeChunk(e.chunkCoord)
    })
  }

  /**
   * Get a group from the pool or create a new one
   */
  private getGroup(): THREE.Group {
    if (this.groupPool.length > 0) {
      const group = this.groupPool.pop()!
      group.visible = true
      group.position.set(0, 0, 0)
      group.rotation.set(0, 0, 0)
      group.scale.set(1, 1, 1)
      group.renderOrder = 0
      group.clear() // Ensure no children
      return group
    }
    return new THREE.Group()
  }

  /**
   * Release a group back to the pool
   */
  private releaseGroup(group: THREE.Group): void {
    // Release all children meshes
    for (let i = group.children.length - 1; i >= 0; i--) {
      const child = group.children[i]
      if (child instanceof THREE.Mesh) {
        this.releaseMesh(child)
      }
    }
    group.clear()
    this.scene.remove(group)
    this.groupPool.push(group)
  }

  /**
   * Get a mesh from the pool or create a new one
   */
  private getMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    if (this.meshPool.length > 0) {
      const mesh = this.meshPool.pop()!
      mesh.geometry = geometry
      mesh.material = material
      mesh.visible = true
      mesh.position.set(0, 0, 0)
      mesh.rotation.set(0, 0, 0)
      mesh.scale.set(1, 1, 1)
      mesh.castShadow = false
      mesh.receiveShadow = false
      mesh.frustumCulled = true
      mesh.renderOrder = 0
      mesh.userData = {}
      return mesh
    }
    return new THREE.Mesh(geometry, material)
  }

  /**
   * Release a mesh back to the pool
   */
  private releaseMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }
    
    // Dispose material if it's not shared (rare case in this engine, but good for safety)
    if (mesh.material instanceof THREE.Material) {
      if (!mesh.material.userData?.shared) {
        mesh.material.dispose()
      }
    }

    // Clear references
    mesh.geometry = undefined as any
    mesh.material = undefined as any
    
    this.meshPool.push(mesh)
  }

  /**
   * Update mesh using packed vertex format (SOTA 12-byte vertices)
   */
  private updatePackedMesh(
    coord: ChunkCoordinate,
    opaqueGeometryMap: Map<string, THREE.BufferGeometry>,
    transparentGeometryMap: Map<string, THREE.BufferGeometry>,
    chunkOffset: THREE.Vector3
  ): void {
    const key = coord.toKey()
    const worldX = coord.x * CHUNK_WIDTH
    const worldZ = coord.z * CHUNK_DEPTH

    // Dispose old meshes
    const old = this.meshes.get(key)
    if (old) {
      this.releaseGroup(old.opaque)
      this.releaseGroup(old.transparent)
    }

    // Create OPAQUE group with packed materials
    // Each mesh has a section-specific bounding box for frustum culling
    const opaqueGroup = this.getGroup()
    opaqueGroup.renderOrder = 0
    opaqueGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getPackedOpaqueMaterial()
      const mesh = this.getMesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = true

      // Set section-specific bounding box for frustum culling
      const sectionIndex = parseInt(materialKey.split(':')[0], 10)
      this.setSectionBoundingBox(mesh, chunkOffset, sectionIndex)

      opaqueGroup.add(mesh)
    })
    opaqueGroup.position.set(worldX, 0, worldZ)
    this.scene.add(opaqueGroup)

    // Create TRANSPARENT group with packed materials
    const transparentGroup = this.getGroup()
    transparentGroup.renderOrder = 1
    transparentGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getPackedTransparentMaterial()
      const mesh = this.getMesh(geometry, material)
      mesh.renderOrder = 1
      mesh.castShadow = false
      mesh.receiveShadow = true
      mesh.frustumCulled = true

      // Set section-specific bounding box for frustum culling
      const sectionIndex = parseInt(materialKey.split(':')[0], 10)
      this.setSectionBoundingBox(mesh, chunkOffset, sectionIndex)

      transparentGroup.add(mesh)
    })
    transparentGroup.position.set(worldX, 0, worldZ)
    this.scene.add(transparentGroup)

    this.meshes.set(key, { opaque: opaqueGroup, transparent: transparentGroup })
  }

  /**
   * Set a section-specific bounding box on a mesh for frustum culling
   * Each section is 16 blocks tall, spanning sectionY to sectionY + SECTION_HEIGHT
   *
   * IMPORTANT: Bounding box must be in LOCAL space (0 to CHUNK_WIDTH/DEPTH).
   * THREE.js transforms the bounding sphere by the mesh's world matrix,
   * so using world coordinates here would double the offset.
   */
  private setSectionBoundingBox(
    mesh: THREE.Mesh,
    _chunkOffset: THREE.Vector3,
    sectionIndex: number
  ): void {
    // Calculate Y range for this section (in local space)
    // Section 0 = Y 0-15, Section 1 = Y 16-31, etc.
    const sectionMinY = sectionIndex * SECTION_HEIGHT
    const sectionMaxY = sectionMinY + SECTION_HEIGHT

    // Create bounding box in LOCAL space (vertices are 0-31 for X/Z)
    // THREE.js will transform this by mesh.position for frustum culling
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(0, sectionMinY, 0),
      new THREE.Vector3(CHUNK_WIDTH, sectionMaxY, CHUNK_DEPTH)
    )

    // Set the bounding sphere manually from the bounding box
    // Can't use computeBoundingSphere() - packed format has no 'position' attribute
    // THREE.js uses boundingSphere for frustum culling
    mesh.geometry.boundingBox = boundingBox

    // Compute bounding sphere from box center and diagonal radius
    const center = new THREE.Vector3()
    boundingBox.getCenter(center)
    const radius = boundingBox.min.distanceTo(boundingBox.max) / 2
    mesh.geometry.boundingSphere = new THREE.Sphere(center, radius)
  }

  /**
   * Update mesh using legacy format (backwards compatibility)
   */
  private updateMesh(
    coord: ChunkCoordinate,
    opaqueGeometryMap: Map<string, THREE.BufferGeometry>,
    transparentGeometryMap: Map<string, THREE.BufferGeometry>
  ): void {
    const key = coord.toKey()
    const worldX = coord.x * CHUNK_WIDTH
    const worldZ = coord.z * CHUNK_DEPTH

    // Dispose old meshes
    const old = this.meshes.get(key)
    if (old) {
      this.releaseGroup(old.opaque)
      this.releaseGroup(old.transparent)
    }

    // Create OPAQUE group (renderOrder = 0)
    const opaqueGroup = this.getGroup()
    opaqueGroup.renderOrder = 0
    opaqueGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getOpaqueMaterial(materialKey)
      const mesh = this.getMesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      opaqueGroup.add(mesh)
    })
    opaqueGroup.position.set(worldX, 0, worldZ)
    this.scene.add(opaqueGroup)

    // Create TRANSPARENT group (renderOrder = 1)
    const transparentGroup = this.getGroup()
    transparentGroup.renderOrder = 1
    transparentGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getTransparentMaterial(materialKey)
      const mesh = this.getMesh(geometry, material)
      mesh.renderOrder = 1
      mesh.castShadow = false
      mesh.receiveShadow = true
      transparentGroup.add(mesh)
    })
    transparentGroup.position.set(worldX, 0, worldZ)
    this.scene.add(transparentGroup)

    this.meshes.set(key, { opaque: opaqueGroup, transparent: transparentGroup })
  }

  disposeChunk(coord: ChunkCoordinate): void {
    const key = coord.toKey()
    const chunkMeshes = this.meshes.get(key)

    if (chunkMeshes) {
      this.releaseGroup(chunkMeshes.opaque)
      this.releaseGroup(chunkMeshes.transparent)
      this.meshes.delete(key)
    }
  }

  disposeAll(): void {
    for (const chunkMeshes of this.meshes.values()) {
      this.releaseGroup(chunkMeshes.opaque)
      this.releaseGroup(chunkMeshes.transparent)
    }
    this.meshes.clear()
    
    // Clear pools on global dispose? Maybe not necessary, but pools are light.
    // We could clear pools if we wanted to free memory completely.
    // this.meshPool = []
    // this.groupPool = []
  }

  /**
   * Get all loaded chunk meshes (for debug/inspection)
   */
  getLoadedChunks(): Map<string, THREE.Group> {
    const result = new Map<string, THREE.Group>()
    for (const [key, meshes] of this.meshes.entries()) {
      result.set(key, meshes.opaque)
    }
    return result
  }
}
