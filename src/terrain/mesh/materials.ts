import * as THREE from 'three'
import { blockRegistry } from '../../blocks'

export enum MaterialType {
  grass = 'grass',
  dirt = 'dirt',
  tree = 'tree',
  leaf = 'leaf',
  sand = 'sand',
  stone = 'stone',
  coal = 'coal',
  wood = 'wood',
  diamond = 'diamond',
  quartz = 'quartz',
  glass = 'glass',
  bedrock = 'bedrock',
  glowstone = 'glowstone',
  redstone_lamp = 'redstone_lamp'
}

/**
 * Materials class - now generates materials from BlockRegistry
 * Maintains backwards compatibility with existing terrain code
 */
export default class Materials {
  materials: Record<MaterialType, THREE.Material | THREE.Material[]>

  constructor() {
    // Generate all materials from BlockRegistry
    const rawMaterials = {
      grass: blockRegistry.createMaterial(0),         // BlockType.grass
      sand: blockRegistry.createMaterial(1),          // BlockType.sand
      tree: blockRegistry.createMaterial(2),          // BlockType.tree
      leaf: blockRegistry.createMaterial(3),          // BlockType.leaf
      dirt: blockRegistry.createMaterial(4),          // BlockType.dirt
      stone: blockRegistry.createMaterial(5),         // BlockType.stone
      coal: blockRegistry.createMaterial(6),          // BlockType.coal
      wood: blockRegistry.createMaterial(7),          // BlockType.wood
      diamond: blockRegistry.createMaterial(8),       // BlockType.diamond
      quartz: blockRegistry.createMaterial(9),        // BlockType.quartz
      glass: blockRegistry.createMaterial(10),        // BlockType.glass
      bedrock: blockRegistry.createMaterial(11),      // BlockType.bedrock
      glowstone: blockRegistry.createMaterial(12),    // BlockType.glowstone
      redstone_lamp: blockRegistry.createMaterial(13) // BlockType.redstone_lamp
    }

    // Apply vertex colors to all materials
    this.materials = {} as Record<MaterialType, THREE.Material | THREE.Material[]>

    for (const [key, material] of Object.entries(rawMaterials)) {
      if (Array.isArray(material)) {
        // Multi-face materials
        this.materials[key as MaterialType] = material.map(mat => {
          mat.vertexColors = true  // Enable vertex color multiplication
          return mat
        })
      } else {
        (material as THREE.MeshStandardMaterial).vertexColors = true
        this.materials[key as MaterialType] = material
      }
    }

    console.log('✅ Materials created with vertex colors enabled')
  }

  get = (
    type: MaterialType
  ): THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] => {
    return this.materials[type] as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]
  }
}

