import { BlockType } from './BlockType'

export class MaterialRegistry {
  private nameToBlockType = new Map<string, BlockType>([
    // Direct mappings (current 16 blocks)
    ['air', BlockType.air],
    ['sand', BlockType.sand],
    ['tree', BlockType.tree],
    ['leaf', BlockType.leaf],
    ['dirt', BlockType.dirt],
    ['stone', BlockType.stone],
    ['coal', BlockType.coal],
    ['wood', BlockType.wood],
    ['diamond', BlockType.diamond],
    ['gold', BlockType.gold],
    ['glowstone', BlockType.glowstone],
    ['bedrock', BlockType.bedrock],
    ['glass', BlockType.glass],
    ['redstone_lamp', BlockType.redstone_lamp],
    ['grass', BlockType.grass],
    ['obsidian', BlockType.obsidian],

    // Aliases for schema compatibility
    ['grass_green', BlockType.grass],
    ['soil_temperate', BlockType.dirt],
    ['granite', BlockType.stone],
    ['sand_yellow', BlockType.sand],
    ['water_ocean', BlockType.glass]  // Temporary until water block
  ])

  resolve(materialName: string): BlockType {
    const blockType = this.nameToBlockType.get(materialName)
    if (blockType === undefined) {
      console.warn(`Material '${materialName}' not found, using stone as fallback`)
      return BlockType.stone
    }
    return blockType
  }

  register(name: string, blockType: BlockType): void {
    this.nameToBlockType.set(name, blockType)
  }
}

// Singleton instance
export const materialRegistry = new MaterialRegistry()

// Helper function for generators
export function resolveBlockType(materialName: string): BlockType {
  return materialRegistry.resolve(materialName)
}
