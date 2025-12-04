import { BlockDefinition, BlockCategory } from '../types'

export const STONE_BLOCKS: BlockDefinition[] = [
  {
    id: 5,  // BlockType.stone
    name: 'Stone',
    category: BlockCategory.STONE,
    textures: 'stone.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/stone.png',
    inventorySlot: 2,
    categorySlot: 1
  },

  {
    id: 6,  // BlockType.coal
    name: 'Coal Ore',
    category: BlockCategory.STONE,
    textures: 'coal_ore.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/coal.png',
    inventorySlot: null,
    categorySlot: 2
  },

  {
    id: 11,  // BlockType.bedrock
    name: 'Bedrock',
    category: BlockCategory.STONE,
    textures: 'bedrock.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,  // Completely opaque
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/bedrock.png',
    inventorySlot: null,
    categorySlot: 3
  }
]
