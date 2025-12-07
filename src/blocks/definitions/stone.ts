import { BlockDefinition, BlockCategory } from '../types'

export const STONE_BLOCKS: BlockDefinition[] = [
  {
    id: 5,  // BlockType.stone
    name: 'Stone',
    category: BlockCategory.STONE,
    textures: 'stone.png',
    transparent: false,
    baseColor: { r: 0.65, g: 0.65, b: 0.7 },
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
    baseColor: { r: 0.4, g: 0.4, b: 0.45 },
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
    baseColor: { r: 0.25, g: 0.25, b: 0.3 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,  // Completely opaque
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/bedrock.png',
    inventorySlot: null,
    categorySlot: 3
  }
]
