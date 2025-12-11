import { ChunkDecorator, DecorationContext } from './ChunkDecorator'
import { BlockType } from '../domain/BlockType'
import { ChunkData } from '../../../shared/domain/ChunkData'

export class SandPatchDecorator implements ChunkDecorator {
  decorate(chunk: ChunkData, context: DecorationContext): void {
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(context.random() * chunk.size)
      const z = Math.floor(context.random() * chunk.size)
      const y = context.getHeightAt(x, z)

      if (y < 60 || y > 70) continue // Only near water level

      // Create a small patch
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (dx*dx + dz*dz > 4) continue
          
          const lx = x + dx
          const lz = z + dz
          
          if (lx < 0 || lx >= chunk.size || lz < 0 || lz >= chunk.size) continue
          
          const currentY = context.getHeightAt(lx, lz)
          // Replace top block
          chunk.setBlockId(lx, currentY, lz, BlockType.sand)
        }
      }
    }
  }
}
