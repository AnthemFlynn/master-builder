import * as THREE from 'three'
import { blockRegistry } from '../../blocks'
import { createLightShader } from '../../lighting/LightShader'

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
  lightDataTexture: THREE.DataTexture | null = null

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

    // Apply lighting shader to all materials
    this.materials = {} as Record<MaterialType, THREE.Material | THREE.Material[]>

    for (const [key, material] of Object.entries(rawMaterials)) {
      if (Array.isArray(material)) {
        // Multi-face materials (grass, logs)
        this.materials[key as MaterialType] = material.map(mat =>
          createLightShader(mat as THREE.MeshStandardMaterial)
        )
      } else {
        this.materials[key as MaterialType] = createLightShader(material as THREE.MeshStandardMaterial)
      }
    }

    console.log('✅ Materials created from BlockRegistry with lighting shaders')
  }

  get = (
    type: MaterialType
  ): THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] => {
    return this.materials[type] as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]
  }

  /**
   * Set light data texture for all materials
   * Call this after creating LightDataTexture
   */
  setLightTexture(texture: THREE.DataTexture): void {
    this.lightDataTexture = texture

    // Update all materials
    for (const material of Object.values(this.materials)) {
      if (Array.isArray(material)) {
        material.forEach(mat => {
          const shader = (mat as any).userData.lightShader
          if (shader) {
            shader.uniforms.lightDataTexture.value = texture
          }
        })
      } else {
        const shader = (material as any).userData.lightShader
        if (shader) {
          shader.uniforms.lightDataTexture.value = texture
        }
      }
    }

    console.log('✅ Light texture set on all materials')
  }
}

