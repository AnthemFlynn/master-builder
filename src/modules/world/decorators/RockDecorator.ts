import { ChunkDecorator, DecorationContext } from './ChunkDecorator'
import { BlockType } from '../domain/BlockType'
import { ChunkData } from '../../../shared/domain/ChunkData'

export class RockDecorator implements ChunkDecorator {
  decorate(chunk: ChunkData, context: DecorationContext): void {
    if (context.random() > 0.05) return // Rare

    const x = Math.floor(context.random() * chunk.size)
    const z = Math.floor(context.random() * chunk.size)
    const y = context.getHeightAt(x, z)

    if (y <= 0 || y >= chunk.height - 2) return

    // Place a simple rock
    chunk.setBlockId(x, y + 1, z, BlockType.stone)
    if (context.random() > 0.5) {
      // Sometimes add a second rock on top
      chunk.setBlockId(x, y + 2, z, BlockType.stone)
    }
  }
}
