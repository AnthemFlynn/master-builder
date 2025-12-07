import { ChunkDecorator, DecorationContext } from './ChunkDecorator'
import { BlockType } from '../domain/BlockType'
import { VoxelChunk } from '../domain/VoxelChunk'

export class SandPatchDecorator implements ChunkDecorator {
  decorate(chunk: VoxelChunk, context: DecorationContext): void {
    const waterLevel = context.preset.waterLevel

    for (let x = 0; x < chunk.size; x += 3) {
      for (let z = 0; z < chunk.size; z += 3) {
        const height = context.getHeightAt(x, z)
        if (height > waterLevel + 3) continue

        if (context.random() > 0.35) continue

        const radius = 1 + Math.floor(context.random() * 2)
        for (let ix = -radius; ix <= radius; ix++) {
          for (let iz = -radius; iz <= radius; iz++) {
            const lx = x + ix
            const lz = z + iz
            if (lx < 0 || lx >= chunk.size || lz < 0 || lz >= chunk.size) continue
            const columnHeight = context.getHeightAt(lx, lz)
            chunk.setBlockType(lx, columnHeight, lz, BlockType.sand)
            chunk.setBlockType(lx, columnHeight - 1, lz, BlockType.sand)
          }
        }
      }
    }
  }
}
