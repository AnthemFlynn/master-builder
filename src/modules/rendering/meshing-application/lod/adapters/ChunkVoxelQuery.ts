import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { IVoxelQuery } from '../../../../../shared/ports/IVoxelQuery'
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_HEIGHT } from '../../../../../shared/constants/ChunkConstants'

/**
 * Adapter that wraps a single ChunkData to implement IVoxelQuery interface.
 * Used by LOD meshers to query voxel data from a chunk.
 */
export class ChunkVoxelQuery implements IVoxelQuery {
  constructor(private chunk: ChunkData) {}

  getBlockType(worldX: number, worldY: number, worldZ: number): number {
    const chunkX = this.chunk.coord.x * CHUNK_WIDTH
    const chunkZ = this.chunk.coord.z * CHUNK_DEPTH
    const localX = worldX - chunkX
    const localZ = worldZ - chunkZ

    if (localX < 0 || localX >= CHUNK_WIDTH || localZ < 0 || localZ >= CHUNK_DEPTH || worldY < 0 || worldY >= CHUNK_HEIGHT) {
      return -1 // Air/out of bounds
    }

    return this.chunk.getBlockId(localX, worldY, localZ)
  }
}
