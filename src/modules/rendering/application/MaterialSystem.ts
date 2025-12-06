// src/modules/rendering/application/MaterialSystem.ts
import * as THREE from 'three'
import { blockRegistry } from '../../../blocks'

export class MaterialSystem {
  private materials = new Map<string, THREE.Material>()

  constructor() {
    this.createChunkMaterial()
  }

  private createChunkMaterial(): void {
    // Use blockRegistry for proper material
    const grassMaterialOrArray = blockRegistry.createMaterial(0) // BlockType.grass

    // Handle array of materials (multi-face blocks) - take first one
    const grassMaterial = Array.isArray(grassMaterialOrArray)
      ? grassMaterialOrArray[0]
      : grassMaterialOrArray

    // Enable vertex colors for lighting
    if (grassMaterial instanceof THREE.MeshStandardMaterial) {
      grassMaterial.vertexColors = true
    }

    this.materials.set('chunk', grassMaterial)
    console.log('✅ MaterialSystem: Using BlockRegistry material with vertex colors enabled')
  }

  getChunkMaterial(): THREE.Material {
    return this.materials.get('chunk')!
  }
}
