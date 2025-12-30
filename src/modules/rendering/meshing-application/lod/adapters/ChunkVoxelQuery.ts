import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { IVoxelQuery } from '../../../../../shared/ports/IVoxelQuery'

/**
 * Adapter that wraps a single ChunkData to implement IVoxelQuery interface.
 * Used by LOD meshers to query voxel data from a chunk.
 */
export class ChunkVoxelQuery implements IVoxelQuery {
  constructor(private chunk: ChunkData) {}

  getBlockType(worldX: number, worldY: number, worldZ: number): number {
    const chunkX = this.chunk.coord.x * 24
    const chunkZ = this.chunk.coord.z * 24
    const localX = worldX - chunkX
    const localZ = worldZ - chunkZ

    if (localX < 0 || localX >= 24 || localZ < 0 || localZ >= 24 || worldY < 0 || worldY >= 256) {
      return -1 // Air/out of bounds
    }

    return this.chunk.getBlockId(localX, worldY, localZ)
  }
}
