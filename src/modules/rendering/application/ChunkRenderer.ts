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
import { CHUNK_WIDTH, CHUNK_DEPTH, SECTION_HEIGHT, MIN_Y } from '../../../shared/constants/ChunkConstants'

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

    // Debug logging
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

    // Create OPAQUE group with packed materials
    // Each mesh has a section-specific bounding box for frustum culling
    const opaqueGroup = new THREE.Group()
    opaqueGroup.renderOrder = 0
    opaqueGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getPackedOpaqueMaterial(chunkOffset)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = true

      // Set section-specific bounding box for frustum culling
      // Key format: "sectionIndex:blockType:faceIndex"
      const sectionIndex = parseInt(materialKey.split(':')[0], 10)
      this.setSectionBoundingBox(mesh, chunkOffset, sectionIndex)

      opaqueGroup.add(mesh)
    })
    // Don't set position - shader uses uChunkOffset uniform
    this.scene.add(opaqueGroup)

    // Create TRANSPARENT group with packed materials
    const transparentGroup = new THREE.Group()
    transparentGroup.renderOrder = 1
    transparentGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getPackedTransparentMaterial(chunkOffset)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.renderOrder = 1
      mesh.castShadow = false
      mesh.receiveShadow = true
      mesh.frustumCulled = true

      // Set section-specific bounding box for frustum culling
      const sectionIndex = parseInt(materialKey.split(':')[0], 10)
      this.setSectionBoundingBox(mesh, chunkOffset, sectionIndex)

      transparentGroup.add(mesh)
    })
    this.scene.add(transparentGroup)

    this.meshes.set(key, { opaque: opaqueGroup, transparent: transparentGroup })
  }

  /**
   * Set a section-specific bounding box on a mesh for frustum culling
   * Each section is 16 blocks tall, spanning sectionY to sectionY + SECTION_HEIGHT
   */
  private setSectionBoundingBox(
    mesh: THREE.Mesh,
    chunkOffset: THREE.Vector3,
    sectionIndex: number
  ): void {
    // Calculate world Y range for this section
    const sectionMinY = MIN_Y + sectionIndex * SECTION_HEIGHT
    const sectionMaxY = sectionMinY + SECTION_HEIGHT

    // Create bounding box for this section
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(chunkOffset.x, sectionMinY, chunkOffset.z),
      new THREE.Vector3(chunkOffset.x + CHUNK_WIDTH, sectionMaxY, chunkOffset.z + CHUNK_DEPTH)
    )

    // Set the bounding sphere from the bounding box
    // THREE.js uses boundingSphere for frustum culling
    mesh.geometry.boundingBox = boundingBox
    mesh.geometry.computeBoundingSphere()
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

    // Debug logging
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

    // Create OPAQUE group (renderOrder = 0)
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

    // Create TRANSPARENT group (renderOrder = 1)
    const transparentGroup = new THREE.Group()
    transparentGroup.renderOrder = 1
    transparentGeometryMap.forEach((geometry, materialKey) => {
      const material = this.materialSystem.getTransparentMaterial(materialKey)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.renderOrder = 1
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
        // Dispose material if it's not shared
        if (child.material instanceof THREE.Material) {
          // Only dispose if it's a per-chunk material (packed format)
          if (!child.material.userData?.shared) {
            child.material.dispose()
          }
        }
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

  disposeAll(): void {
    for (const chunkMeshes of this.meshes.values()) {
      this.disposeGroup(chunkMeshes.opaque)
      this.disposeGroup(chunkMeshes.transparent)
    }
    this.meshes.clear()
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
