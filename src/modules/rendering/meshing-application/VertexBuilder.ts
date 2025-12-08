// src/modules/meshing/application/VertexBuilder.ts
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../environment/ports/ILightingQuery'
import { blockRegistry } from '../../../modules/blocks'
import { LightValue, RGB } from '../../../shared/domain/LightValue' // Import LightValue from shared

interface BufferData {
  positions: number[]
  colors: number[]
  uvs: number[]
  indices: number[]
  vertexCount: number
}

// Helper functions (moved from LightValue.ts to here for direct usage)
function combineLightChannels(light: LightValue): RGB {
  return {
    r: Math.max(light.sky.r, light.block.r),
    g: Math.max(light.sky.g, light.block.g),
    b: Math.max(light.sky.b, light.block.b)
  }
}

function normalizeLightToColor(light: RGB): RGB {
  return {
    r: light.r / 15,
    g: light.g / 15,
    b: light.b / 15
  }
}

export class VertexBuilder {
  private buffers = new Map<string, BufferData>()
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
    blockType: number,
    faceIndex: number
  ): void {
    const materialKey = `${blockType}:${faceIndex}`
    const buffer = this.getBuffer(materialKey)
    const vertices = this.getQuadVertices(x, y, z, width, height, axis, direction)
    const normal = this.getFaceNormal(axis, direction)
    // Note: blockRegistry.getFaceColor returns THREE.Color, which might fail in worker if THREE not tree-shaken properly?
    // Actually, we imported THREE in blockRegistry? 
    // We need to check BlockRegistry dependencies. 
    // Assuming for now it returns {r,g,b} object compatible with THREE.Color structure.
    const baseColor = blockRegistry.getFaceColor(blockType, normal)

    for (let i = 0; i < 4; i++) {
      const v = vertices[i]

      // Position (add world offset for rendering)
      buffer.positions.push(
        v.x,
        v.y,
        v.z
      )

      // Calculate world coordinates once
      const worldX = Math.floor(v.x + this.worldOffsetX)
      const worldY = Math.floor(v.y)
      const worldZ = Math.floor(v.z + this.worldOffsetZ)

      // Read lighting from lighting module using WORLD coordinates
      // Adjust light sampling position by normal to sample from the air block adjacent to the face
      let lightSampleX = worldX
      let lightSampleY = worldY
      let lightSampleZ = worldZ

      if (normal.x < 0) lightSampleX -= 1 // For -X normal, sample from X-1
      if (normal.y < 0) lightSampleY -= 1 // For -Y normal, sample from Y-1
      if (normal.z < 0) lightSampleZ -= 1 // For -Z normal, sample from Z-1
      
      const lightValue = this.lighting.getLight(lightSampleX, lightSampleY, lightSampleZ)
      const combined = combineLightChannels(lightValue)
      const light = normalizeLightToColor(combined)

      // Calculate AO using world coordinates
      const aoRaw = this.getVertexAO(worldX, worldY, worldZ, normal)
      const ao = 0.7 + (aoRaw / 6)

      // Apply lighting * AO
      const faceTint = this.getFaceTint(normal, worldX, worldY, worldZ)
      
      // Apply Overlay
      // We need a simple color object, not THREE.Color clone
      const overlay = this.applySideOverlay(blockType, normal, {r: baseColor.r, g: baseColor.g, b: baseColor.b}, v.y - y, height)

      buffer.colors.push(
        light.r * ao * overlay.r * faceTint,
        light.g * ao * overlay.g * faceTint,
        light.b * ao * overlay.b * faceTint
      )

      // UVs
      buffer.uvs.push(v.u, v.v)
    }

    // Indices for quad (2 triangles)
    const i = buffer.vertexCount
    const needsFlip = (
      // Current vertex ordering yields inward-facing triangles for these cases
      (axis === 0 && direction === 1) ||  // +X face
      (axis === 1 && direction === 1) ||  // +Y face (grass tops, etc.)
      (axis === 2 && direction === -1)    // -Z face
    )

    if (needsFlip) {
      buffer.indices.push(
        i, i + 2, i + 1,
        i, i + 3, i + 2
      )
    } else {
      buffer.indices.push(
        i, i + 1, i + 2,
        i, i + 2, i + 3
      )
    }

    buffer.vertexCount += 4
  }

  // Returns raw arrays instead of BufferGeometry
  getBuffers(): Map<string, { positions: Float32Array, colors: Float32Array, uvs: Float32Array, indices: Uint16Array }> {
    const map = new Map<string, { positions: Float32Array, colors: Float32Array, uvs: Float32Array, indices: Uint16Array }>()
    for (const [key, buffer] of this.buffers.entries()) {
      if (buffer.positions.length === 0) continue
      
      map.set(key, {
        positions: new Float32Array(buffer.positions),
        colors: new Float32Array(buffer.colors),
        uvs: new Float32Array(buffer.uvs),
        indices: new Uint16Array(buffer.indices)
      })
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
    let side1 = false, side2 = false, corner = false

    const blockX = Math.floor(worldX)
    const blockY = Math.floor(worldY)
    const blockZ = Math.floor(worldZ)

    // AO calculation using voxels port
    const isOpaque = (bx: number, by: number, bz: number) => {
        const blockType = this.voxels.getBlockType(bx, by, bz);
        if (blockType === -1) return false; // Air is not opaque
        const blockDef = blockRegistry.get(blockType);
        // Treat transparent blocks as non-opaque for AO purposes
        return !(blockDef && blockDef.transparent);
    };

    if (normal.y === 1) {
      // Top face
      side1 = isOpaque(blockX + 1, blockY + 1, blockZ); // Block to the right-above
      side2 = isOpaque(blockX, blockY + 1, blockZ + 1); // Block to the forward-above
      corner = isOpaque(blockX + 1, blockY + 1, blockZ + 1); // Block to the right-forward-above
    } else if (normal.y === -1) {
      // Bottom face
      side1 = isOpaque(blockX + 1, blockY - 1, blockZ);
      side2 = isOpaque(blockX, blockY - 1, blockZ + 1);
      corner = isOpaque(blockX + 1, blockY - 1, blockZ + 1);
    } else if (normal.x !== 0) {
      // Side face (X axis)
      const offset = normal.x;
      side1 = isOpaque(blockX + offset, blockY + 1, blockZ); // Block above
      side2 = isOpaque(blockX + offset, blockY, blockZ + 1); // Block in front
      corner = isOpaque(blockX + offset, blockY + 1, blockZ + 1); // Block above and in front
    } else {
      // Side face (Z axis)
      const offset = normal.z;
      side1 = isOpaque(blockX + 1, blockY, blockZ + offset); // Block to the right
      side2 = isOpaque(blockX, blockY + 1, blockZ + offset); // Block above
      corner = isOpaque(blockX + 1, blockY + 1, blockZ + offset); // Block to the right and above
    }
  
    if (side1 && side2) {
      return 0; // Fully occluded
    }
  
    return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0);
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

  private getBuffer(materialKey: string): BufferData {
    let buffer = this.buffers.get(materialKey)
    if (!buffer) {
      buffer = {
        positions: [],
        colors: [],
        uvs: [],
        indices: [],
        vertexCount: 0
      }
      this.buffers.set(materialKey, buffer)
    }
    return buffer
  }

  private applySideOverlay(
    blockType: number,
    normal: { x: number, y: number, z: number },
    color: {r:number, g:number, b:number},
    localY: number,
    height: number
  ): {r:number, g:number, b:number} {
    const overlay = blockRegistry.getSideOverlay(blockType)
    if (!overlay) return color
    if (!(normal.x !== 0 || normal.z !== 0)) return color
    const overlayStart = Math.max(0, height - overlay.height)
    const blend = Math.max(0, Math.min(1, (localY - overlayStart) / overlay.height))
    if (blend <= 0) return color
    
    // Lerp
    return {
      r: color.r + (overlay.color.r - color.r) * blend,
      g: color.g + (overlay.color.g - color.g) * blend,
      b: color.b + (overlay.color.b - color.b) * blend
    }
  }
}
