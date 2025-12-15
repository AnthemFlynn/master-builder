import { BlockType } from '../../domain/BlockType'

export enum SurfaceBiomeType {
  PLAINS = 'plains',
  FOREST = 'forest',
  DESERT = 'desert',
  MOUNTAINS = 'mountains',
  TUNDRA = 'tundra'
}

export enum UndergroundBiomeType {
  DRIPSTONE_CAVES = 'dripstone_caves',
  ICE_CAVES = 'ice_caves',
  LUSH_CAVES = 'lush_caves'
}

export interface SurfaceBiome {
  type: SurfaceBiomeType
  surfaceBlock: BlockType
  subsurfaceBlock: BlockType
  subsurfaceDepth: number
  allowTrees: boolean
  treeDensity: number
  minTreeSpacing: number
}

export interface UndergroundBiome {
  type: UndergroundBiomeType
  floorBlock: BlockType
  formationMaterial: BlockType
  allowStalactites: boolean
  formationDensity: number
}
