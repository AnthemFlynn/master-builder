import { BlockDefinition, BlockCategory } from './types'
import * as THREE from 'three'

/**
 * Centralized block registry
 * Single source of truth for all block definitions
 */
export class BlockRegistry {
  private blocks = new Map<number, BlockDefinition>()
  private textureLoader = new THREE.TextureLoader()

  /**
   * Register a block definition
   */
  register(block: BlockDefinition): void {
    if (this.blocks.has(block.id)) {
      console.warn(`⚠️ Block ID ${block.id} already registered. Overwriting.`)
    }
    this.blocks.set(block.id, block)
  }

  /**
   * Register multiple blocks at once
   */
  registerAll(blocks: BlockDefinition[]): void {
    blocks.forEach(block => this.register(block))
  }

  /**
   * Get block definition by ID
   */
  get(id: number): BlockDefinition | undefined {
    return this.blocks.get(id)
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): BlockDefinition[] {
    return Array.from(this.blocks.values())
  }

  /**
   * Get blocks by category
   */
  getByCategory(category: BlockCategory): BlockDefinition[] {
    return this.getAllBlocks().filter(b => b.category === category)
  }

  /**
   * Get blocks for inventory hotbar (slots 1-9)
   */
  getInventoryBlocks(): BlockDefinition[] {
    return this.getAllBlocks()
      .filter(b => b.inventorySlot !== undefined && b.inventorySlot !== null)
      .sort((a, b) => (a.inventorySlot ?? 0) - (b.inventorySlot ?? 0))
  }

  /**
   * Create Three.js material from block definition
   */
  createMaterial(id: number): THREE.Material | THREE.Material[] {
    const block = this.get(id)
    if (!block) {
      console.error(`❌ Block ${id} not found in registry`)
      return new THREE.MeshStandardMaterial({ color: 0xff00ff })  // Magenta = missing
    }

    // Multi-face materials (grass, logs)
    if (Array.isArray(block.textures)) {
      return block.textures.map(texturePath => {
        const texture = this.textureLoader.load(`/src/static/textures/block/${texturePath}`)
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter

        return new THREE.MeshStandardMaterial({
          map: texture,
          transparent: block.transparent,
          emissive: new THREE.Color(
            block.emissive.r / 15,
            block.emissive.g / 15,
            block.emissive.b / 15
          ),
          emissiveIntensity: block.emissive.r > 0 || block.emissive.g > 0 || block.emissive.b > 0 ? 0.8 : 0
        })
      })
    }

    // Single texture
    const texture = this.textureLoader.load(`/src/static/textures/block/${block.textures}`)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter

    return new THREE.MeshStandardMaterial({
      map: texture,
      transparent: block.transparent,
      emissive: new THREE.Color(
        block.emissive.r / 15,
        block.emissive.g / 15,
        block.emissive.b / 15
      ),
      emissiveIntensity: block.emissive.r > 0 || block.emissive.g > 0 || block.emissive.b > 0 ? 0.8 : 0
    })
  }

  /**
   * Get total number of registered blocks
   */
  size(): number {
    return this.blocks.size
  }
}

// Singleton instance
export const blockRegistry = new BlockRegistry()
