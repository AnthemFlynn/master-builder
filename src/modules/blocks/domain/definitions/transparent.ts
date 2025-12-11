import { BlockDefinition, BlockCategory } from '../types'

export const TRANSPARENT_BLOCKS: BlockDefinition[] = [
  {
    id: 10,  // BlockType.glass
    name: 'Glass',
    category: BlockCategory.TRANSPARENT,
    textures: 'glass.png',
    transparent: true,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.0,  // Glass is fully transparent to light
    collidable: true,
    friction: 1.0,
    icon: 'textures/block/glass.png',
    inventorySlot: 7,
    categorySlot: 2
  }
]
