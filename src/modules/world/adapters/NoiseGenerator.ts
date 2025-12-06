// src/modules/world/adapters/NoiseGenerator.ts
import { VoxelChunk } from '../domain/VoxelChunk'
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

export enum BlockType {
  grass = 0,
  sand = 1,
  tree = 2,
  leaf = 3,
  dirt = 4,
  stone = 5,
  coal = 6,
  wood = 7,
  diamond = 8,
  quartz = 9,
  glass = 10,
  bedrock = 11,
  glowstone = 12,
  redstone_lamp = 13
}

export class NoiseGenerator {
  private noise: ImprovedNoise
  private seed: number
  private gap: number = 22
  private amp: number = 8

  constructor(seed?: number) {
    this.seed = seed || Math.random()
    this.noise = new ImprovedNoise()
  }

  populate(chunk: VoxelChunk, coord: ChunkCoordinate): void {
    const chunkWorldX = coord.x * 24
    const chunkWorldZ = coord.z * 24

    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        const worldX = chunkWorldX + localX
        const worldZ = chunkWorldZ + localZ

        // Calculate height using noise
        const height = Math.floor(
          this.noise.noise(worldX / this.gap, worldZ / this.gap, this.seed) * this.amp + 30
        )

        for (let localY = 0; localY < 256; localY++) {
          let blockType: BlockType | -1 = -1  // Air

          if (localY === 0) {
            blockType = BlockType.bedrock
          } else if (localY < height - 3) {
            blockType = BlockType.stone
          } else if (localY < height) {
            blockType = BlockType.dirt
          } else if (localY === Math.floor(height)) {
            blockType = BlockType.grass
          }

          if (blockType !== -1) {
            chunk.setBlockType(localX, localY, localZ, blockType)
          }
        }
      }
    }
  }
}
