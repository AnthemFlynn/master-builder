import { ChunkDecorator, DecorationContext } from './ChunkDecorator'
import { BlockType } from '../domain/BlockType'
import { VoxelChunk } from '../domain/VoxelChunk'

export class TreeDecorator implements ChunkDecorator {
  decorate(chunk: VoxelChunk, context: DecorationContext): void {
    for (let localX = 0; localX < chunk.size; localX += 2) {
      for (let localZ = 0; localZ < chunk.size; localZ += 2) {
        const biome = context.getBiomeAt(localX, localZ)
        const density = biome.decoration?.treeDensity ?? 0
        if (density <= 0) continue

        if (context.random() > density) continue
        const height = context.getHeightAt(localX, localZ)
        if (height <= 0 || height >= chunk.height - 8) continue

        const treeTypes = biome.decoration?.treeTypes
        if (!treeTypes || treeTypes.length === 0) continue

        const treeConfig = treeTypes[Math.floor(context.random() * treeTypes.length)]
        this.placeTree(chunk, localX, height + 1, localZ, treeConfig.trunk, treeConfig.leaves, treeConfig.minHeight, treeConfig.maxHeight, context)
      }
    }
  }

  private placeTree(
    chunk: VoxelChunk,
    baseX: number,
    baseY: number,
    baseZ: number,
    trunkBlock: BlockType,
    leavesBlock: BlockType,
    minHeight: number,
    maxHeight: number,
    context: DecorationContext
  ): void {
    const height = Math.floor(minHeight + (maxHeight - minHeight) * context.random())
    for (let y = 0; y < height; y++) {
      const yPos = baseY + y
      if (yPos >= chunk.height) break
      chunk.setBlockType(baseX, yPos, baseZ, trunkBlock)
    }

    const crownRadius = 2
    const crownBase = baseY + height - 2
    for (let x = -crownRadius; x <= crownRadius; x++) {
      for (let y = -1; y <= 2; y++) {
        for (let z = -crownRadius; z <= crownRadius; z++) {
          const dist = Math.abs(x) + Math.abs(z)
          if (dist > crownRadius + (y > 0 ? 0 : 1)) continue
          const lx = baseX + x
          const ly = crownBase + y
          const lz = baseZ + z
          if (lx < 0 || lx >= chunk.size || lz < 0 || lz >= chunk.size) continue
          if (ly < 0 || ly >= chunk.height) continue
          const existing = chunk.getBlockType(lx, ly, lz)
          if (existing !== -1) continue
          chunk.setBlockType(lx, ly, lz, leavesBlock)
        }
      }
    }
  }
}
