import * as THREE from 'three'
import { blockRegistry } from '../../../modules/blocks'

export class MaterialSystem {
  // Separate caches for opaque and transparent materials
  private opaqueMaterials = new Map<string, THREE.Material>()
  private transparentMaterials = new Map<string, THREE.Material>()
  private readonly maxCacheSize = 500

  constructor() {}

  /**
   * Get material for OPAQUE geometry (solid blocks)
   */
  getOpaqueMaterial(materialKey: string): THREE.Material {
    let mat = this.opaqueMaterials.get(materialKey)
    if (mat) {
      // LRU: Move to end
      this.opaqueMaterials.delete(materialKey)
      this.opaqueMaterials.set(materialKey, mat)
      return mat
    }

    const [blockTypeStr, faceIndexStr] = materialKey.split(':')
    const blockType = Number(blockTypeStr)
    const faceIndex = Number(faceIndexStr)

    mat = blockRegistry.createMaterialForFace(blockType, faceIndex)
    mat.vertexColors = true
    mat.side = THREE.FrontSide
    mat.transparent = false
    mat.depthWrite = true

    this.evictOldest(this.opaqueMaterials)
    this.opaqueMaterials.set(materialKey, mat)
    return mat
  }

  /**
   * Get material for TRANSPARENT geometry (water, glass, vegetation)
   */
  getTransparentMaterial(materialKey: string): THREE.Material {
    let mat = this.transparentMaterials.get(materialKey)
    if (mat) {
      // LRU: Move to end
      this.transparentMaterials.delete(materialKey)
      this.transparentMaterials.set(materialKey, mat)
      return mat
    }

    const [blockTypeStr, faceIndexStr] = materialKey.split(':')
    const blockType = Number(blockTypeStr)

    // Cross-billboard (vegetation)
    if (faceIndexStr === 'cross') {
      mat = blockRegistry.createMaterialForFace(blockType, 0)
      mat.vertexColors = true
      mat.side = THREE.FrontSide
      mat.transparent = true
      mat.alphaTest = 0.5  // Cutout transparency for vegetation
      mat.depthWrite = true  // Vegetation uses alpha test, can write depth
    } else {
      // Water, glass, ice - true alpha blending
      const faceIndex = Number(faceIndexStr)
      mat = blockRegistry.createMaterialForFace(blockType, faceIndex)
      mat.vertexColors = true
      mat.side = THREE.FrontSide  // Only front faces - prevents self Z-fighting from DoubleSide
      mat.transparent = true
      mat.opacity = 0.7  // Semi-transparent
      mat.depthWrite = false  // Don't write to depth buffer (allows seeing through)
    }

    this.evictOldest(this.transparentMaterials)
    this.transparentMaterials.set(materialKey, mat)
    return mat
  }

  private evictOldest(cache: Map<string, THREE.Material>): void {
    if (cache.size >= this.maxCacheSize) {
      const oldestKey = cache.keys().next().value
      const oldestMaterial = cache.get(oldestKey)
      if (oldestMaterial) {
        oldestMaterial.dispose()
        cache.delete(oldestKey)
      }
    }
  }

  dispose(): void {
    for (const mat of this.opaqueMaterials.values()) mat.dispose()
    for (const mat of this.transparentMaterials.values()) mat.dispose()
    this.opaqueMaterials.clear()
    this.transparentMaterials.clear()
  }
}
