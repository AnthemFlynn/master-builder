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
