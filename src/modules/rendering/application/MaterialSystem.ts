import * as THREE from 'three'
import { blockRegistry } from '../../../modules/blocks'

export class MaterialSystem {
  private materials = new Map<string, THREE.Material>()
  private faceMaterials = new Map<string, THREE.Material>()
  // Cache size increased to cover all block types × faces (~65 blocks × 6 faces = 390)
  // Plus cross materials and some headroom
  private readonly maxCacheSize = 500

  constructor() {
    this.materials.set('chunk', new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide
    }))
  }

  private createChunkMaterial(): THREE.Material {
    const material = blockRegistry.createMaterial(0)
    material.vertexColors = true
    material.side = THREE.DoubleSide
    return material
  }

  getChunkMaterial(): THREE.Material {
    return this.materials.get('chunk')!
  }

  getMaterial(materialKey: string): THREE.Material {
    let mat = this.faceMaterials.get(materialKey)

    if (mat) {
      // LRU: Move to end of Map (most recently used)
      this.faceMaterials.delete(materialKey)
      this.faceMaterials.set(materialKey, mat)
      return mat
    }

    // Material not in cache, create new one
    const [blockTypeStr, faceIndexStr] = materialKey.split(':')
    const blockType = Number(blockTypeStr)

    // Check if this is a cross-billboard material
    if (faceIndexStr === 'cross') {
      // Cross-billboard: use block's texture with transparency
      mat = blockRegistry.createMaterialForFace(blockType, 0) // Use first texture
      mat.vertexColors = true
      mat.side = THREE.FrontSide  // We duplicate verts for back faces
      mat.transparent = true
      mat.alphaTest = 0.5  // Discard pixels with alpha < 0.5
      mat.depthWrite = true
    } else {
      const faceIndex = Number(faceIndexStr)
      mat = blockRegistry.createMaterialForFace(blockType, faceIndex)
      mat.vertexColors = true
      mat.side = THREE.FrontSide
    }

    // LRU eviction: Remove oldest entry if cache is full
    if (this.faceMaterials.size >= this.maxCacheSize) {
      const oldestKey = this.faceMaterials.keys().next().value
      const oldestMaterial = this.faceMaterials.get(oldestKey)

      if (oldestMaterial) {
        oldestMaterial.dispose()
        this.faceMaterials.delete(oldestKey)
      }
    }

    this.faceMaterials.set(materialKey, mat)
    return mat
  }

  dispose(): void {
    // Dispose all materials
    for (const material of this.materials.values()) {
      material.dispose()
    }
    for (const material of this.faceMaterials.values()) {
      material.dispose()
    }
    this.materials.clear()
    this.faceMaterials.clear()
  }
}
