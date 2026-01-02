import { BlockDefinition, BlockCategory } from '../types'

export const AIR_BLOCKS: BlockDefinition[] = [
  {
    id: 0,
    name: 'Air',
    category: BlockCategory.TRANSPARENT,
    textures: '', // No texture
    transparent: true,
    collidable: false,
    lightAbsorption: 0, // Does not absorb light
    emissive: { r: 0, g: 0, b: 0 }
  }
]
