import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { VoxelChunk } from '../../../modules/world/domain/VoxelChunk'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'

/**
 * A lightweight implementation of IVoxelQuery for the Worker.
 * It holds a limited cache of chunks needed for a specific operation.
 */
export class WorkerVoxelQuery implements IVoxelQuery {
  private chunks = new Map<string, VoxelChunk>()

  addChunk(chunk: VoxelChunk) {
    this.chunks.set(chunk.coord.toKey(), chunk)
  }

  getChunk(coord: ChunkCoordinate): VoxelChunk | null {
    return this.chunks.get(coord.toKey()) || null
  }

  getBlockType(worldX: number, worldY: number, worldZ: number): number {
    const cx = Math.floor(worldX / 24)
    const cz = Math.floor(worldZ / 24)
    const coord = new ChunkCoordinate(cx, cz)
    
    const chunk = this.getChunk(coord)
    if (!chunk) return -1

    const lx = ((worldX % 24) + 24) % 24
    const lz = ((worldZ % 24) + 24) % 24
    
    return chunk.getBlockType(lx, worldY, lz)
  }

  isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
    // Basic check - we assume non-air is solid for simple lighting logic
    // or we can mock it more if needed.
    return this.getBlockType(worldX, worldY, worldZ) !== -1
  }
}
