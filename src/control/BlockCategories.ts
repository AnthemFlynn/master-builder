import { BlockType } from '../terrain'

export interface BlockCategory {
  key: string
  name: string
  blocks: BlockType[]
}

export const BLOCK_CATEGORIES: Record<string, BlockCategory> = {
  'g': {
    key: 'G',
    name: 'Ground',
    blocks: [
      BlockType.grass,
      BlockType.dirt,
      BlockType.sand,
      BlockType.grass, // TODO: Add gravel
      BlockType.grass, // TODO: Add clay
      BlockType.grass, // TODO: Add mycelium
      BlockType.grass, // TODO: Add podzol
      BlockType.grass, // TODO: Add soul sand
      BlockType.grass  // TODO: Add farmland
    ]
  },
  's': {
    key: 'S',
    name: 'Stone',
    blocks: [
      BlockType.stone,
      BlockType.stone, // TODO: Add cobblestone
      BlockType.stone, // TODO: Add stone bricks
      BlockType.stone, // TODO: Add andesite
      BlockType.stone, // TODO: Add diorite
      BlockType.stone, // TODO: Add granite
      BlockType.stone, // TODO: Add sandstone
      BlockType.stone, // TODO: Add red sandstone
      BlockType.stone  // TODO: Add obsidian
    ]
  },
  'w': {
    key: 'W',
    name: 'Wood',
    blocks: [
      BlockType.wood,  // Oak planks
      BlockType.tree,  // Oak log
      BlockType.wood,  // TODO: Add birch planks
      BlockType.wood,  // TODO: Add spruce planks
      BlockType.wood,  // TODO: Add jungle planks
      BlockType.wood,  // TODO: Add dark oak planks
      BlockType.wood,  // TODO: Add acacia planks
      BlockType.tree,  // TODO: Add stripped oak
      BlockType.wood   // TODO: Add bookshelf
    ]
  },
  'i': {
    key: 'I',
    name: 'Illumination',
    blocks: [
      BlockType.glowstone,
      BlockType.redstone_lamp,
      BlockType.glowstone, // TODO: Add beacon
      BlockType.glowstone, // TODO: Add jack o'lantern
      BlockType.glowstone, // TODO: Add magma block
      BlockType.glowstone, // TODO: Add end rod
      BlockType.glowstone,
      BlockType.glowstone,
      BlockType.glowstone
    ]
  },
  'm': {
    key: 'M',
    name: 'Metals',
    blocks: [
      BlockType.diamond,
      BlockType.diamond, // TODO: Add gold block
      BlockType.diamond, // TODO: Add iron block
      BlockType.diamond, // TODO: Add emerald block
      BlockType.diamond, // TODO: Add redstone block
      BlockType.diamond, // TODO: Add lapis block
      BlockType.coal,
      BlockType.quartz,
      BlockType.diamond
    ]
  },
  't': {
    key: 'T',
    name: 'Transparent',
    blocks: [
      BlockType.glass,
      BlockType.glass, // TODO: Add ice
      BlockType.glass, // TODO: Add packed ice
      BlockType.glass, // TODO: Add slime block
      BlockType.glass,
      BlockType.glass,
      BlockType.glass,
      BlockType.glass,
      BlockType.glass
    ]
  }
}

// Helper to get block from category and number
export function getBlockFromCategory(categoryKey: string, number: number): BlockType | null {
  const category = BLOCK_CATEGORIES[categoryKey.toLowerCase()]
  if (!category) return null
  if (number < 1 || number > 9) return null
  return category.blocks[number - 1]
}

// Helper to get category name
export function getCategoryName(categoryKey: string): string {
  const category = BLOCK_CATEGORIES[categoryKey.toLowerCase()]
  return category?.name || 'Unknown'
}
