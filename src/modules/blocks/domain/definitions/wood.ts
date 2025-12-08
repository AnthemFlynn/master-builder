import { BlockDefinition, BlockCategory } from '../types'

export const WOOD_BLOCKS: BlockDefinition[] = [
  {
    id: 2,  // BlockType.tree
    name: 'Oak Log',
    category: BlockCategory.WOOD,
    textures: [
      'oak_log.png',      // +X face
      'oak_log.png',      // -X face
      'oak_log_top.png',  // +Y face (top)
      'oak_log_top.png',  // -Y face (bottom)
      'oak_log.png',      // +Z face
      'oak_log.png'       // -Z face
    ],
    transparent: false,
    baseColor: { r: 0.6, g: 0.4, b: 0.2 },
    faceColors: {
      top: { r: 0.65, g: 0.45, b: 0.25 },
      bottom: { r: 0.45, g: 0.3, b: 0.15 },
      side: { r: 0.55, g: 0.35, b: 0.2 }
    },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/tree.png',
    inventorySlot: 3,
    categorySlot: 1
  },

  {
    id: 7,  // BlockType.wood
    name: 'Oak Planks',
    category: BlockCategory.WOOD,
    textures: 'oak_planks.png',
    transparent: false,
    baseColor: { r: 0.75, g: 0.5, b: 0.3 },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/wood.png',
    inventorySlot: 4,
    categorySlot: 2
  },

  {
    id: 3,  // BlockType.leaf
    name: 'Oak Leaves',
    category: BlockCategory.TRANSPARENT,  // Leaves are transparent
    textures: 'oak_leaves.png',
    transparent: true,
    baseColor: { r: 0.3, g: 0.65, b: 0.3 },
    faceColors: {
      top: { r: 0.35, g: 0.75, b: 0.35 },
      side: { r: 0.3, g: 0.65, b: 0.3 },
      bottom: { r: 0.25, g: 0.55, b: 0.25 }
    },
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.2, // Allow light to penetrate (tuned for darker shadows)
    transparent: true,
    collidable: true,
    friction: 0.8,  // Slightly impedes movement
    icon: 'block-icon/leaf.png',
    inventorySlot: null,
    categorySlot: 1
  }
]
