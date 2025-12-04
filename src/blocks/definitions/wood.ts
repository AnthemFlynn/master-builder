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
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.5,  // Partially transparent to light
    collidable: true,
    friction: 0.8,  // Slightly impedes movement
    icon: 'block-icon/leaf.png',
    inventorySlot: null,
    categorySlot: 1
  }
]
