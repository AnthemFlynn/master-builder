import { BlockType } from '../BlockType'

export interface TerrainParameters {
  baseHeight: number      // Average height (e.g. 30 for plains, 80 for mountains)
  heightVariance: number  // How bumpy it is (e.g. 5 for plains, 50 for mountains)
  roughness: number       // Noise frequency (0.01 smooth, 0.05 jagged)
  caveDensity: number     // 0.0 to 1.0 (0 = no caves)
}

export interface BiomeColors {
  grass: number // Hex color (e.g. 0x55ff55)
  sky: number   // Hex color
  water: number // Hex color
}

export interface BiomeDefinition {
  id: string
  name: string
  
  // Placement criteria (Noise map targets)
  temperature: number // 0.0 (Cold) to 1.0 (Hot)
  humidity: number    // 0.0 (Dry) to 1.0 (Wet)
  
  // Generation rules
  terrain: TerrainParameters
  
  // Block Palette
  surfaceBlock: BlockType  // e.g. Grass
  subSurfaceBlock: BlockType // e.g. Dirt
  stoneBlock: BlockType    // e.g. Stone
  
  // Visuals
  colors: BiomeColors
}
