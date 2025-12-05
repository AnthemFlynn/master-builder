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
    // TODO: Implementation
    return null
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
