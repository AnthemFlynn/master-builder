import * as THREE from 'three'
import { blockRegistry } from '../../../blocks'

export class MaterialSystem {
  private materials = new Map<string, THREE.Material>()
  private faceMaterials = new Map<string, THREE.Material>()

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
    if (!mat) {
      const [blockTypeStr, faceIndexStr] = materialKey.split(':')
      const blockType = Number(blockTypeStr)
      const faceIndex = Number(faceIndexStr)
      mat = blockRegistry.createMaterialForFace(blockType, faceIndex)
      mat.vertexColors = true
      mat.side = THREE.FrontSide
      this.faceMaterials.set(materialKey, mat)
    }
    return mat
  }
}
