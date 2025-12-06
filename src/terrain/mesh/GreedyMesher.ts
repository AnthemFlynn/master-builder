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
    // Determine dimensions for this axis
    const [u, v] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1]
    const uSize = [24, 256, 24][u]
    const vSize = [24, 256, 24][v]
    const axisSize = [24, 256, 24][axis]

    // Sweep along axis
    for (let d = 0; d < axisSize; d++) {
      // Build 2D mask of visible faces
      const mask: (BlockType | null)[][] = []
      for (let i = 0; i < uSize; i++) {
        mask[i] = []
        for (let j = 0; j < vSize; j++) {
          // Convert 2D (i,j,d) to 3D (x,y,z) based on axis
          let x = 0, y = 0, z = 0
          if (axis === 0) { x = d; y = i; z = j }
          else if (axis === 1) { x = i; y = d; z = j }
          else { x = i; y = j; z = d }

          mask[i][j] = this.isFaceVisible(x, y, z, axis, direction)
        }
      }

      // Greedy merge rectangles in mask
      for (let i = 0; i < uSize; i++) {
        for (let j = 0; j < vSize; j++) {
          const blockType = mask[i][j]
          if (blockType === null) continue

          // Get 3D position for lighting check
          let baseX = 0, baseY = 0, baseZ = 0
          if (axis === 0) { baseX = d; baseY = i; baseZ = j }
          else if (axis === 1) { baseX = i; baseY = d; baseZ = j }
          else { baseX = i; baseY = j; baseZ = d }

          // Expand width (j direction)
          let width = 1
          while (j + width < vSize) {
            // Check block type matches
            if (mask[i][j + width] !== blockType) break

            // Check lighting matches
            let checkX = baseX, checkY = baseY, checkZ = baseZ
            if (axis === 0) checkZ += width
            else if (axis === 1) checkZ += width
            else checkY += width

            if (!this.lightMatches(baseX, baseY, baseZ, checkX, checkY, checkZ)) break

            width++
          }

          // Expand height (i direction)
          let height = 1
          while (i + height < uSize) {
            let canExpand = true

            // Check entire row
            for (let k = 0; k < width; k++) {
              if (mask[i + height][j + k] !== blockType) {
                canExpand = false
                break
              }

              // Check lighting
              let checkX = baseX, checkY = baseY, checkZ = baseZ
              if (axis === 0) { checkY += height; checkZ += k }
              else if (axis === 1) { checkX += height; checkZ += k }
              else { checkX += height; checkY += k }

              if (!this.lightMatches(baseX, baseY, baseZ, checkX, checkY, checkZ)) {
                canExpand = false
                break
              }
            }

            if (!canExpand) break
            height++
          }

          // Add merged quad
          faceBuilder.addQuad(baseX, baseY, baseZ, width, height, axis, direction, blockType)

          // Clear mask
          for (let di = 0; di < height; di++) {
            for (let dj = 0; dj < width; dj++) {
              mask[i + di][j + dj] = null
            }
          }
        }
      }
    }
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

    const currentBlock = this.chunk.getBlockType(x, y, z)

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
      return currentBlock as BlockType
    }

    const neighborBlock = this.chunk.getBlockType(nx, ny, nz)

    // Face visible if different or air
    if (neighborBlock === -1 || neighborBlock !== currentBlock) {
      return currentBlock as BlockType
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
}
