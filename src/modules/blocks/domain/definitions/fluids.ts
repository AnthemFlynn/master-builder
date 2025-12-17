import { BlockDefinition, BlockCategory } from '../types'

export const FLUID_BLOCKS: BlockDefinition[] = [
  {
    id: 16,  // BlockType.water
    name: 'Water',
    category: BlockCategory.FLUIDS,
    textures: 'water.png',
    transparent: true,
    baseColor: { r: 0.2, g: 0.4, b: 0.9 },  // Blue water
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.15,  // Water slightly absorbs light
    collidable: false,  // Player can swim through
    friction: 0.5,  // Slower movement in water
    icon: '/textures/block/water.png',
    inventorySlot: null,
    categorySlot: 1
  }
]
