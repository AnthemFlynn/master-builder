import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'

export interface FeatureGenerator {
  // Check if this feature affects the given chunk
  affects(coord: ChunkCoordinate, seed: number, config: any): boolean

  // Generate feature geometry in the chunk
  generate(context: GenerationContext, config: any): void
}
