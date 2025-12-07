/**
 * Block categories for organization
 */
export enum BlockCategory {
  GROUND = 'ground',
  STONE = 'stone',
  WOOD = 'wood',
  ILLUMINATION = 'illumination',
  METALS = 'metals',
  TRANSPARENT = 'transparent',
  FLUIDS = 'fluids'
}

/**
 * RGB color value (0-15 per channel)
 */
export interface RGB {
  r: number  // 0-15
  g: number  // 0-15
  b: number  // 0-15
}

/**
 * Complete block definition
 */
export interface BlockDefinition {
  // Identity
  id: number  // BlockType value
  name: string
  category: BlockCategory

  // Visual properties
  textures: string | string[]  // Single texture or 6-face array [px, nx, py, ny, pz, nz]
  transparent: boolean
  baseColor?: { r: number, g: number, b: number }  // Optional normalized RGB (0-1) for vertex coloring
  faceColors?: {
    top?: { r: number, g: number, b: number }
    bottom?: { r: number, g: number, b: number }
    side?: { r: number, g: number, b: number }
  }

  // Lighting properties
  emissive: RGB  // Light emission (0-15 per channel)
  lightAbsorption: number  // 0.0 (glass, transmits all) to 1.0 (bedrock, blocks all)

  // Physics properties
  collidable: boolean  // Can player pass through?
  friction: number  // Movement speed multiplier (1.0 = normal, 0.5 = half speed)

  // Inventory properties
  icon: string  // Path to inventory icon
  inventorySlot?: number  // 1-9 for hotbar, null if not in hotbar
  categorySlot?: number  // Position in category (1-9)

  // Future properties (not used yet)
  hardness?: number
  tool?: string
  drops?: number  // BlockType
}
