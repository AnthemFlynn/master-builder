import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { WorldDefinition } from '../domain/WorldDefinition'
import { GenerationContext } from './GenerationContext'
import { GenerationPass } from './passes/GenerationPass'

export class GenerationOrchestrator {
  constructor(
    private worldDef: WorldDefinition,
    private passes: GenerationPass[] = []
  ) {}

  async generateChunk(coord: ChunkCoordinate): Promise<ChunkData> {
    const context = new GenerationContext(coord, this.worldDef)

    // Execute all passes in order
    for (const pass of this.passes) {
      await pass.execute(context)
    }

    // Compile to ChunkData
    return this.compileToChunk(context)
  }

  private compileToChunk(context: GenerationContext): ChunkData {
    const chunk = new ChunkData(context.chunkCoord)

    // Copy blockTypes array to chunk
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          const blockType = context.blockTypes[x][y][z]
          if (blockType !== 0) {  // Skip air for efficiency
            chunk.setBlockId(x, y, z, blockType)
          }
        }
      }
    }

    return chunk
  }
}
