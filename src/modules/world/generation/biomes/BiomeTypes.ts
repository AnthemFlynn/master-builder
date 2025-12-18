import { BlockType } from '../../domain/BlockType'

export enum SurfaceBiomeType {
  // Temperate
  PLAINS = 'plains',
  FOREST = 'forest',
  BIRCH_FOREST = 'birch_forest',
  DARK_FOREST = 'dark_forest',
  FLOWER_FOREST = 'flower_forest',

  // Hot/Dry
  DESERT = 'desert',
  SAVANNA = 'savanna',
  BADLANDS = 'badlands',

  // Cold
  TAIGA = 'taiga',
  SNOWY_TAIGA = 'snowy_taiga',
  SNOWY_PLAINS = 'snowy_plains',
  TUNDRA = 'tundra',
  ICE_SPIKES = 'ice_spikes',

  // Wet
  SWAMP = 'swamp',
  MANGROVE_SWAMP = 'mangrove_swamp',
  JUNGLE = 'jungle',

  // Elevated
  MOUNTAINS = 'mountains',
  MEADOW = 'meadow',
  GROVE = 'grove',
  SNOWY_SLOPES = 'snowy_slopes',
  JAGGED_PEAKS = 'jagged_peaks',
  FROZEN_PEAKS = 'frozen_peaks',
  STONY_PEAKS = 'stony_peaks',

  // Coastal/Water
  BEACH = 'beach',
  STONY_SHORE = 'stony_shore',
  OCEAN = 'ocean',
  DEEP_OCEAN = 'deep_ocean',
  WARM_OCEAN = 'warm_ocean',
  FROZEN_OCEAN = 'frozen_ocean',
  RIVER = 'river',

  // Special
  MUSHROOM_FIELDS = 'mushroom_fields'
}

export enum UndergroundBiomeType {
  DRIPSTONE_CAVES = 'dripstone_caves',
  ICE_CAVES = 'ice_caves',
  LUSH_CAVES = 'lush_caves',
  DEEP_DARK = 'deep_dark'
}

export interface SurfaceBiome {
  type: SurfaceBiomeType
  surfaceBlock: BlockType
  subsurfaceBlock: BlockType
  subsurfaceDepth: number
  allowTrees: boolean
  treeDensity: number      // 0-1 (0.02 = 2% chance per valid position)
  minTreeSpacing: number   // Minimum blocks between trees
  // New properties for rich biomes
  treeType?: 'oak' | 'birch' | 'spruce' | 'jungle' | 'acacia' | 'dark_oak' | 'mangrove'
  grassDensity?: number    // 0-1 (tall grass coverage)
  flowerDensity?: number   // 0-1 (flower coverage)
  flowers?: BlockType[]    // Specific flower types for this biome (if empty, uses default set)
  allowSnow?: boolean      // Snow layer on top
  waterColor?: { r: number, g: number, b: number }  // Biome water tint
  allowPumpkins?: boolean  // Can pumpkins spawn here
  mushroomDensity?: number // 0-1 (mushroom coverage, separate from humidity-based)
}

export interface UndergroundBiome {
  type: UndergroundBiomeType
  floorBlock: BlockType
  formationMaterial: BlockType
  allowStalactites: boolean
  formationDensity: number
}
