import { BlockType } from '../../domain/BlockType'
import { SurfaceBiome, SurfaceBiomeType } from './BiomeTypes'

export const SURFACE_BIOMES: Record<SurfaceBiomeType, SurfaceBiome> = {
  [SurfaceBiomeType.PLAINS]: {
    type: SurfaceBiomeType.PLAINS,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.001,  // RARE (original 0.0015) - dramatic when found
    minTreeSpacing: 20
  },

  [SurfaceBiomeType.FOREST]: {
    type: SurfaceBiomeType.FOREST,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.003,  // Still rare but forests have more
    minTreeSpacing: 15
  },

  [SurfaceBiomeType.DESERT]: {
    type: SurfaceBiomeType.DESERT,
    surfaceBlock: BlockType.sand,
    subsurfaceBlock: BlockType.sand,
    subsurfaceDepth: 5,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0
  },

  [SurfaceBiomeType.MOUNTAINS]: {
    type: SurfaceBiomeType.MOUNTAINS,
    surfaceBlock: BlockType.stone,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 1,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0
  },

  [SurfaceBiomeType.TUNDRA]: {
    type: SurfaceBiomeType.TUNDRA,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 2,
    allowTrees: true,
    treeDensity: 0.01,  // Very sparse
    minTreeSpacing: 8
  }
}

export function getSurfaceBiome(temp: number, humidity: number, elevation: number): SurfaceBiome {
  // High elevation override
  if (elevation > 80) return SURFACE_BIOMES[SurfaceBiomeType.MOUNTAINS]

  // Temperature-humidity matrix
  if (temp > 0.6 && humidity < -0.3) return SURFACE_BIOMES[SurfaceBiomeType.DESERT]
  if (temp < -0.4) return SURFACE_BIOMES[SurfaceBiomeType.TUNDRA]
  if (humidity > 0.3) return SURFACE_BIOMES[SurfaceBiomeType.FOREST]

  return SURFACE_BIOMES[SurfaceBiomeType.PLAINS]
}
