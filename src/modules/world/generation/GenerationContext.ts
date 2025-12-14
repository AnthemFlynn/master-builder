import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorldDefinition } from '../domain/WorldDefinition'
import { BlockType } from '../domain/BlockType'

export class GenerationContext {
  public seed: number
  public heightMap: number[][]
  public blockTypes: number[][][]

  constructor(
    public chunkCoord: ChunkCoordinate,
    public worldDef: WorldDefinition
  ) {
    this.seed = worldDef.meta.seed

    // Initialize 24x24 heightmap
    this.heightMap = Array(24).fill(null).map(() => Array(24).fill(0))

    // Initialize 24x256x24 blockTypes array (all air)
    this.blockTypes = Array(24).fill(null).map(() =>
      Array(256).fill(null).map(() =>
        Array(24).fill(BlockType.air)
      )
    )
  }
}
