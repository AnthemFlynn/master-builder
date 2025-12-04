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
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/dirt.png',
    inventorySlot: null,
    categorySlot: 3
  }
]
