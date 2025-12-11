import { ChunkData } from '../../../shared/domain/ChunkData'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorldPreset, BiomeDefinition } from '../domain/WorldPreset'

export interface DecorationContext {
  preset: WorldPreset
  chunkCoord: ChunkCoordinate
  getBiomeAt(localX: number, localZ: number): BiomeDefinition
  getHeightAt(localX: number, localZ: number): number
  random(): number
}

export interface ChunkDecorator {
  decorate(chunk: ChunkData, context: DecorationContext): void
}
