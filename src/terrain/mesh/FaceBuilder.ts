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
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return false
    }

    const blockType = this.chunk.getBlockType(x, y, z)

    // Air = not solid
    if (blockType === -1) return false

    // Glass and leaves are transparent but still block AO
    // All other blocks are solid
    return true
  }

  /**
   * Add a quad face to the mesh
   */
  addQuad(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1,
    blockType: BlockType
  ): void {
    // Generate 4 vertices for the quad
    const vertices = this.getQuadVertices(x, y, z, width, height, axis, direction)
    const normal = this.getFaceNormal(axis, direction)

    for (let i = 0; i < 4; i++) {
      const v = vertices[i]

      // Position
      this.positions.push(v.x, v.y, v.z)

      // Lighting + AO
      const light = this.getVertexLight(v.x, v.y, v.z)
      const ao = this.getVertexAO(v.x, v.y, v.z, normal) / 3.0  // Normalize to [0, 1]

      this.colors.push(
        light.r * ao,
        light.g * ao,
        light.b * ao
      )

      // UVs (temporary - will add texture atlas later)
      this.uvs.push(v.u, v.v)
    }

    // Add indices for 2 triangles (quad)
    const i = this.vertexCount
    this.indices.push(
      i, i + 1, i + 2,  // Triangle 1
      i, i + 2, i + 3   // Triangle 2
    )

    this.vertexCount += 4
  }

  /**
   * Get 4 vertices for a quad
   */
  private getQuadVertices(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): Array<{ x: number, y: number, z: number, u: number, v: number }> {
    const vertices: Array<{ x: number, y: number, z: number, u: number, v: number }> = []

    // Offset for face position (0 or 1 depending on direction)
    const offset = direction === 1 ? 1 : 0

    if (axis === 1) {
      // Top/Bottom face (Y axis)
      vertices.push(
        { x: x, y: y + offset, z: z, u: 0, v: 0 },
        { x: x + width, y: y + offset, z: z, u: width, v: 0 },
        { x: x + width, y: y + offset, z: z + height, u: width, v: height },
        { x: x, y: y + offset, z: z + height, u: 0, v: height }
      )
    } else if (axis === 0) {
      // Side face (X axis)
      vertices.push(
        { x: x + offset, y: y, z: z, u: 0, v: 0 },
        { x: x + offset, y: y, z: z + width, u: width, v: 0 },
        { x: x + offset, y: y + height, z: z + width, u: width, v: height },
        { x: x + offset, y: y + height, z: z, u: 0, v: height }
      )
    } else {
      // Side face (Z axis)
      vertices.push(
        { x: x, y: y, z: z + offset, u: 0, v: 0 },
        { x: x + width, y: y, z: z + offset, u: width, v: 0 },
        { x: x + width, y: y + height, z: z + offset, u: width, v: height },
        { x: x, y: y + height, z: z + offset, u: 0, v: height }
      )
    }

    return vertices
  }

  /**
   * Get face normal vector
   */
  private getFaceNormal(axis: 0 | 1 | 2, direction: -1 | 1): { x: number, y: number, z: number } {
    if (axis === 0) return { x: direction, y: 0, z: 0 }
    if (axis === 1) return { x: 0, y: direction, z: 0 }
    return { x: 0, y: 0, z: direction }
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
