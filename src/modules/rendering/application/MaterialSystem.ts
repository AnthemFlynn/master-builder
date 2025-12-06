// src/modules/rendering/application/MaterialSystem.ts
import * as THREE from 'three'

export class MaterialSystem {
  private materials = new Map<string, THREE.Material>()

  constructor() {
    this.createChunkMaterial()
  }

  private createChunkMaterial(): void {
    // Load grass texture as temporary single texture
    const textureLoader = new THREE.TextureLoader()
    const grassTexture = textureLoader.load('/src/static/textures/grass.png')
    grassTexture.magFilter = THREE.NearestFilter
    grassTexture.minFilter = THREE.NearestFilter

    const material = new THREE.MeshStandardMaterial({
      map: grassTexture,           // Add texture!
      vertexColors: true,          // Keep vertex colors for lighting
      metalness: 0,
      roughness: 1
    })

    this.materials.set('chunk', material)
    console.log('🎨 MaterialSystem: Created chunk material with grass texture')
  }

  getChunkMaterial(): THREE.Material {
    return this.materials.get('chunk')!
  }
}
