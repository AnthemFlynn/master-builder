import { BlockDefinition, BlockCategory } from './types'
import * as THREE from 'three'

/**
 * Centralized block registry
 * Single source of truth for all block definitions
 */
export class BlockRegistry {
  private blocks = new Map<number, BlockDefinition>()
  private textureLoader?: THREE.TextureLoader
  private textureBasePath = '/textures/block/'

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
  createMaterial(id: number): THREE.Material {
    const block = this.get(id)
    if (!block) {
      console.error(`❌ Block ${id} not found in registry`)
      return new THREE.MeshStandardMaterial({ color: 0xff00ff, vertexColors: true })  // Magenta = missing
    }

    const textureName = Array.isArray(block.textures) ? block.textures[0] : block.textures
    const map = this.createTexture(textureName)

    return new THREE.MeshStandardMaterial({
      map,
      transparent: block.transparent,
      vertexColors: true,
      emissive: new THREE.Color(
        block.emissive.r / 15,
        block.emissive.g / 15,
        block.emissive.b / 15
      ),
      emissiveIntensity: block.emissive.r > 0 || block.emissive.g > 0 || block.emissive.b > 0 ? 0.8 : 0
    })
  }

  getBaseColor(id: number): THREE.Color {
    const block = this.get(id)
    if (block?.baseColor) {
      return new THREE.Color(block.baseColor.r, block.baseColor.g, block.baseColor.b)
    }
    return new THREE.Color(0.7, 0.7, 0.7)
  }

  getFaceColor(id: number, normal: { x: number, y: number, z: number }): THREE.Color {
    const block = this.get(id)
    if (!block?.faceColors) {
      return this.getBaseColor(id)
    }
    if (normal.y === 1 && block.faceColors.top) {
      return new THREE.Color(block.faceColors.top.r, block.faceColors.top.g, block.faceColors.top.b)
    }
    if (normal.y === -1 && block.faceColors.bottom) {
      return new THREE.Color(block.faceColors.bottom.r, block.faceColors.bottom.g, block.faceColors.bottom.b)
    }
    if ((normal.x !== 0 || normal.z !== 0) && block.faceColors.side) {
      return new THREE.Color(block.faceColors.side.r, block.faceColors.side.g, block.faceColors.side.b)
    }
    return this.getBaseColor(id)
  }

  getSideOverlay(id: number) {
    return this.blocks.get(id)?.sideOverlay
  }

  getTextureForFace(id: number, faceIndex: number): string {
    const block = this.get(id)
    if (!block) return 'missing.png'
    if (typeof block.textures === 'string') {
      return block.textures
    }
    if (block.textures.length === 6) {
      return block.textures[faceIndex] ?? block.textures[0]
    }
    if (block.textures.length === 3) {
      // assume [side, top, bottom]
      if (faceIndex === 2) return block.textures[1]
      if (faceIndex === 3) return block.textures[2]
      return block.textures[0]
    }
    return block.textures[0]
  }

  createMaterialForFace(id: number, faceIndex: number): THREE.Material {
    const textureName = this.getTextureForFace(id, faceIndex)
    const map = this.createTexture(textureName)
    const block = this.get(id)
    return new THREE.MeshStandardMaterial({
      map,
      transparent: block?.transparent ?? false,
      vertexColors: true,
      emissive: block ? new THREE.Color(block.emissive.r / 15, block.emissive.g / 15, block.emissive.b / 15) : new THREE.Color(0, 0, 0),
      emissiveIntensity: block && (block.emissive.r || block.emissive.g || block.emissive.b) ? 0.8 : 0
    })
  }

  private createTexture(textureName: string): THREE.Texture {
    if (!this.textureLoader) {
      this.textureLoader = new THREE.TextureLoader()
    }
    const texture = this.textureLoader.load(`${this.textureBasePath}${textureName}`)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    return texture
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
