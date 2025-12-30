import { BlockDefinition, BlockCategory } from '../types'

/**
 * Ground block definitions
 * Includes grass, dirt, sand, gravel, clay
 */
export const GROUND_BLOCKS: BlockDefinition[] = [
  {
    id: 14,  // BlockType.grass (Moved from 8 to avoid Diamond Block conflict)
    name: 'Grass Block',
    category: BlockCategory.GROUND,
    textures: [
      'grass_block_side.png',  // +X face
      'grass_block_side.png',  // -X face
      'grass_block_top.png',   // +Y face (top)
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
    icon: '/textures/block/grass_block_side.png',
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
    icon: '/textures/block/sand.png',
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
    icon: '/textures/block/dirt.png',
    inventorySlot: null,
    categorySlot: 3
  },

  {
    id: 17,  // BlockType.gravel
    name: 'Gravel',
    category: BlockCategory.GROUND,
    textures: 'gravel.png',
    transparent: false,
    baseColor: { r: 0.55, g: 0.52, b: 0.5 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 0.85,
    icon: '/textures/block/gravel.png',
    inventorySlot: null,
    categorySlot: 4
  },

  {
    id: 18,  // BlockType.clay
    name: 'Clay',
    category: BlockCategory.GROUND,
    textures: 'clay.png',
    transparent: false,
    baseColor: { r: 0.6, g: 0.62, b: 0.68 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 0.9,
    icon: '/textures/block/clay.png',
    inventorySlot: null,
    categorySlot: 5
  },

  {
    id: 19,  // BlockType.snow
    name: 'Snow Block',
    category: BlockCategory.GROUND,
    textures: 'snow.png',
    transparent: false,
    baseColor: { r: 0.95, g: 0.97, b: 1.0 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 0.7,  // Slippery
    icon: '/textures/block/snow.png',
    inventorySlot: null,
    categorySlot: 6
  },

  {
    id: 22,  // BlockType.red_sand
    name: 'Red Sand',
    category: BlockCategory.GROUND,
    textures: 'red_sand.png',
    transparent: false,
    baseColor: { r: 0.85, g: 0.45, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 0.9,
    icon: '/textures/block/red_sand.png',
    inventorySlot: null,
    categorySlot: 7
  },

  {
    id: 29,  // BlockType.podzol
    name: 'Podzol',
    category: BlockCategory.GROUND,
    textures: [
      'podzol_side.png',
      'podzol_side.png',
      'podzol_top.png',
      'dirt.png',
      'podzol_side.png',
      'podzol_side.png'
    ],
    transparent: false,
    baseColor: { r: 0.45, g: 0.35, b: 0.2 },
    faceColors: {
      top: { r: 0.55, g: 0.4, b: 0.2 },
      bottom: { r: 0.5, g: 0.28, b: 0.14 },
      side: { r: 0.5, g: 0.35, b: 0.18 }
    },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/podzol_side.png',
    inventorySlot: null,
    categorySlot: 8
  },

  {
    id: 30,  // BlockType.mycelium
    name: 'Mycelium',
    category: BlockCategory.GROUND,
    textures: [
      'mycelium_side.png',
      'mycelium_side.png',
      'mycelium_top.png',
      'dirt.png',
      'mycelium_side.png',
      'mycelium_side.png'
    ],
    transparent: false,
    baseColor: { r: 0.55, g: 0.45, b: 0.55 },
    faceColors: {
      top: { r: 0.6, g: 0.5, b: 0.6 },
      bottom: { r: 0.5, g: 0.28, b: 0.14 },
      side: { r: 0.55, g: 0.42, b: 0.52 }
    },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/mycelium_side.png',
    inventorySlot: null,
    categorySlot: 9
  },

  {
    id: 31,  // BlockType.terracotta
    name: 'Terracotta',
    category: BlockCategory.GROUND,
    textures: 'terracotta.png',
    transparent: false,
    baseColor: { r: 0.75, g: 0.48, b: 0.35 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/terracotta.png',
    inventorySlot: null,
    categorySlot: 10
  }
]
