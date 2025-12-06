// src/modules/world/domain/VoxelChunk.ts
import { ChunkCoordinate } from './ChunkCoordinate'

export class VoxelChunk {
  readonly coord: ChunkCoordinate
  private blockTypes: Int8Array
  readonly size: number = 24
  readonly height: number = 256

  constructor(coord: ChunkCoordinate) {
    this.coord = coord
    const arraySize = this.size * this.height * this.size

    if (!Number.isFinite(arraySize) || arraySize <= 0) {
      console.error(`❌ VoxelChunk: Invalid arraySize=${arraySize} for coord (${coord.x}, ${coord.z})`)
      throw new Error(`Invalid array size: ${arraySize}`)
    }

    this.blockTypes = new Int8Array(arraySize).fill(-1)  // Air initially
  }

  getBlockType(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return -1  // Air
    }

    const index = x + y * this.size + z * this.size * this.height
    return this.blockTypes[index]
  }

  setBlockType(x: number, y: number, z: number, blockType: number): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return
    }

    const index = x + y * this.size + z * this.size * this.height
    this.blockTypes[index] = blockType
  }

  getMemoryUsage(): number {
    return this.size * this.height * this.size  // 1 byte per voxel
  }
}
