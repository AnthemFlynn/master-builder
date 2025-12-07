import * as THREE from 'three'
import { blockRegistry } from '../../../blocks'

export class MaterialSystem {
  private materials = new Map<string, THREE.Material>()
  private blockMaterials = new Map<number, THREE.Material>()

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

  getMaterialForBlock(blockType: number): THREE.Material {
    let mat = this.blockMaterials.get(blockType)
    if (!mat) {
      mat = blockRegistry.createMaterial(blockType)
      mat.vertexColors = true
      mat.side = THREE.DoubleSide
      this.blockMaterials.set(blockType, mat)
    }
    return mat
  }
}
