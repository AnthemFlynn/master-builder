import { BlockDefinition, BlockCategory } from '../types'

export const ILLUMINATION_BLOCKS: BlockDefinition[] = [
  {
    id: 10,  // BlockType.glowstone
    name: 'Glowstone',
    category: BlockCategory.ILLUMINATION,
    textures: 'glowstone.png',
    transparent: false,
    emissive: { r: 15, g: 13, b: 8 },  // Warm yellow-orange
    lightAbsorption: 0.0,  // Transparent to light
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/glowstone.png',
    inventorySlot: 8,
    categorySlot: 1
  },

  {
    id: 13,  // BlockType.redstone_lamp
    name: 'Redstone Lamp',
    category: BlockCategory.ILLUMINATION,
    textures: 'redstone_lamp_on.png',
    transparent: false,
    emissive: { r: 15, g: 4, b: 4 },  // Red glow
    lightAbsorption: 0.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/redstone_lamp_on.png',
    inventorySlot: 9,
    categorySlot: 2
  },

  {
    id: 65,  // BlockType.jack_o_lantern
    name: 'Jack o\'Lantern',
    category: BlockCategory.ILLUMINATION,
    textures: {
      top: 'pumpkin_top.png',
      bottom: 'pumpkin_top.png',
      sides: 'jack_o_lantern.png'
    },
    transparent: false,
    emissive: { r: 15, g: 12, b: 4 },  // Warm orange glow
    lightAbsorption: 0.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/jack_o_lantern.png',
    inventorySlot: 10,
    categorySlot: 3
  }
]
