import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorldDefinition } from '../domain/WorldDefinition'
import { BlockType } from '../domain/BlockType'

export class GenerationContext {
  public seed: number
  public heightMap: number[][]
  public blockTypes: number[][][]
  public minY: number = 256
  public maxY: number = 0

  constructor(
    public chunkCoord: ChunkCoordinate,
    public worldDef: WorldDefinition
  ) {
    this.seed = worldDef.meta.seed

    // Initialize 24x24 heightmap
    this.heightMap = []
    for (let x = 0; x < 24; x++) {
      this.heightMap[x] = []
      for (let z = 0; z < 24; z++) {
        this.heightMap[x][z] = 0
      }
    }

    // Initialize 24x256x24 blockTypes array (all air) - explicit loop to ensure all indices exist
    this.blockTypes = []
    for (let x = 0; x < 24; x++) {
      this.blockTypes[x] = []
      for (let y = 0; y < 256; y++) {
        this.blockTypes[x][y] = []
        for (let z = 0; z < 24; z++) {
          this.blockTypes[x][y][z] = BlockType.air
        }
      }
    }
  }

  // Safe block access with bounds checking (silently skips out-of-bounds)
  setBlock(x: number, y: number, z: number, type: number): void {
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return  // Silently skip out-of-bounds blocks
    }
    this.blockTypes[x][y][z] = type

    // Track min/max Y for optimization
    if (type !== BlockType.air) {
      this.minY = Math.min(this.minY, y)
      this.maxY = Math.max(this.maxY, y)
    }
  }

  getBlock(x: number, y: number, z: number): number {
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return BlockType.air  // Out-of-bounds reads return air
    }
    return this.blockTypes[x][y][z]
  }
}
