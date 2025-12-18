import { BlockType } from '../../domain/BlockType'
import { SurfaceBiome, SurfaceBiomeType } from './BiomeTypes'

export const SURFACE_BIOMES: Record<SurfaceBiomeType, SurfaceBiome> = {
  // ===== TEMPERATE BIOMES =====
  [SurfaceBiomeType.PLAINS]: {
    type: SurfaceBiomeType.PLAINS,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.005,
    minTreeSpacing: 12,
    treeType: 'oak',
    grassDensity: 0.3,
    flowerDensity: 0.02,
    flowers: [BlockType.dandelion, BlockType.azure_bluet, BlockType.oxeye_daisy],
    allowPumpkins: true
  },

  [SurfaceBiomeType.FOREST]: {
    type: SurfaceBiomeType.FOREST,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.12,
    minTreeSpacing: 3,
    treeType: 'oak',
    grassDensity: 0.4,
    flowerDensity: 0.03,
    flowers: [BlockType.poppy, BlockType.lily_of_valley, BlockType.dandelion],
    allowPumpkins: true,
    mushroomDensity: 0.01
  },

  [SurfaceBiomeType.BIRCH_FOREST]: {
    type: SurfaceBiomeType.BIRCH_FOREST,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.1,
    minTreeSpacing: 4,
    treeType: 'birch',
    grassDensity: 0.35,
    flowerDensity: 0.04,
    flowers: [BlockType.lily_of_valley, BlockType.azure_bluet, BlockType.white_tulip]
  },

  [SurfaceBiomeType.DARK_FOREST]: {
    type: SurfaceBiomeType.DARK_FOREST,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 4,
    allowTrees: true,
    treeDensity: 0.25,
    minTreeSpacing: 2,
    treeType: 'dark_oak',
    grassDensity: 0.15,
    flowerDensity: 0.01,
    flowers: [BlockType.lily_of_valley],  // Only lily of the valley in dark forests
    mushroomDensity: 0.05  // Lots of mushrooms in dark forest
  },

  [SurfaceBiomeType.FLOWER_FOREST]: {
    type: SurfaceBiomeType.FLOWER_FOREST,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.08,
    minTreeSpacing: 5,
    treeType: 'oak',
    grassDensity: 0.5,
    flowerDensity: 0.25
    // No flowers array = uses ALL flower types (default behavior)
  },

  // ===== HOT/DRY BIOMES =====
  [SurfaceBiomeType.DESERT]: {
    type: SurfaceBiomeType.DESERT,
    surfaceBlock: BlockType.sand,
    subsurfaceBlock: BlockType.sandstone,
    subsurfaceDepth: 5,
    allowTrees: false,
    treeDensity: 0.002,  // Rare cacti
    minTreeSpacing: 20,
    grassDensity: 0,
    flowerDensity: 0
  },

  [SurfaceBiomeType.SAVANNA]: {
    type: SurfaceBiomeType.SAVANNA,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.02,
    minTreeSpacing: 10,
    treeType: 'acacia',
    grassDensity: 0.6,
    flowerDensity: 0.01,
    flowers: [BlockType.dandelion, BlockType.orange_tulip]  // Warm-colored flowers
  },

  [SurfaceBiomeType.BADLANDS]: {
    type: SurfaceBiomeType.BADLANDS,
    surfaceBlock: BlockType.terracotta,
    subsurfaceBlock: BlockType.terracotta,
    subsurfaceDepth: 8,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  // ===== COLD BIOMES =====
  [SurfaceBiomeType.TAIGA]: {
    type: SurfaceBiomeType.TAIGA,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.1,
    minTreeSpacing: 4,
    treeType: 'spruce',
    grassDensity: 0.25,
    flowerDensity: 0.02,
    flowers: [BlockType.dandelion, BlockType.poppy],  // Hardy flowers
    mushroomDensity: 0.02
  },

  [SurfaceBiomeType.SNOWY_TAIGA]: {
    type: SurfaceBiomeType.SNOWY_TAIGA,
    surfaceBlock: BlockType.snow,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.08,
    minTreeSpacing: 5,
    treeType: 'spruce',
    grassDensity: 0,
    flowerDensity: 0,
    allowSnow: true
  },

  [SurfaceBiomeType.SNOWY_PLAINS]: {
    type: SurfaceBiomeType.SNOWY_PLAINS,
    surfaceBlock: BlockType.snow,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: false,
    treeDensity: 0.002,
    minTreeSpacing: 15,
    treeType: 'spruce',
    grassDensity: 0,
    flowerDensity: 0,
    allowSnow: true
  },

  [SurfaceBiomeType.TUNDRA]: {
    type: SurfaceBiomeType.TUNDRA,
    surfaceBlock: BlockType.snow,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 2,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0,
    allowSnow: true
  },

  [SurfaceBiomeType.ICE_SPIKES]: {
    type: SurfaceBiomeType.ICE_SPIKES,
    surfaceBlock: BlockType.snow,
    subsurfaceBlock: BlockType.packed_ice,
    subsurfaceDepth: 4,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0,
    allowSnow: true
  },

  // ===== WET BIOMES =====
  [SurfaceBiomeType.SWAMP]: {
    type: SurfaceBiomeType.SWAMP,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 4,
    allowTrees: true,
    treeDensity: 0.06,
    minTreeSpacing: 6,
    treeType: 'oak',
    grassDensity: 0.5,
    flowerDensity: 0.01,
    flowers: [BlockType.blue_orchid],  // Blue orchids only in swamps
    waterColor: { r: 0.4, g: 0.5, b: 0.3 },  // Murky green
    mushroomDensity: 0.03  // Mushrooms thrive in swamps
  },

  [SurfaceBiomeType.MANGROVE_SWAMP]: {
    type: SurfaceBiomeType.MANGROVE_SWAMP,
    surfaceBlock: BlockType.dirt,
    subsurfaceBlock: BlockType.clay,
    subsurfaceDepth: 5,
    allowTrees: true,
    treeDensity: 0.15,
    minTreeSpacing: 3,
    treeType: 'mangrove',
    grassDensity: 0.2,
    flowerDensity: 0,
    waterColor: { r: 0.3, g: 0.5, b: 0.4 }
  },

  [SurfaceBiomeType.JUNGLE]: {
    type: SurfaceBiomeType.JUNGLE,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 4,
    allowTrees: true,
    treeDensity: 0.2,
    minTreeSpacing: 2,
    treeType: 'jungle',
    grassDensity: 0.7,
    flowerDensity: 0.05,
    flowers: [BlockType.blue_orchid, BlockType.allium, BlockType.pink_tulip]  // Tropical flowers
  },

  // ===== ELEVATED BIOMES =====
  [SurfaceBiomeType.MOUNTAINS]: {
    type: SurfaceBiomeType.MOUNTAINS,
    surfaceBlock: BlockType.stone,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 1,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  [SurfaceBiomeType.MEADOW]: {
    type: SurfaceBiomeType.MEADOW,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.01,
    minTreeSpacing: 15,
    treeType: 'oak',
    grassDensity: 0.8,
    flowerDensity: 0.15,
    flowers: [BlockType.dandelion, BlockType.cornflower, BlockType.oxeye_daisy, BlockType.azure_bluet]
  },

  [SurfaceBiomeType.GROVE]: {
    type: SurfaceBiomeType.GROVE,
    surfaceBlock: BlockType.snow,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.08,
    minTreeSpacing: 5,
    treeType: 'spruce',
    grassDensity: 0,
    flowerDensity: 0,
    allowSnow: true
  },

  [SurfaceBiomeType.SNOWY_SLOPES]: {
    type: SurfaceBiomeType.SNOWY_SLOPES,
    surfaceBlock: BlockType.snow,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 2,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0,
    allowSnow: true
  },

  [SurfaceBiomeType.JAGGED_PEAKS]: {
    type: SurfaceBiomeType.JAGGED_PEAKS,
    surfaceBlock: BlockType.stone,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 1,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  [SurfaceBiomeType.FROZEN_PEAKS]: {
    type: SurfaceBiomeType.FROZEN_PEAKS,
    surfaceBlock: BlockType.snow,
    subsurfaceBlock: BlockType.packed_ice,
    subsurfaceDepth: 3,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0,
    allowSnow: true
  },

  [SurfaceBiomeType.STONY_PEAKS]: {
    type: SurfaceBiomeType.STONY_PEAKS,
    surfaceBlock: BlockType.stone,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 1,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  // ===== COASTAL/WATER BIOMES =====
  [SurfaceBiomeType.BEACH]: {
    type: SurfaceBiomeType.BEACH,
    surfaceBlock: BlockType.sand,
    subsurfaceBlock: BlockType.sand,
    subsurfaceDepth: 4,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  [SurfaceBiomeType.STONY_SHORE]: {
    type: SurfaceBiomeType.STONY_SHORE,
    surfaceBlock: BlockType.stone,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 2,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  [SurfaceBiomeType.OCEAN]: {
    type: SurfaceBiomeType.OCEAN,
    surfaceBlock: BlockType.gravel,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 3,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  [SurfaceBiomeType.DEEP_OCEAN]: {
    type: SurfaceBiomeType.DEEP_OCEAN,
    surfaceBlock: BlockType.gravel,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 4,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  [SurfaceBiomeType.WARM_OCEAN]: {
    type: SurfaceBiomeType.WARM_OCEAN,
    surfaceBlock: BlockType.sand,
    subsurfaceBlock: BlockType.sandstone,
    subsurfaceDepth: 3,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0,
    waterColor: { r: 0.3, g: 0.7, b: 0.8 }  // Tropical blue
  },

  [SurfaceBiomeType.FROZEN_OCEAN]: {
    type: SurfaceBiomeType.FROZEN_OCEAN,
    surfaceBlock: BlockType.gravel,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 3,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0,
    waterColor: { r: 0.3, g: 0.4, b: 0.6 }
  },

  [SurfaceBiomeType.RIVER]: {
    type: SurfaceBiomeType.RIVER,
    surfaceBlock: BlockType.sand,
    subsurfaceBlock: BlockType.clay,
    subsurfaceDepth: 3,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0
  },

  // ===== SPECIAL BIOMES =====
  [SurfaceBiomeType.MUSHROOM_FIELDS]: {
    type: SurfaceBiomeType.MUSHROOM_FIELDS,
    surfaceBlock: BlockType.mycelium,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 4,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0,
    grassDensity: 0,
    flowerDensity: 0,
    mushroomDensity: 0.15  // Lots of mushrooms!
  }
}

/**
 * Get surface biome based on climate parameters and terrain
 * Uses Minecraft-style multi-parameter selection
 */
export function getSurfaceBiome(temp: number, humidity: number, elevation: number): SurfaceBiome {
  const SEA_LEVEL = 63

  // ===== WATER/OCEAN BIOMES (below sea level) =====
  if (elevation < SEA_LEVEL - 15) {
    // Deep underwater
    if (temp > 0.5) return SURFACE_BIOMES[SurfaceBiomeType.WARM_OCEAN]
    if (temp < -0.5) return SURFACE_BIOMES[SurfaceBiomeType.FROZEN_OCEAN]
    return SURFACE_BIOMES[SurfaceBiomeType.DEEP_OCEAN]
  }

  if (elevation < SEA_LEVEL - 3) {
    // Shallow underwater
    if (temp > 0.5) return SURFACE_BIOMES[SurfaceBiomeType.WARM_OCEAN]
    if (temp < -0.5) return SURFACE_BIOMES[SurfaceBiomeType.FROZEN_OCEAN]
    return SURFACE_BIOMES[SurfaceBiomeType.OCEAN]
  }

  // ===== COASTAL BIOMES (near sea level) =====
  if (elevation < SEA_LEVEL + 5) {
    // Beach zone
    if (temp < -0.4) return SURFACE_BIOMES[SurfaceBiomeType.SNOWY_PLAINS]
    if (humidity > 0.6) return SURFACE_BIOMES[SurfaceBiomeType.MANGROVE_SWAMP]
    return SURFACE_BIOMES[SurfaceBiomeType.BEACH]
  }

  // ===== HIGH ELEVATION BIOMES (mountains) =====
  // Adjusted thresholds to match actual terrain (max ~95-125 on volcano peaks)
  if (elevation > 95) {
    // Extreme peaks (volcano tops, rare mountain peaks)
    if (temp < -0.3) return SURFACE_BIOMES[SurfaceBiomeType.FROZEN_PEAKS]
    if (temp < 0.3) return SURFACE_BIOMES[SurfaceBiomeType.JAGGED_PEAKS]
    return SURFACE_BIOMES[SurfaceBiomeType.STONY_PEAKS]
  }

  if (elevation > 85) {
    // High mountains (upper volcano slopes, mountain ridges)
    if (temp < -0.2) return SURFACE_BIOMES[SurfaceBiomeType.SNOWY_SLOPES]
    if (temp < 0.3) return SURFACE_BIOMES[SurfaceBiomeType.GROVE]
    return SURFACE_BIOMES[SurfaceBiomeType.MOUNTAINS]
  }

  if (elevation > 78) {
    // Mountain meadows (mid-elevation grassy slopes)
    if (temp < -0.3) return SURFACE_BIOMES[SurfaceBiomeType.SNOWY_SLOPES]
    return SURFACE_BIOMES[SurfaceBiomeType.MEADOW]
  }

  if (elevation > 72) {
    // High hills (transition zone - mix of grass and occasional stone)
    if (temp < -0.3) return SURFACE_BIOMES[SurfaceBiomeType.GROVE]
    if (humidity > 0.3) return SURFACE_BIOMES[SurfaceBiomeType.FOREST]
    return SURFACE_BIOMES[SurfaceBiomeType.PLAINS]
  }

  // ===== TEMPERATURE-BASED LOWLAND BIOMES =====

  // FROZEN (temp < -0.4)
  if (temp < -0.4) {
    if (humidity > 0.3) return SURFACE_BIOMES[SurfaceBiomeType.SNOWY_TAIGA]
    if (humidity < -0.3) return SURFACE_BIOMES[SurfaceBiomeType.ICE_SPIKES]
    return SURFACE_BIOMES[SurfaceBiomeType.SNOWY_PLAINS]
  }

  // COLD (-0.4 to -0.1)
  if (temp < -0.1) {
    if (humidity > 0.4) return SURFACE_BIOMES[SurfaceBiomeType.TAIGA]
    if (humidity < -0.2) return SURFACE_BIOMES[SurfaceBiomeType.TUNDRA]
    return SURFACE_BIOMES[SurfaceBiomeType.TAIGA]
  }

  // TEMPERATE (-0.1 to 0.4)
  if (temp < 0.4) {
    if (humidity > 0.6) return SURFACE_BIOMES[SurfaceBiomeType.SWAMP]
    if (humidity > 0.4) return SURFACE_BIOMES[SurfaceBiomeType.DARK_FOREST]
    if (humidity > 0.2) return SURFACE_BIOMES[SurfaceBiomeType.FOREST]
    if (humidity > 0.0) return SURFACE_BIOMES[SurfaceBiomeType.BIRCH_FOREST]
    if (humidity > -0.3) return SURFACE_BIOMES[SurfaceBiomeType.PLAINS]
    return SURFACE_BIOMES[SurfaceBiomeType.FLOWER_FOREST]
  }

  // WARM (0.4 to 0.7)
  if (temp < 0.7) {
    if (humidity > 0.5) return SURFACE_BIOMES[SurfaceBiomeType.JUNGLE]
    if (humidity > 0.0) return SURFACE_BIOMES[SurfaceBiomeType.SAVANNA]
    return SURFACE_BIOMES[SurfaceBiomeType.DESERT]
  }

  // HOT (temp >= 0.7)
  if (humidity > 0.3) return SURFACE_BIOMES[SurfaceBiomeType.JUNGLE]
  if (humidity > -0.2) return SURFACE_BIOMES[SurfaceBiomeType.BADLANDS]
  return SURFACE_BIOMES[SurfaceBiomeType.DESERT]
}
