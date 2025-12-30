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

    // Use minY/maxY optimization to skip empty vertical space
    const minY = Math.max(0, context.minY)
    const maxY = Math.min(255, context.maxY)

    // Copy blocks to chunk using accessor methods (only non-empty Y range)
    for (let x = 0; x < 24; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = 0; z < 24; z++) {
          const blockType = context.getBlock(x, y, z)
          if (blockType !== 0) {  // Skip air for efficiency
            chunk.setBlockId(x, y, z, blockType)
          }
        }
      }
    }

    return chunk
  }
}
