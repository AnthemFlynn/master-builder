// src/modules/rendering/application/MaterialSystem.ts
import * as THREE from 'three'

export class MaterialSystem {
  private materials = new Map<string, THREE.Material>()

  constructor() {
    this.createChunkMaterial()
  }

  private createChunkMaterial(): void {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0,
      roughness: 1
    })

    this.materials.set('chunk', material)
  }

  getChunkMaterial(): THREE.Material {
    return this.materials.get('chunk')!
  }
}
