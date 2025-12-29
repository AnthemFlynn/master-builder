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
  },

  {
    id: 20,  // BlockType.ice
    name: 'Ice',
    category: BlockCategory.STONE,
    textures: 'ice.png',
    transparent: true,
    baseColor: { r: 0.7, g: 0.85, b: 0.95 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.1,
    collidable: true,
    friction: 0.4,  // Very slippery
    icon: '/textures/block/ice.png',
    inventorySlot: null,
    categorySlot: 5
  },

  {
    id: 21,  // BlockType.sandstone
    name: 'Sandstone',
    category: BlockCategory.STONE,
    textures: [
      'sandstone.png',
      'sandstone.png',
      'sandstone_top.png',
      'sandstone_bottom.png',
      'sandstone.png',
      'sandstone.png'
    ],
    transparent: false,
    baseColor: { r: 0.88, g: 0.8, b: 0.6 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/sandstone.png',
    inventorySlot: null,
    categorySlot: 6
  },

  {
    id: 23,  // BlockType.cobblestone
    name: 'Cobblestone',
    category: BlockCategory.STONE,
    textures: 'cobblestone.png',
    transparent: false,
    baseColor: { r: 0.5, g: 0.5, b: 0.52 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/cobblestone.png',
    inventorySlot: null,
    categorySlot: 7
  },

  {
    id: 24,  // BlockType.mossy_cobblestone
    name: 'Mossy Cobblestone',
    category: BlockCategory.STONE,
    textures: 'mossy_cobblestone.png',
    transparent: false,
    baseColor: { r: 0.4, g: 0.52, b: 0.4 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/mossy_cobblestone.png',
    inventorySlot: null,
    categorySlot: 8
  },

  {
    id: 25,  // BlockType.iron_ore
    name: 'Iron Ore',
    category: BlockCategory.STONE,
    textures: 'iron_ore.png',
    transparent: false,
    baseColor: { r: 0.6, g: 0.55, b: 0.52 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/iron_ore.png',
    inventorySlot: null,
    categorySlot: 9
  },

  {
    id: 26,  // BlockType.gold_ore
    name: 'Gold Ore',
    category: BlockCategory.STONE,
    textures: 'gold_ore.png',
    transparent: false,
    baseColor: { r: 0.65, g: 0.6, b: 0.45 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/gold_ore.png',
    inventorySlot: null,
    categorySlot: 10
  },

  {
    id: 27,  // BlockType.diamond_ore
    name: 'Diamond Ore',
    category: BlockCategory.STONE,
    textures: 'diamond_ore.png',
    transparent: false,
    baseColor: { r: 0.55, g: 0.65, b: 0.7 },
    emissive: { r: 0, g: 1, b: 2 },  // Slight blue glow
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/diamond_ore.png',
    inventorySlot: null,
    categorySlot: 11
  },

  {
    id: 28,  // BlockType.coal_ore
    name: 'Coal Ore',
    category: BlockCategory.STONE,
    textures: 'coal_ore.png',
    transparent: false,
    baseColor: { r: 0.35, g: 0.35, b: 0.38 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/coal_ore.png',
    inventorySlot: null,
    categorySlot: 12
  },

  {
    id: 32,  // BlockType.packed_ice
    name: 'Packed Ice',
    category: BlockCategory.STONE,
    textures: 'packed_ice.png',
    transparent: false,
    baseColor: { r: 0.6, g: 0.75, b: 0.9 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 0.3,  // Even more slippery than regular ice
    icon: '/textures/block/packed_ice.png',
    inventorySlot: null,
    categorySlot: 13
  }
]
