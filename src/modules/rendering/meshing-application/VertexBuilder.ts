// src/modules/meshing/application/VertexBuilder.ts
import * as THREE from 'three'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ILightingQuery } from '../../world/lighting-ports/ILightingQuery'
import { normalizeLightToColor, combineLightChannels } from '../../world/lighting-domain/LightValue'
import { blockRegistry } from '../../../blocks'

interface BufferData {
  positions: number[]
  colors: number[]
  uvs: number[]
  indices: number[]
  vertexCount: number
}

export class VertexBuilder {
  private buffers = new Map<number, BufferData>()
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
    const buffer = this.getBuffer(blockType)
    const vertices = this.getQuadVertices(x, y, z, width, height, axis, direction)
    const normal = this.getFaceNormal(axis, direction)
    const baseColor = blockRegistry.getFaceColor(blockType, normal)

    for (let i = 0; i < 4; i++) {
      const v = vertices[i]

      // Position (add world offset for rendering)
      buffer.positions.push(
        v.x,
        v.y,
        v.z
      )

      // Read lighting from lighting module using WORLD coordinates
      const worldX = Math.floor(v.x + this.worldOffsetX)
      const worldY = Math.floor(v.y)
      const worldZ = Math.floor(v.z + this.worldOffsetZ)

      const lightValue = this.lighting.getLight(worldX, worldY, worldZ)
      const combined = combineLightChannels(lightValue)
      const light = normalizeLightToColor(combined)

      // Calculate AO using world coordinates
      const aoRaw = this.getVertexAO(worldX, worldY, worldZ, normal)
      const ao = 0.7 + (aoRaw / 6)

      // Apply lighting * AO
      const faceTint = this.getFaceTint(normal, worldX, worldY, worldZ)
      buffer.colors.push(
        light.r * ao * baseColor.r * faceTint,
        light.g * ao * baseColor.g * faceTint,
        light.b * ao * baseColor.b * faceTint
      )

      // UVs
      buffer.uvs.push(v.u, v.v)
    }

    // Indices for quad (2 triangles)
    const i = buffer.vertexCount
    buffer.indices.push(
      i, i + 1, i + 2,
      i, i + 2, i + 3
    )

    buffer.vertexCount += 4
  }

  buildGeometry(): Map<number, THREE.BufferGeometry> {
    const map = new Map<number, THREE.BufferGeometry>()
    for (const [blockType, buffer] of this.buffers.entries()) {
      if (buffer.positions.length === 0) continue
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffer.positions, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(buffer.colors, 3))
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buffer.uvs, 2))
      geometry.setIndex(buffer.indices)
      geometry.computeVertexNormals()
      map.set(blockType, geometry)
    }
    return map
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
    worldX: number, worldY: number, worldZ: number,
    normal: { x: number, y: number, z: number }
  ): number {
    // AO calculation using voxels port
    let side1 = false, side2 = false, corner = false

    const blockX = Math.floor(worldX)
    const blockY = Math.floor(worldY)
    const blockZ = Math.floor(worldZ)

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

  private getFaceTint(
    normal: { x: number, y: number, z: number },
    worldX: number,
    worldY: number,
    worldZ: number
  ): number {
    let baseTint = 1
    if (normal.y === 1) baseTint = 1.12
    else if (normal.y === -1) baseTint = 0.75
    else baseTint = 0.96

    const hash = this.hash(worldX, worldY, worldZ)
    const variation = (hash - 0.5) * 0.08
    return Math.max(0.5, baseTint + variation)
  }

  private hash(x: number, y: number, z: number): number {
    let seed = x * 374761393 + y * 668265263 + z * 3266489917
    seed = (seed ^ (seed >> 13)) >>> 0
    seed = (seed * 1274126177) >>> 0
    return (seed & 0xffffff) / 0xffffff
  }

  private getBuffer(blockType: number): BufferData {
    let buffer = this.buffers.get(blockType)
    if (!buffer) {
      buffer = {
        positions: [],
        colors: [],
        uvs: [],
        indices: [],
        vertexCount: 0
      }
      this.buffers.set(blockType, buffer)
    }
    return buffer
  }
}
