// src/modules/rendering/meshing-application/VertexBuilder.ts
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../../shared/ports/ILightingQuery'
import { blockRegistry } from '../../../modules/world/blocks'
import { RGB, combineLightChannels, normalizeLightToColor } from '../../../shared/domain/LightValue'
import { CHUNK_WIDTH, CHUNK_DEPTH, SEA_LEVEL } from '../../../shared/constants/ChunkConstants'

interface BufferData {
  positions: number[]
  normals: number[]  // Pre-computed normals to avoid expensive computeVertexNormals()
  colors: number[]
  uvs: number[]
  layers: number[]   // Texture array layer indices
  indices: number[]
  vertexCount: number
}

export class VertexBuilder {
  // Separate buffers for opaque and transparent geometry (Minecraft two-VBO approach)
  private opaqueBuffers = new Map<string, BufferData>()
  private transparentBuffers = new Map<string, BufferData>()
  private worldOffsetX: number
  private worldOffsetZ: number
  // Cache for hash values to avoid recalculating per-vertex
  private hashCache = new Map<string, number>()
  // Skip AO calculation for LOD meshers (performance optimization)
  private skipAO = false
  // Texture layer lookup (texture name -> layer index)
  private textureLayerLookup: ((name: string) => number) | null = null

  setSkipAO(skip: boolean): void {
    this.skipAO = skip
  }

  /**
   * Set the texture layer lookup function (for texture array rendering)
   */
  setTextureLayerLookup(lookup: (name: string) => number): void {
    this.textureLayerLookup = lookup
  }

  /**
   * Get texture layer index for a block face
   */
  private getTextureLayer(blockType: number, faceIndex: number): number {
    if (!this.textureLayerLookup) return 0
    const textureName = blockRegistry.getTextureForFace(blockType, faceIndex)
    return this.textureLayerLookup(textureName)
  }

  constructor(
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery,
    chunkX: number,
    chunkZ: number
  ) {
    this.worldOffsetX = chunkX * CHUNK_WIDTH
    this.worldOffsetZ = chunkZ * CHUNK_DEPTH
  }

  /**
   * Add cross-billboard quads (two intersecting planes forming X shape)
   * Used for flowers, tall grass, and other vegetation
   */
  addCrossQuads(
    x: number, y: number, z: number,
    blockType: number
  ): void {
    const materialKey = `${blockType}:cross`
    // Cross quads (flowers, grass) are always transparent
    const buffer = this.getBuffer(materialKey, true)

    // Get base color for the block (non-allocating - copy values immediately)
    const baseColorRGB = blockRegistry.getFaceColorRGB(blockType, { x: 0, y: 1, z: 0 })
    const baseColor = { r: baseColorRGB.r, g: baseColorRGB.g, b: baseColorRGB.b }

    // Get texture layer for cross-billboard (use face 0)
    const layer = this.getTextureLayer(blockType, 0)

    // Calculate world coordinates for lighting
    const worldX = Math.floor(x + this.worldOffsetX)
    const worldY = Math.floor(y)
    const worldZ = Math.floor(z + this.worldOffsetZ)

    // Sample lighting from above the block position
    const lightValue = this.lighting.getLight(worldX, worldY + 1, worldZ)
    const combined = combineLightChannels(lightValue)
    const light = normalizeLightToColor(combined)

    // Cross quads are centered in the block
    // Diagonal 1: from (0,0,0) to (1,1,1)
    // Diagonal 2: from (1,0,0) to (0,1,1)

    const crossVertices = [
      // First diagonal plane (NW to SE when viewed from above)
      // Note: V coordinates are flipped because Three.js flipY=true by default
      [
        { x: x, y: y, z: z, u: 0, v: 0 },           // bottom-left
        { x: x + 1, y: y, z: z + 1, u: 1, v: 0 },   // bottom-right
        { x: x + 1, y: y + 1, z: z + 1, u: 1, v: 1 }, // top-right
        { x: x, y: y + 1, z: z, u: 0, v: 1 }         // top-left
      ],
      // Second diagonal plane (NE to SW when viewed from above)
      [
        { x: x + 1, y: y, z: z, u: 0, v: 0 },       // bottom-left
        { x: x, y: y, z: z + 1, u: 1, v: 0 },       // bottom-right
        { x: x, y: y + 1, z: z + 1, u: 1, v: 1 },   // top-right
        { x: x + 1, y: y + 1, z: z, u: 0, v: 1 }     // top-left
      ]
    ]

    // Add variation for natural look
    const hash = this.hash(worldX, worldY, worldZ)
    const variation = 0.9 + hash * 0.2

    for (const quad of crossVertices) {
      // Add front face
      for (const v of quad) {
        buffer.positions.push(v.x, v.y, v.z)
        // Cross quads use (0, 1, 0) normal for consistent lighting
        buffer.normals.push(0, 1, 0)
        buffer.colors.push(
          light.r * baseColor.r * variation,
          light.g * baseColor.g * variation,
          light.b * baseColor.b * variation
        )
        buffer.uvs.push(v.u, v.v)
        buffer.layers.push(layer)
      }

      // Front face indices
      const i = buffer.vertexCount
      buffer.indices.push(i, i + 1, i + 2, i, i + 2, i + 3)
      buffer.vertexCount += 4

      // Add back face (same vertices, reversed winding)
      for (const v of quad) {
        buffer.positions.push(v.x, v.y, v.z)
        // Back face uses inverted normal
        buffer.normals.push(0, -1, 0)
        buffer.colors.push(
          light.r * baseColor.r * variation,
          light.g * baseColor.g * variation,
          light.b * baseColor.b * variation
        )
        buffer.uvs.push(v.u, v.v)
        buffer.layers.push(layer)
      }

      // Back face indices (reversed winding for back face)
      const j = buffer.vertexCount
      buffer.indices.push(j, j + 2, j + 1, j, j + 3, j + 2)
      buffer.vertexCount += 4
    }
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
    const blockDef = blockRegistry.get(blockType)
    const isTransparent = blockDef?.transparent ?? false
    const buffer = this.getBuffer(materialKey, isTransparent)
    const vertices = this.getQuadVertices(x, y, z, width, height, axis, direction)
    const normal = this.getFaceNormal(axis, direction)
    // Get face color (non-allocating - copy values immediately since the pooled object is reused)
    const baseColorRGB = blockRegistry.getFaceColorRGB(blockType, normal)
    const baseColor = { r: baseColorRGB.r, g: baseColorRGB.g, b: baseColorRGB.b }

    // Get texture layer for this face
    const layer = this.getTextureLayer(blockType, faceIndex)

    for (let i = 0; i < 4; i++) {
      const v = vertices[i]

      // Position (add world offset for rendering)
      buffer.positions.push(
        v.x,
        v.y,
        v.z
      )

      // Pre-computed normal (axis-aligned faces have trivial normals)
      buffer.normals.push(normal.x, normal.y, normal.z)

      // Calculate world coordinates once
      const worldX = Math.floor(v.x + this.worldOffsetX)
      const worldY = Math.floor(v.y)
      const worldZ = Math.floor(v.z + this.worldOffsetZ)

      // Smooth lighting: average 2×2 light samples around vertex for gradual transitions
      const light = this.getSmoothLight(worldX, worldY, worldZ, normal)

      // Calculate AO using world coordinates (skip for LOD meshers)
      const ao = this.skipAO ? 1.0 : 0.7 + (this.getVertexAO(worldX, worldY, worldZ, normal) / 6)

      // Apply lighting * AO
      const faceTint = this.getFaceTint(normal, worldX, worldY, worldZ)

      // Apply Overlay
      // We need a simple color object, not THREE.Color clone
      const overlay = this.applySideOverlay(blockType, normal, {r: baseColor.r, g: baseColor.g, b: baseColor.b}, v.y - y, height)

      // Apply water depth darkening (block ID 16 = water)
      const depthFactor = blockType === 16 ? this.getWaterDepthFactor(worldY) : 1.0

      buffer.colors.push(
        light.r * ao * overlay.r * faceTint * depthFactor,
        light.g * ao * overlay.g * faceTint * depthFactor,
        light.b * ao * overlay.b * faceTint * depthFactor
      )

      // UVs
      buffer.uvs.push(v.u, v.v)

      // Texture layer
      buffer.layers.push(layer)
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

  // Returns raw arrays instead of BufferGeometry - separate opaque and transparent for two-pass rendering
  getBuffers(): {
    opaque: Map<string, { positions: Float32Array, normals: Float32Array, colors: Float32Array, uvs: Float32Array, layers: Float32Array, indices: Uint16Array }>,
    transparent: Map<string, { positions: Float32Array, normals: Float32Array, colors: Float32Array, uvs: Float32Array, layers: Float32Array, indices: Uint16Array }>
  } {
    const convertBufferMap = (bufferMap: Map<string, BufferData>) => {
      const result = new Map<string, { positions: Float32Array, normals: Float32Array, colors: Float32Array, uvs: Float32Array, layers: Float32Array, indices: Uint16Array }>()
      for (const [key, buffer] of bufferMap.entries()) {
        if (buffer.positions.length === 0) continue
        result.set(key, {
          positions: new Float32Array(buffer.positions),
          normals: new Float32Array(buffer.normals),
          colors: new Float32Array(buffer.colors),
          uvs: new Float32Array(buffer.uvs),
          layers: new Float32Array(buffer.layers),
          indices: new Uint16Array(buffer.indices)
        })
      }
      return result
    }

    return {
      opaque: convertBufferMap(this.opaqueBuffers),
      transparent: convertBufferMap(this.transparentBuffers)
    }
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

  /**
   * Smooth lighting: Average 2×2 light samples around vertex position for gradual transitions.
   * Samples in the plane perpendicular to the face normal.
   */
  private getSmoothLight(
    worldX: number, worldY: number, worldZ: number,
    normal: { x: number, y: number, z: number }
  ): RGB {
    // Offset into the air block adjacent to the face
    let baseX = worldX
    let baseY = worldY
    let baseZ = worldZ

    if (normal.x < 0) baseX -= 1
    if (normal.y < 0) baseY -= 1
    if (normal.z < 0) baseZ -= 1

    // Sample 2×2 grid perpendicular to face normal
    // This creates smooth light transitions at edges where light levels differ
    let totalR = 0, totalG = 0, totalB = 0
    let sampleCount = 0

    // Determine which axes to sample (perpendicular to normal)
    const sampleOffsets = this.getSampleOffsets(normal)

    for (const offset of sampleOffsets) {
      const sampleX = baseX + offset.x
      const sampleY = baseY + offset.y
      const sampleZ = baseZ + offset.z

      const lightValue = this.lighting.getLight(sampleX, sampleY, sampleZ)
      const combined = combineLightChannels(lightValue)
      const light = normalizeLightToColor(combined)

      totalR += light.r
      totalG += light.g
      totalB += light.b
      sampleCount++
    }

    return {
      r: totalR / sampleCount,
      g: totalG / sampleCount,
      b: totalB / sampleCount
    }
  }

  /**
   * Get 2×2 sample offsets perpendicular to the face normal.
   */
  private getSampleOffsets(normal: { x: number, y: number, z: number }): Array<{ x: number, y: number, z: number }> {
    if (normal.y !== 0) {
      // Horizontal face (top/bottom): sample in X-Z plane
      return [
        { x: 0, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 0, z: -1 },
        { x: -1, y: 0, z: -1 }
      ]
    } else if (normal.x !== 0) {
      // X-facing face: sample in Y-Z plane
      return [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: -1 },
        { x: 0, y: -1, z: -1 }
      ]
    } else {
      // Z-facing face: sample in X-Y plane
      return [
        { x: 0, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: -1, y: -1, z: 0 }
      ]
    }
  }

  /**
   * Calculate water depth darkening factor.
   * Water gets darker the deeper it is (lower Y value).
   * Surface water (Y >= SEA_LEVEL) is full brightness, deep water is darker.
   */
  private getWaterDepthFactor(worldY: number): number {
    const MAX_DEPTH = 30  // Depth at which water is at minimum brightness

    if (worldY >= SEA_LEVEL) {
      return 1.0  // Surface water - full brightness
    }

    const depth = SEA_LEVEL - worldY
    const depthRatio = Math.min(depth / MAX_DEPTH, 1.0)

    // Darken from 1.0 (surface) to 0.3 (deep)
    return 1.0 - (depthRatio * 0.7)
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
    // Use cached value if available
    const key = `${x},${y},${z}`
    let cached = this.hashCache.get(key)
    if (cached !== undefined) return cached

    // Compute hash
    let seed = x * 374761393 + y * 668265263 + z * 3266489917
    seed = (seed ^ (seed >> 13)) >>> 0
    seed = (seed * 1274126177) >>> 0
    cached = (seed & 0xffffff) / 0xffffff

    this.hashCache.set(key, cached)
    return cached
  }

  private getBuffer(materialKey: string, isTransparent: boolean): BufferData {
    const bufferMap = isTransparent ? this.transparentBuffers : this.opaqueBuffers
    let buffer = bufferMap.get(materialKey)
    if (!buffer) {
      buffer = {
        positions: [],
        normals: [],
        colors: [],
        uvs: [],
        layers: [],
        indices: [],
        vertexCount: 0
      }
      bufferMap.set(materialKey, buffer)
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
