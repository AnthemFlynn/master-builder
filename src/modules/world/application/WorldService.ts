// src/modules/world/application/WorldService.ts
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { VoxelChunk } from '../domain/VoxelChunk'
import { IVoxelQuery } from '../ports/IVoxelQuery'

export class WorldService implements IVoxelQuery {
  private chunks = new Map<string, VoxelChunk>()

  getChunk(coord: ChunkCoordinate): VoxelChunk | null {
    return this.chunks.get(coord.toKey()) || null
  }

  getOrCreateChunk(coord: ChunkCoordinate): VoxelChunk {
    const existing = this.chunks.get(coord.toKey())
    if (existing) return existing

    const chunk = new VoxelChunk(coord)
    this.chunks.set(coord.toKey(), chunk)
    console.log(`📦 Created VoxelChunk at (${coord.x}, ${coord.z})`)
    return chunk
  }

  getBlockType(worldX: number, worldY: number, worldZ: number): number {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const chunk = this.getChunk(coord)

    if (!chunk) return -1

    const local = this.worldToLocal(worldX, worldY, worldZ)
    return chunk.getBlockType(local.x, local.y, local.z)
  }

  isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
    const blockType = this.getBlockType(worldX, worldY, worldZ)
    return blockType !== -1  // Any non-air block is solid (can refine later)
  }

  setBlock(worldX: number, worldY: number, worldZ: number, blockType: number): void {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const chunk = this.getOrCreateChunk(coord)
    const local = this.worldToLocal(worldX, worldY, worldZ)
    chunk.setBlockType(local.x, local.y, local.z, blockType)
  }

  getAllChunks(): VoxelChunk[] {
    return Array.from(this.chunks.values())
  }

  private worldToChunkCoord(worldX: number, worldZ: number): ChunkCoordinate {
    return new ChunkCoordinate(
      Math.floor(worldX / 24),
      Math.floor(worldZ / 24)
    )
  }

  private worldToLocal(worldX: number, worldY: number, worldZ: number): { x: number, y: number, z: number } {
    return {
      x: ((worldX % 24) + 24) % 24,
      y: worldY,
      z: ((worldZ % 24) + 24) % 24
    }
  }
}
