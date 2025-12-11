import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { ChunkData } from '../domain/ChunkData'

export interface IVoxelQuery {
  /**
   * Get block type at world coordinates
   * Returns -1 for air or out of bounds
   */
  getBlockType(worldX: number, worldY: number, worldZ: number): number

  /**
   * Check if block at world coordinates is solid
   */
  isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean

  /**
   * Get light absorption of block at world coordinates
   * Returns 0-15 (0 = transparent, 15 = opaque)
   */
  getLightAbsorption(worldX: number, worldY: number, worldZ: number): number

  /**
   * Get chunk by coordinate (may return null if not generated)
   */
  getChunk(coord: ChunkCoordinate): ChunkData | null
}
