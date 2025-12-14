import { BlockType } from './BlockType'

export interface BiomeDefinition {
  id: string
  name: string
  surfaceBlock: BlockType
  subsurfaceBlock: BlockType
  fillerBlock: BlockType
  minHeightOffset: number
  maxHeightOffset: number
  decoration?: {
    treeDensity?: number  // 0-1 chance per column
    treeTypes?: Array<{ trunk: BlockType, leaves: BlockType, minHeight: number, maxHeight: number }>
    groundCoverDensity?: number
    rockDensity?: number
  }
}

export interface WorldPreset {
  id: string
  name: string
  seedOffset: number
  baseHeight: number
  heightVariation: number
  detailVariation: number
  biomeNoiseScale: number
  waterLevel: number
  biomes: BiomeDefinition[]
  defaultLightingHour: number
}

export const WORLD_PRESETS: Record<string, WorldPreset> = {
  test_complex: {
    id: 'test_complex',
    name: 'Complex Test World',
    seedOffset: 777,
    baseHeight: 35,
    heightVariation: 28,  // Rolling hills and valleys
    detailVariation: 6,   // Detailed terrain features
    biomeNoiseScale: 50,  // Medium-sized biomes
    waterLevel: 28,       // Some water bodies
    defaultLightingHour: 12,
    biomes: [
      {
        id: 'grassland',
        name: 'Grassland',
        surfaceBlock: BlockType.grass,
        subsurfaceBlock: BlockType.dirt,
        fillerBlock: BlockType.stone,
        minHeightOffset: -8,
        maxHeightOffset: 12,
        decoration: {
          treeDensity: 0.04,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 5, maxHeight: 9 }
          ],
          rockDensity: 0.05
        }
      },
      {
        id: 'desert',
        name: 'Desert',
        surfaceBlock: BlockType.sand,
        subsurfaceBlock: BlockType.sand,
        fillerBlock: BlockType.dirt,
        minHeightOffset: -12,
        maxHeightOffset: 8,
        decoration: {
          treeDensity: 0.01,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 3, maxHeight: 5 }
          ],
          rockDensity: 0.15
        }
      },
      {
        id: 'rocky_hills',
        name: 'Rocky Hills',
        surfaceBlock: BlockType.stone,
        subsurfaceBlock: BlockType.stone,
        fillerBlock: BlockType.stone,
        minHeightOffset: 4,
        maxHeightOffset: 18,
        decoration: {
          treeDensity: 0.02,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 4, maxHeight: 6 }
          ],
          rockDensity: 0.25
        }
      },
      {
        id: 'plains',
        name: 'Plains',
        surfaceBlock: BlockType.grass,
        subsurfaceBlock: BlockType.dirt,
        fillerBlock: BlockType.dirt,
        minHeightOffset: -6,
        maxHeightOffset: 4,
        decoration: {
          treeDensity: 0.02,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 6, maxHeight: 8 }
          ],
          rockDensity: 0.03
        }
      }
    ]
  },
  canyon: {
    id: 'canyon',
    name: 'Grand Canyon',
    seedOffset: 1337,
    baseHeight: 28,
    heightVariation: 24,
    detailVariation: 4,
    biomeNoiseScale: 80,
    waterLevel: 20,
    defaultLightingHour: 12,
    biomes: [
      {
        id: 'canyon-plateau',
        name: 'Canyon Plateau',
        surfaceBlock: BlockType.sand,
        subsurfaceBlock: BlockType.dirt,
        fillerBlock: BlockType.stone,
        minHeightOffset: -4,
        maxHeightOffset: 12,
        decoration: {
          treeDensity: 0.01,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 4, maxHeight: 6 }
          ],
          rockDensity: 0.12
        }
      },
      {
        id: 'canyon-scrub',
        name: 'Scrub Canyon',
        surfaceBlock: BlockType.grass,
        subsurfaceBlock: BlockType.dirt,
        fillerBlock: BlockType.stone,
        minHeightOffset: -8,
        maxHeightOffset: 4,
        decoration: {
          treeDensity: 0.02,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 5, maxHeight: 7 }
          ],
          rockDensity: 0.08
        }
      }
    ]
  },
  island: {
    id: 'island',
    name: 'Tropical Island',
    seedOffset: 4242,
    baseHeight: 25,
    heightVariation: 12,
    detailVariation: 6,
    biomeNoiseScale: 60,
    waterLevel: 18,
    defaultLightingHour: 12,
    biomes: [
      {
        id: 'beach',
        name: 'Beach',
        surfaceBlock: BlockType.sand,
        subsurfaceBlock: BlockType.sand,
        fillerBlock: BlockType.dirt,
        minHeightOffset: -6,
        maxHeightOffset: 2,
        decoration: {
          treeDensity: 0.01,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 5, maxHeight: 7 }
          ],
          rockDensity: 0.02
        }
      },
      {
        id: 'jungle',
        name: 'Jungle',
        surfaceBlock: BlockType.grass,
        subsurfaceBlock: BlockType.dirt,
        fillerBlock: BlockType.stone,
        minHeightOffset: 0,
        maxHeightOffset: 10,
        decoration: {
          treeDensity: 0.05,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 6, maxHeight: 10 }
          ],
          rockDensity: 0.05
        }
      },
      {
        id: 'volcanic',
        name: 'Volcanic Core',
        surfaceBlock: BlockType.stone,
        subsurfaceBlock: BlockType.stone,
        fillerBlock: BlockType.stone,
        minHeightOffset: 4,
        maxHeightOffset: 14,
        decoration: {
          treeDensity: 0,
          treeTypes: [],
          rockDensity: 0.2
        }
      }
    ]
  },
  mountains: {
    id: 'mountains',
    name: 'Mountain Range',
    seedOffset: 999,
    baseHeight: 35,
    heightVariation: 32,
    detailVariation: 8,
    biomeNoiseScale: 100,
    waterLevel: 24,
    defaultLightingHour: 12,
    biomes: [
      {
        id: 'alpine',
        name: 'Alpine',
        surfaceBlock: BlockType.grass,
        subsurfaceBlock: BlockType.dirt,
        fillerBlock: BlockType.stone,
        minHeightOffset: -6,
        maxHeightOffset: 14,
        decoration: {
          treeDensity: 0.03,
          treeTypes: [
            { trunk: BlockType.tree, leaves: BlockType.leaf, minHeight: 5, maxHeight: 8 }
          ],
          rockDensity: 0.15
        }
      }
    ]
  }
}

export function getWorldPreset(id: string): WorldPreset {
  return WORLD_PRESETS[id] ?? WORLD_PRESETS.canyon
}
