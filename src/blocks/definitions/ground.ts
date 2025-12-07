import { BlockDefinition, BlockCategory } from '../types'

/**
 * Ground block definitions
 * Includes grass, dirt, sand, gravel, clay
 */
export const GROUND_BLOCKS: BlockDefinition[] = [
  {
    id: 0,  // BlockType.grass
    name: 'Grass Block',
    category: BlockCategory.GROUND,
    textures: [
      'grass_block_side.png',  // +X face
      'grass_block_side.png',  // -X face
      'grass_top_green.png',   // +Y face (top)
      'dirt.png',              // -Y face (bottom)
      'grass_block_side.png',  // +Z face
      'grass_block_side.png'   // -Z face
    ],
    transparent: false,
    baseColor: { r: 0.25, g: 0.85, b: 0.35 },
    faceColors: {
      top: { r: 0.35, g: 0.9, b: 0.4 },
      bottom: { r: 0.5, g: 0.32, b: 0.15 },
      side: { r: 0.45, g: 0.5, b: 0.25 }
    },
    sideOverlay: {
      color: { r: 0.35, g: 0.9, b: 0.4 },
      height: 0.2
    },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,  // Fully opaque
    collidable: true,
    friction: 1.0,  // Normal movement speed
    icon: 'block-icon/grass.png',
    inventorySlot: 1,
    categorySlot: 1
  },

  {
    id: 1,  // BlockType.sand
    name: 'Sand',
    category: BlockCategory.GROUND,
    textures: 'sand.png',
    transparent: false,
    baseColor: { r: 0.95, g: 0.82, b: 0.55 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 0.9,  // Slightly slower (sandy)
    icon: 'block-icon/sand.png',
    inventorySlot: null,  // Not in hotbar by default
    categorySlot: 2
  },

  {
    id: 4,  // BlockType.dirt
    name: 'Dirt',
    category: BlockCategory.GROUND,
    textures: 'dirt.png',
    transparent: false,
    baseColor: { r: 0.6, g: 0.35, b: 0.18 },
    faceColors: {
      top: { r: 0.55, g: 0.32, b: 0.18 },
      bottom: { r: 0.4, g: 0.22, b: 0.12 },
      side: { r: 0.5, g: 0.28, b: 0.14 }
    },
    sideOverlay: {
      color: { r: 0.55, g: 0.32, b: 0.18 },
      height: 0.1
    },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/dirt.png',
    inventorySlot: null,
    categorySlot: 3
  }
]
