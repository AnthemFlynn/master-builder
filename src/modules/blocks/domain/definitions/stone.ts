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
    icon: '/textures/block/stone.png',
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
    icon: '/textures/block/coal_ore.png',
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
    icon: '/textures/block/bedrock.png',
    inventorySlot: null,
    categorySlot: 3
  },

  {
    id: 15,  // BlockType.obsidian
    name: 'Obsidian',
    category: BlockCategory.STONE,
    textures: 'obsidian.png',
    transparent: false,
    baseColor: { r: 0.15, g: 0.08, b: 0.2 },  // Dark purple-black
    emissive: { r: 1, g: 0, b: 2 },  // Subtle purple glow
    lightAbsorption: 1.0,
    collidable: true,
    friction: 0.9,  // Slightly slippery (glassy)
    icon: '/textures/block/obsidian.png',
    inventorySlot: 3,  // Add to hotbar
    categorySlot: 4
  }
]
