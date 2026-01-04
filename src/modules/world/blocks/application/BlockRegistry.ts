import { BlockDefinition, BlockCategory } from '../domain/types'
import * as THREE from 'three'

/**
 * Centralized block registry
 * Single source of truth for all block definitions
 */
export class BlockRegistry {
  private blocks = new Map<number, BlockDefinition>()
  private textureLoader?: THREE.TextureLoader
  private textureBasePath = '/textures/block/'

  // Pooled color object to avoid allocations in getFaceColor
  private static readonly _pooledColor = new THREE.Color()
  // Reusable RGB object for non-allocating color queries
  private static readonly _pooledRGB = { r: 0, g: 0, b: 0 }

  /**
   * Register a block definition
   */
  register(block: BlockDefinition): void {
    if (this.blocks.has(block.id)) {
      throw new Error(`❌ Block ID Collision! ID ${block.id} is already registered. Check your block definitions.`)
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

    // Calculate emissive intensity based on block strength
    // High-emissive blocks (glowstone, jack-o-lantern) get full intensity
    const hasEmissive = block.emissive.r > 0 || block.emissive.g > 0 || block.emissive.b > 0
    const maxEmissive = Math.max(block.emissive.r, block.emissive.g, block.emissive.b)
    const emissiveIntensity = hasEmissive ? Math.min(1.2, maxEmissive / 12.5) : 0  // 15 / 12.5 = 1.2

    // Water special handling (ID 16)
    const isWater = id === 16

    return new THREE.MeshStandardMaterial({
      map,
      transparent: block.transparent,
      opacity: isWater ? 0.8 : 1.0,
      side: isWater ? THREE.DoubleSide : THREE.FrontSide,
      vertexColors: true,
      roughness: isWater ? 0.1 : 1.0, // Matte surface for better light diffusion, shiny for water
      metalness: isWater ? 0.1 : 0.0, // Non-metallic
      emissive: new THREE.Color(
        block.emissive.r / 15,
        block.emissive.g / 15,
        block.emissive.b / 15
      ),
      emissiveIntensity
    })
  }

  /**
   * Get base color as RGB object (non-allocating, for hot paths like meshing)
   * WARNING: Returns a shared object - copy values immediately, don't store reference
   */
  getBaseColorRGB(id: number): { r: number; g: number; b: number } {
    const block = this.get(id)
    const rgb = BlockRegistry._pooledRGB
    if (block?.baseColor) {
      rgb.r = block.baseColor.r
      rgb.g = block.baseColor.g
      rgb.b = block.baseColor.b
    } else {
      rgb.r = 0.7
      rgb.g = 0.7
      rgb.b = 0.7
    }
    return rgb
  }

  /**
   * Get face color as RGB object (non-allocating, for hot paths like meshing)
   * WARNING: Returns a shared object - copy values immediately, don't store reference
   */
  getFaceColorRGB(id: number, normal: { x: number, y: number, z: number }): { r: number; g: number; b: number } {
    const block = this.get(id)
    const rgb = BlockRegistry._pooledRGB

    if (!block?.faceColors) {
      return this.getBaseColorRGB(id)
    }
    if (normal.y === 1 && block.faceColors.top) {
      rgb.r = block.faceColors.top.r
      rgb.g = block.faceColors.top.g
      rgb.b = block.faceColors.top.b
      return rgb
    }
    if (normal.y === -1 && block.faceColors.bottom) {
      rgb.r = block.faceColors.bottom.r
      rgb.g = block.faceColors.bottom.g
      rgb.b = block.faceColors.bottom.b
      return rgb
    }
    if ((normal.x !== 0 || normal.z !== 0) && block.faceColors.side) {
      rgb.r = block.faceColors.side.r
      rgb.g = block.faceColors.side.g
      rgb.b = block.faceColors.side.b
      return rgb
    }
    return this.getBaseColorRGB(id)
  }

  /**
   * Get base color as THREE.Color (allocates - avoid in hot paths)
   * @deprecated Use getBaseColorRGB() in hot paths like meshing
   */
  getBaseColor(id: number): THREE.Color {
    const rgb = this.getBaseColorRGB(id)
    return BlockRegistry._pooledColor.setRGB(rgb.r, rgb.g, rgb.b).clone()
  }

  /**
   * Get face color as THREE.Color (allocates - avoid in hot paths)
   * @deprecated Use getFaceColorRGB() in hot paths like meshing
   */
  getFaceColor(id: number, normal: { x: number, y: number, z: number }): THREE.Color {
    const rgb = this.getFaceColorRGB(id, normal)
    return BlockRegistry._pooledColor.setRGB(rgb.r, rgb.g, rgb.b).clone()
  }

  getSideOverlay(id: number) {
    return this.blocks.get(id)?.sideOverlay
  }

  /**
   * Get all unique texture names from all registered blocks
   * Used to build the texture array
   */
  getAllTextureNames(): string[] {
    const textureSet = new Set<string>()
    for (const block of this.blocks.values()) {
      if (typeof block.textures === 'string') {
        textureSet.add(block.textures)
      } else if (Array.isArray(block.textures)) {
        for (const tex of block.textures) {
          textureSet.add(tex)
        }
      }
    }
    return Array.from(textureSet)
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

    // Water special handling (ID 16)
    const isWater = id === 16

    return new THREE.MeshStandardMaterial({
      map,
      transparent: block?.transparent ?? false,
      opacity: isWater ? 0.8 : 1.0,
      side: isWater ? THREE.DoubleSide : THREE.FrontSide,
      vertexColors: true,
      roughness: isWater ? 0.1 : 1.0,
      metalness: isWater ? 0.1 : 0.0,
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
