import { BiomeDefinition } from './types'
import { BlockType } from '../BlockType'

export const PLAINS_BIOME: BiomeDefinition = {
  id: 'plains',
  name: 'Plains',
  temperature: 0.5,
  humidity: 0.5,
  terrain: {
    baseHeight: 30,
    heightVariance: 10,
    roughness: 0.005, // Very smooth
    caveDensity: 0.3
  },
  surfaceBlock: BlockType.grass,
  subSurfaceBlock: BlockType.dirt,
  stoneBlock: BlockType.stone,
  colors: {
    grass: 0x77cc55,
    sky: 0x87ceeb,
    water: 0x4444ff
  }
}

export const DESERT_BIOME: BiomeDefinition = {
  id: 'desert',
  name: 'Desert',
  temperature: 0.9,
  humidity: 0.1,
  terrain: {
    baseHeight: 35,
    heightVariance: 5,
    roughness: 0.01, // Dunes
    caveDensity: 0.2
  },
  surfaceBlock: BlockType.sand,
  subSurfaceBlock: BlockType.sand,
  stoneBlock: BlockType.stone, // Sandstone ideally
  colors: {
    grass: 0xbfb755, // Dry grass color
    sky: 0xead6c8,
    water: 0x3333dd
  }
}

export const MOUNTAINS_BIOME: BiomeDefinition = {
  id: 'mountains',
  name: 'Mountains',
  temperature: 0.2,
  humidity: 0.4,
  terrain: {
    baseHeight: 60,
    heightVariance: 80, // Very tall peaks
    roughness: 0.03, // Jagged
    caveDensity: 0.6 // Lots of caves
  },
  surfaceBlock: BlockType.stone, // Bare rock
  subSurfaceBlock: BlockType.stone,
  stoneBlock: BlockType.stone,
  colors: {
    grass: 0x55aa55,
    sky: 0x87ceeb,
    water: 0x0000ff
  }
}
