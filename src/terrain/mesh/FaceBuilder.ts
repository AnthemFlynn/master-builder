import * as THREE from 'three'
import { Chunk } from '../Chunk'
import { BlockType } from '../index'

/**
 * Generates quad vertices with lighting and ambient occlusion
 */
export class FaceBuilder {
  private positions: number[] = []
  private colors: number[] = []
  private uvs: number[] = []
  private indices: number[] = []
  private vertexCount = 0

  constructor(private chunk: Chunk) {}

  /**
   * Check if block at position is solid (for AO calculation)
   */
  private isBlockSolid(x: number, y: number, z: number): boolean {
    // Out of bounds = not solid (air)
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return false
    }

    // TODO: Get block type from chunk
    // For now, assume any non-air block is solid
    const light = this.chunk.getLight(x, y, z)

    // If both sky and block light are 0, it's probably solid
    // This is a heuristic until we add getBlockType to Chunk
    return (light.sky.r + light.sky.g + light.sky.b) === 0
  }

  /**
   * Add a quad face to the mesh
   */
  addQuad(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,  // 0=X, 1=Y, 2=Z
    direction: -1 | 1,  // negative or positive face
    blockType: BlockType
  ): void {
    // TODO: Implementation
  }

  /**
   * Build final BufferGeometry
   */
  buildGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    if (this.positions.length === 0) {
      return geometry  // Empty chunk
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2))
    geometry.setIndex(this.indices)

    return geometry
  }

  /**
   * Get vertex light (smooth lighting - averages neighbors)
   */
  private getVertexLight(x: number, y: number, z: number): { r: number, g: number, b: number } {
    // Sample the block and its neighbors for smooth lighting
    // Average up to 8 surrounding blocks (or fewer at chunk boundaries)

    let r = 0, g = 0, b = 0, count = 0

    // Sample 3x3x3 cube around vertex
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nx = x + dx
          const ny = y + dy
          const nz = z + dz

          // Bounds check
          if (nx < 0 || nx >= 24 || ny < 0 || ny >= 256 || nz < 0 || nz >= 24) {
            continue
          }

          const light = this.chunk.getLight(nx, ny, nz)

          // Combine sky + block light (max of each channel)
          const combined = {
            r: Math.max(light.sky.r, light.block.r),
            g: Math.max(light.sky.g, light.block.g),
            b: Math.max(light.sky.b, light.block.b)
          }

          r += combined.r
          g += combined.g
          b += combined.b
          count++
        }
      }
    }

    // Normalize to [0, 1] range (max value is 15)
    return {
      r: count > 0 ? (r / count) / 15 : 1.0,
      g: count > 0 ? (g / count) / 15 : 1.0,
      b: count > 0 ? (b / count) / 15 : 1.0
    }
  }

  /**
   * Get vertex ambient occlusion (0-3 scale)
   */
  private getVertexAO(
    x: number, y: number, z: number,
    normal: { x: number, y: number, z: number }
  ): number {
    // AO algorithm from 0fps.net
    // Check 3 neighbors: side1, side2, corner

    // Determine which neighbors to check based on face normal
    let side1 = false, side2 = false, corner = false

    if (normal.y === 1) {
      // Top face - check blocks above
      side1 = this.isBlockSolid(x + 1, y + 1, z)
      side2 = this.isBlockSolid(x, y + 1, z + 1)
      corner = this.isBlockSolid(x + 1, y + 1, z + 1)
    } else if (normal.y === -1) {
      // Bottom face
      side1 = this.isBlockSolid(x + 1, y - 1, z)
      side2 = this.isBlockSolid(x, y - 1, z + 1)
      corner = this.isBlockSolid(x + 1, y - 1, z + 1)
    } else if (normal.x !== 0) {
      // Side face (X axis)
      const offset = normal.x
      side1 = this.isBlockSolid(x + offset, y + 1, z)
      side2 = this.isBlockSolid(x + offset, y, z + 1)
      corner = this.isBlockSolid(x + offset, y + 1, z + 1)
    } else {
      // Side face (Z axis)
      const offset = normal.z
      side1 = this.isBlockSolid(x + 1, y, z + offset)
      side2 = this.isBlockSolid(x, y + 1, z + offset)
      corner = this.isBlockSolid(x + 1, y + 1, z + offset)
    }

    // Calculate AO value
    if (side1 && side2) {
      return 0  // Fully occluded
    }

    return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0)
  }
}
