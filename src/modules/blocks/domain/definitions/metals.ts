import { BlockDefinition, BlockCategory } from '../types'

export const METAL_BLOCKS: BlockDefinition[] = [
  {
    id: 8,  // BlockType.diamond
    name: 'Diamond Block',
    category: BlockCategory.METALS,
    textures: 'diamond_block.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/diamond.png',
    inventorySlot: 5,
    categorySlot: 1
  },

  {
    id: 9,  // BlockType.quartz
    name: 'Quartz Block',
    category: BlockCategory.METALS,
    textures: 'quartz_block_side.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/quartz.png',
    inventorySlot: 6,
    categorySlot: 2
  }
]
