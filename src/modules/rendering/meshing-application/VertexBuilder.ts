// src/modules/meshing/application/VertexBuilder.ts
import * as THREE from 'three'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ILightingQuery } from '../../world/lighting-ports/ILightingQuery'
import { normalizeLightToColor, combineLightChannels } from '../../world/lighting-domain/LightValue'

export class VertexBuilder {
  private positions: number[] = []
  private colors: number[] = []
  private uvs: number[] = []
  private indices: number[] = []
  private vertexCount = 0
  private worldOffsetX: number
  private worldOffsetZ: number

  constructor(
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery,
    chunkX: number,
    chunkZ: number
  ) {
    this.worldOffsetX = chunkX * 24
    this.worldOffsetZ = chunkZ * 24
  }

  addQuad(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1,
    blockType: number
  ): void {
    const vertices = this.getQuadVertices(x, y, z, width, height, axis, direction)
    const normal = this.getFaceNormal(axis, direction)

    for (let i = 0; i < 4; i++) {
      const v = vertices[i]

      // Position (add world offset for rendering)
      this.positions.push(
        v.x + this.worldOffsetX,
        v.y,
        v.z + this.worldOffsetZ
      )

      // Read lighting from lighting module using WORLD coordinates
      const worldX = Math.floor(v.x) + this.worldOffsetX
      const worldY = Math.floor(v.y)
      const worldZ = Math.floor(v.z) + this.worldOffsetZ

      const lightValue = this.lighting.getLight(worldX, worldY, worldZ)
      const combined = combineLightChannels(lightValue)
      const light = normalizeLightToColor(combined)

      // Calculate AO using world coordinates
      const ao = this.getVertexAO(worldX, worldY, worldZ, normal) / 3.0

      // Apply lighting * AO
      this.colors.push(
        light.r * ao,
        light.g * ao,
        light.b * ao
      )

      // UVs
      this.uvs.push(v.u, v.v)
    }

    // Indices for quad (2 triangles)
    const i = this.vertexCount
    this.indices.push(
      i, i + 1, i + 2,
      i, i + 2, i + 3
    )

    this.vertexCount += 4
  }

  buildGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    if (this.positions.length === 0) {
      return geometry
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2))
    geometry.setIndex(this.indices)

    return geometry
  }

  private getQuadVertices(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): Array<{ x: number, y: number, z: number, u: number, v: number }> {
    const vertices: Array<{ x: number, y: number, z: number, u: number, v: number }> = []
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

  private getFaceNormal(axis: 0 | 1 | 2, direction: -1 | 1): { x: number, y: number, z: number } {
    if (axis === 0) return { x: direction, y: 0, z: 0 }
    if (axis === 1) return { x: 0, y: direction, z: 0 }
    return { x: 0, y: 0, z: direction }
  }

  private getVertexAO(
    x: number, y: number, z: number,
    normal: { x: number, y: number, z: number }
  ): number {
    // AO calculation using voxels port
    let side1 = false, side2 = false, corner = false

    const blockX = Math.floor(x)
    const blockY = Math.floor(y)
    const blockZ = Math.floor(z)

    if (normal.y === 1) {
      // Top face
      side1 = this.voxels.isBlockSolid(blockX + 1, blockY + 1, blockZ)
      side2 = this.voxels.isBlockSolid(blockX, blockY + 1, blockZ + 1)
      corner = this.voxels.isBlockSolid(blockX + 1, blockY + 1, blockZ + 1)
    } else if (normal.y === -1) {
      // Bottom face
      side1 = this.voxels.isBlockSolid(blockX + 1, blockY - 1, blockZ)
      side2 = this.voxels.isBlockSolid(blockX, blockY - 1, blockZ + 1)
      corner = this.voxels.isBlockSolid(blockX + 1, blockY - 1, blockZ + 1)
    } else if (normal.x !== 0) {
      // Side face (X axis)
      const offset = normal.x
      side1 = this.voxels.isBlockSolid(blockX + offset, blockY + 1, blockZ)
      side2 = this.voxels.isBlockSolid(blockX + offset, blockY, blockZ + 1)
      corner = this.voxels.isBlockSolid(blockX + offset, blockY + 1, blockZ + 1)
    } else {
      // Side face (Z axis)
      const offset = normal.z
      side1 = this.voxels.isBlockSolid(blockX + 1, blockY, blockZ + offset)
      side2 = this.voxels.isBlockSolid(blockX, blockY + 1, blockZ + offset)
      corner = this.voxels.isBlockSolid(blockX + 1, blockY + 1, blockZ + offset)
    }

    if (side1 && side2) {
      return 0  // Fully occluded
    }

    return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0)
  }
}
