import { Chunk } from '../Chunk'
import { BlockType } from '../index'
import { FaceBuilder } from './FaceBuilder'

/**
 * Greedy meshing algorithm for voxel terrain
 * Merges adjacent faces with matching block type and lighting
 */
export class GreedyMesher {
  constructor(private chunk: Chunk) {}

  /**
   * Build optimized mesh with greedy merging
   */
  buildMesh(faceBuilder: FaceBuilder): void {
    // Process each axis
    for (const axis of [0, 1, 2] as const) {
      // Process both directions (+/-)
      for (const direction of [-1, 1] as const) {
        this.processAxis(faceBuilder, axis, direction)
      }
    }
  }

  /**
   * Process one axis/direction combination
   */
  private processAxis(
    faceBuilder: FaceBuilder,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): void {
    // TODO: Greedy meshing implementation
  }

  /**
   * Check if face is visible (different block or transparent neighbor)
   */
  private isFaceVisible(
    x: number, y: number, z: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): BlockType | null {
    // Bounds check
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return null
    }

    const currentBlock = this.getBlockType(x, y, z)

    // Air blocks don't have faces
    if (currentBlock === -1) {
      return null
    }

    // Check neighbor in the direction of this face
    let nx = x, ny = y, nz = z

    if (axis === 0) nx += direction
    else if (axis === 1) ny += direction
    else nz += direction

    // Neighbor out of bounds = visible (chunk boundary)
    if (nx < 0 || nx >= 24 || ny < 0 || ny >= 256 || nz < 0 || nz >= 24) {
      return currentBlock
    }

    const neighborBlock = this.getBlockType(nx, ny, nz)

    // Face visible if neighbor is different or air
    if (neighborBlock === -1 || neighborBlock !== currentBlock) {
      return currentBlock
    }

    return null  // Hidden face
  }

  /**
   * Check if two positions have matching lighting
   */
  private lightMatches(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number
  ): boolean {
    const l1 = this.chunk.getLight(x1, y1, z1)
    const l2 = this.chunk.getLight(x2, y2, z2)

    // Must match exactly (all 6 channels)
    return (
      l1.sky.r === l2.sky.r && l1.sky.g === l2.sky.g && l1.sky.b === l2.sky.b &&
      l1.block.r === l2.block.r && l1.block.g === l2.block.g && l1.block.b === l2.block.b
    )
  }

  /**
   * Get block type at position (temporary - needs chunk.getBlockType)
   */
  private getBlockType(x: number, y: number, z: number): BlockType {
    // TODO: This needs chunk to expose getBlockType method
    // For now, assume grass at surface, stone below
    if (y === 31) return BlockType.grass
    if (y < 31) return BlockType.stone
    return -1 as BlockType  // Air
  }
}
