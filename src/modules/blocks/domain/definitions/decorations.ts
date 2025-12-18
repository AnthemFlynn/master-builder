import { BlockDefinition, BlockCategory } from '../types'

// Decorations with proper Minecraft textures

export const DECORATION_BLOCKS: BlockDefinition[] = [
  // ===== GRASS/PLANTS =====
  {
    id: 33,  // BlockType.tall_grass
    name: 'Tall Grass',
    category: BlockCategory.TRANSPARENT,
    textures: 'short_grass.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.35, g: 0.65, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/short_grass.png',
    inventorySlot: null,
    categorySlot: 1
  },
  {
    id: 34,  // BlockType.fern
    name: 'Fern',
    category: BlockCategory.TRANSPARENT,
    textures: 'fern.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.3, g: 0.55, b: 0.2 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/fern.png',
    inventorySlot: null,
    categorySlot: 2
  },
  {
    id: 35,  // BlockType.dead_bush
    name: 'Dead Bush',
    category: BlockCategory.TRANSPARENT,
    textures: 'dead_bush.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.55, g: 0.45, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/dead_bush.png',
    inventorySlot: null,
    categorySlot: 3
  },

  // ===== FLOWERS =====
  {
    id: 36,  // BlockType.dandelion
    name: 'Dandelion',
    category: BlockCategory.TRANSPARENT,
    textures: 'dandelion.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.95, g: 0.85, b: 0.15 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/dandelion.png',
    inventorySlot: null,
    categorySlot: 4
  },
  {
    id: 37,  // BlockType.poppy
    name: 'Poppy',
    category: BlockCategory.TRANSPARENT,
    textures: 'poppy.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.9, g: 0.2, b: 0.15 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/poppy.png',
    inventorySlot: null,
    categorySlot: 5
  },
  {
    id: 38,  // BlockType.blue_orchid
    name: 'Blue Orchid',
    category: BlockCategory.TRANSPARENT,
    textures: 'blue_orchid.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.3, g: 0.65, b: 0.9 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/blue_orchid.png',
    inventorySlot: null,
    categorySlot: 6
  },
  {
    id: 39,  // BlockType.allium
    name: 'Allium',
    category: BlockCategory.TRANSPARENT,
    textures: 'allium.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.7, g: 0.4, b: 0.85 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/allium.png',
    inventorySlot: null,
    categorySlot: 7
  },
  {
    id: 40,  // BlockType.azure_bluet
    name: 'Azure Bluet',
    category: BlockCategory.TRANSPARENT,
    textures: 'azure_bluet.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.85, g: 0.9, b: 0.95 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/azure_bluet.png',
    inventorySlot: null,
    categorySlot: 8
  },
  {
    id: 41,  // BlockType.red_tulip
    name: 'Red Tulip',
    category: BlockCategory.TRANSPARENT,
    textures: 'red_tulip.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.85, g: 0.15, b: 0.15 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/red_tulip.png',
    inventorySlot: null,
    categorySlot: 9
  },
  {
    id: 42,  // BlockType.orange_tulip
    name: 'Orange Tulip',
    category: BlockCategory.TRANSPARENT,
    textures: 'orange_tulip.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.95, g: 0.55, b: 0.15 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/orange_tulip.png',
    inventorySlot: null,
    categorySlot: 10
  },
  {
    id: 43,  // BlockType.white_tulip
    name: 'White Tulip',
    category: BlockCategory.TRANSPARENT,
    textures: 'white_tulip.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.95, g: 0.95, b: 0.95 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/white_tulip.png',
    inventorySlot: null,
    categorySlot: 11
  },
  {
    id: 44,  // BlockType.pink_tulip
    name: 'Pink Tulip',
    category: BlockCategory.TRANSPARENT,
    textures: 'pink_tulip.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.95, g: 0.6, b: 0.7 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/pink_tulip.png',
    inventorySlot: null,
    categorySlot: 12
  },
  {
    id: 45,  // BlockType.oxeye_daisy
    name: 'Oxeye Daisy',
    category: BlockCategory.TRANSPARENT,
    textures: 'oxeye_daisy.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.95, g: 0.95, b: 0.85 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/oxeye_daisy.png',
    inventorySlot: null,
    categorySlot: 13
  },
  {
    id: 46,  // BlockType.cornflower
    name: 'Cornflower',
    category: BlockCategory.TRANSPARENT,
    textures: 'cornflower.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.35, g: 0.45, b: 0.85 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/cornflower.png',
    inventorySlot: null,
    categorySlot: 14
  },
  {
    id: 47,  // BlockType.lily_of_valley
    name: 'Lily of the Valley',
    category: BlockCategory.TRANSPARENT,
    textures: 'lily_of_the_valley.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.9, g: 0.95, b: 0.9 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/lily_of_the_valley.png',
    inventorySlot: null,
    categorySlot: 15
  },

  // ===== MUSHROOMS =====
  {
    id: 48,  // BlockType.brown_mushroom
    name: 'Brown Mushroom',
    category: BlockCategory.TRANSPARENT,
    textures: 'brown_mushroom.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.55, g: 0.4, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/brown_mushroom.png',
    inventorySlot: null,
    categorySlot: 16
  },
  {
    id: 49,  // BlockType.red_mushroom
    name: 'Red Mushroom',
    category: BlockCategory.TRANSPARENT,
    textures: 'red_mushroom.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.85, g: 0.2, b: 0.15 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/red_mushroom.png',
    inventorySlot: null,
    categorySlot: 17
  },

  // ===== SPECIAL PLANTS =====
  {
    id: 50,  // BlockType.sugar_cane
    name: 'Sugar Cane',
    category: BlockCategory.TRANSPARENT,
    textures: 'sugar_cane.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.5, g: 0.75, b: 0.35 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 1.0,
    icon: '/textures/block/sugar_cane.png',
    inventorySlot: null,
    categorySlot: 18
  },
  {
    id: 51,  // BlockType.cactus
    name: 'Cactus',
    category: BlockCategory.TRANSPARENT,
    textures: ['cactus_side.png', 'cactus_side.png', 'cactus_top.png', 'cactus_bottom.png', 'cactus_side.png', 'cactus_side.png'],
    transparent: false,
    meshType: 'cube',  // Cactus is a solid block, not cross
    baseColor: { r: 0.25, g: 0.55, b: 0.2 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/cactus_side.png',
    inventorySlot: null,
    categorySlot: 19
  },
  {
    id: 52,  // BlockType.seagrass
    name: 'Seagrass',
    category: BlockCategory.TRANSPARENT,
    textures: 'seagrass.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.2, g: 0.5, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 0.8,
    icon: '/textures/block/seagrass.png',
    inventorySlot: null,
    categorySlot: 20
  },
  {
    id: 53,  // BlockType.kelp
    name: 'Kelp',
    category: BlockCategory.TRANSPARENT,
    textures: 'kelp.png',
    transparent: true,
    meshType: 'cross',
    baseColor: { r: 0.3, g: 0.5, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0,
    collidable: false,
    friction: 0.8,
    icon: '/textures/block/kelp.png',
    inventorySlot: null,
    categorySlot: 21
  },

  // ===== TREE VARIANTS =====
  {
    id: 54,  // BlockType.birch_log
    name: 'Birch Log',
    category: BlockCategory.WOOD,
    textures: ['birch_log.png', 'birch_log.png', 'birch_log_top.png', 'birch_log_top.png', 'birch_log.png', 'birch_log.png'],
    transparent: false,
    baseColor: { r: 0.9, g: 0.88, b: 0.82 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/birch_log.png',
    inventorySlot: null,
    categorySlot: 22
  },
  {
    id: 55,  // BlockType.spruce_log
    name: 'Spruce Log',
    category: BlockCategory.WOOD,
    textures: ['spruce_log.png', 'spruce_log.png', 'spruce_log_top.png', 'spruce_log_top.png', 'spruce_log.png', 'spruce_log.png'],
    transparent: false,
    baseColor: { r: 0.35, g: 0.25, b: 0.15 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/spruce_log.png',
    inventorySlot: null,
    categorySlot: 23
  },
  {
    id: 56,  // BlockType.jungle_log
    name: 'Jungle Log',
    category: BlockCategory.WOOD,
    textures: ['jungle_log.png', 'jungle_log.png', 'jungle_log_top.png', 'jungle_log_top.png', 'jungle_log.png', 'jungle_log.png'],
    transparent: false,
    baseColor: { r: 0.5, g: 0.4, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/jungle_log.png',
    inventorySlot: null,
    categorySlot: 24
  },
  {
    id: 57,  // BlockType.acacia_log
    name: 'Acacia Log',
    category: BlockCategory.WOOD,
    textures: ['acacia_log.png', 'acacia_log.png', 'acacia_log_top.png', 'acacia_log_top.png', 'acacia_log.png', 'acacia_log.png'],
    transparent: false,
    baseColor: { r: 0.55, g: 0.45, b: 0.35 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/acacia_log.png',
    inventorySlot: null,
    categorySlot: 25
  },
  {
    id: 58,  // BlockType.dark_oak_log
    name: 'Dark Oak Log',
    category: BlockCategory.WOOD,
    textures: ['dark_oak_log.png', 'dark_oak_log.png', 'dark_oak_log_top.png', 'dark_oak_log_top.png', 'dark_oak_log.png', 'dark_oak_log.png'],
    transparent: false,
    baseColor: { r: 0.25, g: 0.18, b: 0.1 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/dark_oak_log.png',
    inventorySlot: null,
    categorySlot: 26
  },
  {
    id: 59,  // BlockType.birch_leaves
    name: 'Birch Leaves',
    category: BlockCategory.TRANSPARENT,
    textures: 'birch_leaves.png',
    transparent: true,
    baseColor: { r: 0.5, g: 0.7, b: 0.4 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.2,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/birch_leaves.png',
    inventorySlot: null,
    categorySlot: 27
  },
  {
    id: 60,  // BlockType.spruce_leaves
    name: 'Spruce Leaves',
    category: BlockCategory.TRANSPARENT,
    textures: 'spruce_leaves.png',
    transparent: true,
    baseColor: { r: 0.25, g: 0.4, b: 0.3 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.2,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/spruce_leaves.png',
    inventorySlot: null,
    categorySlot: 28
  },
  {
    id: 61,  // BlockType.jungle_leaves
    name: 'Jungle Leaves',
    category: BlockCategory.TRANSPARENT,
    textures: 'jungle_leaves.png',
    transparent: true,
    baseColor: { r: 0.3, g: 0.55, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.2,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/jungle_leaves.png',
    inventorySlot: null,
    categorySlot: 29
  },
  {
    id: 62,  // BlockType.acacia_leaves
    name: 'Acacia Leaves',
    category: BlockCategory.TRANSPARENT,
    textures: 'acacia_leaves.png',
    transparent: true,
    baseColor: { r: 0.45, g: 0.55, b: 0.25 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.2,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/acacia_leaves.png',
    inventorySlot: null,
    categorySlot: 30
  },
  {
    id: 63,  // BlockType.dark_oak_leaves
    name: 'Dark Oak Leaves',
    category: BlockCategory.TRANSPARENT,
    textures: 'dark_oak_leaves.png',
    transparent: true,
    baseColor: { r: 0.2, g: 0.4, b: 0.15 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.3,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/dark_oak_leaves.png',
    inventorySlot: null,
    categorySlot: 31
  },

  // ===== CROPS/SPECIAL =====
  {
    id: 64,  // BlockType.pumpkin
    name: 'Pumpkin',
    category: BlockCategory.GROUND,
    // Face order: +X, -X, +Y (top), -Y (bottom), +Z, -Z
    textures: ['pumpkin_side.png', 'pumpkin_side.png', 'pumpkin_top.png', 'pumpkin_top.png', 'pumpkin_side.png', 'pumpkin_side.png'],
    transparent: false,
    baseColor: { r: 0.9, g: 0.5, b: 0.1 },  // Orange
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/pumpkin_side.png',
    inventorySlot: null,
    categorySlot: 32
  }
]
