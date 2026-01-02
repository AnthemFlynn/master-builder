import { BlockType } from '../../domain/BlockType'
import { UndergroundBiome, UndergroundBiomeType } from './BiomeTypes'

export const UNDERGROUND_BIOMES: Record<UndergroundBiomeType, UndergroundBiome> = {
  [UndergroundBiomeType.DRIPSTONE_CAVES]: {
    type: UndergroundBiomeType.DRIPSTONE_CAVES,
    floorBlock: BlockType.stone,
    formationMaterial: BlockType.stone,
    allowStalactites: true,
    formationDensity: 0.1
  },

  [UndergroundBiomeType.ICE_CAVES]: {
    type: UndergroundBiomeType.ICE_CAVES,
    floorBlock: BlockType.packed_ice,
    formationMaterial: BlockType.ice,
    allowStalactites: true,
    formationDensity: 0.15
  },

  [UndergroundBiomeType.LUSH_CAVES]: {
    type: UndergroundBiomeType.LUSH_CAVES,
    floorBlock: BlockType.dirt,
    formationMaterial: BlockType.glowstone,
    allowStalactites: false,
    formationDensity: 0.05
  },

  [UndergroundBiomeType.DEEP_DARK]: {
    type: UndergroundBiomeType.DEEP_DARK,
    floorBlock: BlockType.stone,
    formationMaterial: BlockType.obsidian,
    allowStalactites: false,
    formationDensity: 0.02
  }
}

export function getUndergroundBiome(temp: number, humidity: number): UndergroundBiome {
  if (temp < -0.5) return UNDERGROUND_BIOMES[UndergroundBiomeType.ICE_CAVES]
  if (humidity > 0.6) return UNDERGROUND_BIOMES[UndergroundBiomeType.LUSH_CAVES]
  return UNDERGROUND_BIOMES[UndergroundBiomeType.DRIPSTONE_CAVES]
}
