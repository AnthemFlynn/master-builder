import { ChunkDecorator, DecorationContext } from './ChunkDecorator'
import { BlockType } from '../domain/BlockType'
import { VoxelChunk } from '../domain/VoxelChunk'

export class RockDecorator implements ChunkDecorator {
  decorate(chunk: VoxelChunk, context: DecorationContext): void {
    for (let x = 0; x < chunk.size; x += 3) {
      for (let z = 0; z < chunk.size; z += 3) {
        const biome = context.getBiomeAt(x, z)
        if (context.random() > (biome.decoration?.rockDensity ?? 0.05)) continue
        const height = context.getHeightAt(x, z)
        this.placeRock(chunk, x, height + 1, z, context)
      }
    }
  }

  private placeRock(chunk: VoxelChunk, baseX: number, baseY: number, baseZ: number, context: DecorationContext): void {
    const radius = 1 + Math.floor(context.random() * 2)
    for (let x = -radius; x <= radius; x++) {
      for (let y = 0; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          if (x * x + y * y + z * z > radius * radius) continue
          const lx = baseX + x
          const ly = baseY + y
          const lz = baseZ + z
          if (lx < 0 || lx >= chunk.size || lz < 0 || lz >= chunk.size) continue
          if (ly < 0 || ly >= chunk.height) continue
          chunk.setBlockType(lx, ly, lz, BlockType.stone)
        }
      }
    }
  }
}
