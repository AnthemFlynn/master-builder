// src/modules/meshing/application/VertexBuilder.ts
/**
 * VertexBuilder - Builds packed vertex buffers for voxel meshing
 *
 * Uses SOTA packed vertex format (12 bytes per vertex, 4× reduction from 48 bytes)
 * Based on techniques from Vercidium and Exile voxel engines.
 */
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../../shared/ports/ILightingQuery'
import { blockRegistry } from '../../../modules/world/blocks'
import { RGB, combineLightChannels, normalizeLightToColor } from '../../../shared/domain/LightValue'
import { CHUNK_WIDTH, CHUNK_DEPTH, SEA_LEVEL, SECTION_HEIGHT, MIN_Y } from '../../../shared/constants/ChunkConstants'
import { getNormalIndex, PACKED_VERTEX_UINT32S } from '../workers/types'

/**
 * Packed buffer data for a material group
 * Uses Uint32Array with 3 uint32s per vertex (12 bytes)
 */
interface PackedBufferData {
  // Packed vertex data: 3 uint32s per vertex
  packedVertices: number[]
  // Triangle indices (use Uint32 for large meshes)
  indices: number[]
  // Running vertex count
  vertexCount: number
}

/**
 * Vegetation instance data for InstancedMesh rendering
 * 16 bytes per instance
 */
interface VegetationInstance {
  x: number      // World X
  y: number      // World Y
  z: number      // World Z
  textureLayer: number
  variation: number  // Random 0-1 for rotation/scale
}

export class VertexBuilder {
  // Section-based buffers for frustum culling
  // Key format: "sectionIndex:materialKey" (e.g., "5:2:3" for section 5, block type 2, face 3)
  private opaqueBuffers = new Map<string, PackedBufferData>()
  private transparentBuffers = new Map<string, PackedBufferData>()

  // Vegetation instances (for InstancedMesh rendering)
  private vegetationInstances: VegetationInstance[] = []

  private worldOffsetX: number
  private worldOffsetZ: number

  // Cache for hash values to avoid recalculating per-vertex
  private hashCache = new Map<string, number>()

  // Skip AO calculation for LOD meshers
  private skipAO = false

  // Texture layer lookup (texture name -> layer index)
  private textureLayerLookup: ((name: string) => number) | null = null

  /**
   * Get section index from local Y coordinate (0 to CHUNK_HEIGHT-1)
   * Returns 0-23 for 24 sections
   */
  private getSectionIndex(localY: number): number {
    return Math.floor(localY / SECTION_HEIGHT)
  }

  setSkipAO(skip: boolean): void {
    this.skipAO = skip
  }

  setTextureLayerLookup(lookup: (name: string) => number): void {
    this.textureLayerLookup = lookup
  }

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
   * Add cross-billboard quads for vegetation
   * Collects instances for InstancedMesh rendering
   */
  addCrossQuads(
    x: number, y: number, z: number,
    blockType: number
  ): void {
    // Calculate world coordinates
    const worldX = Math.floor(x + this.worldOffsetX)
    const worldY = Math.floor(y)
    const worldZ = Math.floor(z + this.worldOffsetZ)

    // Get texture layer
    const layer = this.getTextureLayer(blockType, 0)

    // Add variation based on position hash
    const hash = this.hash(worldX, worldY, worldZ)

    // Collect vegetation instance for InstancedMesh rendering
    this.vegetationInstances.push({
      x: worldX,
      y: worldY,
      z: worldZ,
      textureLayer: layer,
      variation: hash
    })

    // Also generate geometry for fallback/transparent pass
    // (InstancedMesh will be used for opaque vegetation)
    const sectionIndex = this.getSectionIndex(y)
    const materialKey = `${sectionIndex}:${blockType}:cross`
    const buffer = this.getBuffer(materialKey, true)

    // Get base color
    const baseColorRGB = blockRegistry.getFaceColorRGB(blockType, { x: 0, y: 1, z: 0 })
    const baseColor = { r: baseColorRGB.r, g: baseColorRGB.g, b: baseColorRGB.b }

    // Sample lighting from above
    const lightValue = this.lighting.getLight(worldX, worldY + 1, worldZ)
    const combined = combineLightChannels(lightValue)
    const light = normalizeLightToColor(combined)

    // Variation for natural look
    const variation = 0.9 + hash * 0.2

    // Cross quad vertices
    const crossVertices = [
      // Diagonal 1 (NW to SE)
      [
        { x: x, y: y, z: z, u: 0, v: 0 },
        { x: x + 1, y: y, z: z + 1, u: 1, v: 0 },
        { x: x + 1, y: y + 1, z: z + 1, u: 1, v: 1 },
        { x: x, y: y + 1, z: z, u: 0, v: 1 }
      ],
      // Diagonal 2 (NE to SW)
      [
        { x: x + 1, y: y, z: z, u: 0, v: 0 },
        { x: x, y: y, z: z + 1, u: 1, v: 0 },
        { x: x, y: y + 1, z: z + 1, u: 1, v: 1 },
        { x: x + 1, y: y + 1, z: z, u: 0, v: 1 }
      ]
    ]

    // Normal index for cross (use +Y for consistent lighting)
    const normalIndex = 2 // +Y

    for (const quad of crossVertices) {
      // Front face
      for (const v of quad) {
        const color = {
          r: light.r * baseColor.r * variation,
          g: light.g * baseColor.g * variation,
          b: light.b * baseColor.b * variation
        }
        this.addPackedVertex(buffer, v.x, v.y, v.z, normalIndex, 3, v.u, v.v, layer, color)
      }

      // Front face indices
      const i = buffer.vertexCount - 4
      buffer.indices.push(i, i + 1, i + 2, i, i + 2, i + 3)

      // Back face (same vertices, opposite normal, reversed winding)
      const backNormalIndex = 3 // -Y
      for (const v of quad) {
        const color = {
          r: light.r * baseColor.r * variation,
          g: light.g * baseColor.g * variation,
          b: light.b * baseColor.b * variation
        }
        this.addPackedVertex(buffer, v.x, v.y, v.z, backNormalIndex, 3, v.u, v.v, layer, color)
      }

      // Back face indices (reversed winding)
      const j = buffer.vertexCount - 4
      buffer.indices.push(j, j + 2, j + 1, j, j + 3, j + 2)
    }
  }

  /**
   * Add a quad face with packed vertex format
   * Organizes geometry by section for frustum culling
   */
  addQuad(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1,
    blockType: number,
    faceIndex: number
  ): void {
    // Section-based key for per-section frustum culling
    const sectionIndex = this.getSectionIndex(y)
    const materialKey = `${sectionIndex}:${blockType}:${faceIndex}`
    const blockDef = blockRegistry.get(blockType)
    const isTransparent = blockDef?.transparent ?? false
    const buffer = this.getBuffer(materialKey, isTransparent)

    const vertices = this.getQuadVertices(x, y, z, width, height, axis, direction)
    const normal = this.getFaceNormal(axis, direction)
    const normalIndex = getNormalIndex(normal)

    // Get base color
    const baseColorRGB = blockRegistry.getFaceColorRGB(blockType, normal)
    const baseColor = { r: baseColorRGB.r, g: baseColorRGB.g, b: baseColorRGB.b }

    // Get texture layer
    const layer = this.getTextureLayer(blockType, faceIndex)

    for (let i = 0; i < 4; i++) {
      const v = vertices[i]

      // World coordinates
      const worldX = Math.floor(v.x + this.worldOffsetX)
      const worldY = Math.floor(v.y)
      const worldZ = Math.floor(v.z + this.worldOffsetZ)

      // Smooth lighting
      const light = this.getSmoothLight(worldX, worldY, worldZ, normal)

      // AO (0-3 discrete levels)
      const aoRaw = this.skipAO ? 3 : this.getVertexAO(worldX, worldY, worldZ, normal)
      const aoLevel = Math.min(3, Math.max(0, aoRaw))
      const aoFactor = 0.7 + (aoLevel / 3) * 0.3

      // Face tint
      const faceTint = this.getFaceTint(normal, worldX, worldY, worldZ)

      // Side overlay
      const overlay = this.applySideOverlay(
        blockType, normal,
        { r: baseColor.r, g: baseColor.g, b: baseColor.b },
        v.y - y, height
      )

      // Water depth
      const depthFactor = blockType === 16 ? this.getWaterDepthFactor(worldY) : 1.0

      // Final color
      const color = {
        r: light.r * aoFactor * overlay.r * faceTint * depthFactor,
        g: light.g * aoFactor * overlay.g * faceTint * depthFactor,
        b: light.b * aoFactor * overlay.b * faceTint * depthFactor
      }

      // Clamp UV to 0-255 range for packing
      const packedU = Math.min(255, Math.max(0, Math.round(v.u * 16))) // Scale for tiling
      const packedV = Math.min(255, Math.max(0, Math.round(v.v * 16)))

      this.addPackedVertex(buffer, v.x, v.y, v.z, normalIndex, aoLevel, packedU, packedV, layer, color)
    }

    // Indices for quad (2 triangles)
    const idx = buffer.vertexCount - 4
    const needsFlip = (
      (axis === 0 && direction === 1) ||
      (axis === 1 && direction === 1) ||
      (axis === 2 && direction === -1)
    )

    if (needsFlip) {
      buffer.indices.push(idx, idx + 2, idx + 1, idx, idx + 3, idx + 2)
    } else {
      buffer.indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3)
    }
  }

  /**
   * Add a single packed vertex to the buffer
   */
  private addPackedVertex(
    buffer: PackedBufferData,
    x: number, y: number, z: number,
    normalIndex: number, aoLevel: number,
    u: number, v: number, textureLayer: number,
    color: { r: number, g: number, b: number }
  ): void {
    // Clamp position to valid range
    const px = Math.min(31, Math.max(0, Math.floor(x))) & 0x1F
    const pz = Math.min(31, Math.max(0, Math.floor(z))) & 0x1F
    const py = Math.min(511, Math.max(0, Math.floor(y))) & 0x1FF

    // Pack uint32[0]: Position + Normal + AO
    const packed0 =
      (px << 0) |
      (pz << 5) |
      (py << 10) |
      ((normalIndex & 0x7) << 19) |
      ((aoLevel & 0x3) << 22)

    // Pack uint32[1]: UV + Texture
    const packed1 =
      ((u & 0xFF) << 0) |
      ((v & 0xFF) << 8) |
      ((textureLayer & 0xFFF) << 16)

    // Pack uint32[2]: Color RGB8
    const r8 = Math.min(255, Math.max(0, Math.round(color.r * 255))) & 0xFF
    const g8 = Math.min(255, Math.max(0, Math.round(color.g * 255))) & 0xFF
    const b8 = Math.min(255, Math.max(0, Math.round(color.b * 255))) & 0xFF
    const packed2 = (r8 << 0) | (g8 << 8) | (b8 << 16)

    buffer.packedVertices.push(packed0, packed1, packed2)
    buffer.vertexCount++
  }

  /**
   * Get packed buffers for rendering
   * Organized by section for per-section frustum culling
   *
   * Key format: "sectionIndex:blockType:faceIndex"
   * ChunkRenderer parses this to create per-section meshes
   */
  getPackedBuffers(): {
    opaque: Map<string, { packedVertices: Uint32Array, indices: Uint32Array }>,
    transparent: Map<string, { packedVertices: Uint32Array, indices: Uint32Array }>,
    vegetation: { instances: Float32Array, count: number },
    // Helper: list of non-empty sections for efficient iteration
    nonEmptySections: Set<number>
  } {
    const nonEmptySections = new Set<number>()

    const convertBufferMap = (bufferMap: Map<string, PackedBufferData>) => {
      const result = new Map<string, { packedVertices: Uint32Array, indices: Uint32Array }>()
      for (const [key, buffer] of bufferMap.entries()) {
        if (buffer.packedVertices.length === 0) continue

        // Extract section index from key (format: "sectionIndex:blockType:faceIndex")
        const sectionIndex = parseInt(key.split(':')[0], 10)
        nonEmptySections.add(sectionIndex)

        result.set(key, {
          packedVertices: new Uint32Array(buffer.packedVertices),
          indices: new Uint32Array(buffer.indices)
        })
      }
      return result
    }

    // Pack vegetation instances (4 floats per instance: x, y, z, packed data)
    const vegData = new Float32Array(this.vegetationInstances.length * 4)
    for (let i = 0; i < this.vegetationInstances.length; i++) {
      const inst = this.vegetationInstances[i]
      vegData[i * 4 + 0] = inst.x
      vegData[i * 4 + 1] = inst.y
      vegData[i * 4 + 2] = inst.z
      // Pack texture layer (12 bits) + variation (20 bits) into float
      const packed = (inst.textureLayer & 0xFFF) | (Math.floor(inst.variation * 0xFFFFF) << 12)
      vegData[i * 4 + 3] = packed
    }

    return {
      opaque: convertBufferMap(this.opaqueBuffers),
      transparent: convertBufferMap(this.transparentBuffers),
      vegetation: {
        instances: vegData,
        count: this.vegetationInstances.length
      },
      nonEmptySections
    }
  }

  /**
   * Legacy getBuffers for backwards compatibility
   * Converts packed format back to separate arrays
   */
  getBuffers(): {
    opaque: Map<string, { positions: Float32Array, normals: Float32Array, colors: Float32Array, uvs: Float32Array, layers: Float32Array, indices: Uint16Array }>,
    transparent: Map<string, { positions: Float32Array, normals: Float32Array, colors: Float32Array, uvs: Float32Array, layers: Float32Array, indices: Uint16Array }>
  } {
    const packed = this.getPackedBuffers()

    const unpackBufferMap = (bufferMap: Map<string, { packedVertices: Uint32Array, indices: Uint32Array }>) => {
      const result = new Map<string, { positions: Float32Array, normals: Float32Array, colors: Float32Array, uvs: Float32Array, layers: Float32Array, indices: Uint16Array }>()

      for (const [key, buffer] of bufferMap.entries()) {
        const vertexCount = buffer.packedVertices.length / PACKED_VERTEX_UINT32S
        const positions = new Float32Array(vertexCount * 3)
        const normals = new Float32Array(vertexCount * 3)
        const colors = new Float32Array(vertexCount * 3)
        const uvs = new Float32Array(vertexCount * 2)
        const layers = new Float32Array(vertexCount)

        // Normal vectors lookup
        const normalVectors = [
          [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
        ]

        for (let i = 0; i < vertexCount; i++) {
          const p0 = buffer.packedVertices[i * 3 + 0]
          const p1 = buffer.packedVertices[i * 3 + 1]
          const p2 = buffer.packedVertices[i * 3 + 2]

          // Unpack position
          const x = (p0 >> 0) & 0x1F
          const z = (p0 >> 5) & 0x1F
          const y = (p0 >> 10) & 0x1FF
          const normalIdx = (p0 >> 19) & 0x7

          // Unpack UV + texture
          const u = ((p1 >> 0) & 0xFF) / 16 // Unscale
          const v = ((p1 >> 8) & 0xFF) / 16
          const layer = (p1 >> 16) & 0xFFF

          // Unpack color
          const r = ((p2 >> 0) & 0xFF) / 255
          const g = ((p2 >> 8) & 0xFF) / 255
          const b = ((p2 >> 16) & 0xFF) / 255

          positions[i * 3 + 0] = x
          positions[i * 3 + 1] = y
          positions[i * 3 + 2] = z

          const nv = normalVectors[normalIdx] || [0, 1, 0]
          normals[i * 3 + 0] = nv[0]
          normals[i * 3 + 1] = nv[1]
          normals[i * 3 + 2] = nv[2]

          colors[i * 3 + 0] = r
          colors[i * 3 + 1] = g
          colors[i * 3 + 2] = b

          uvs[i * 2 + 0] = u
          uvs[i * 2 + 1] = v

          layers[i] = layer
        }

        // Convert indices to Uint16 if possible
        const indices = buffer.indices.length <= 65536
          ? new Uint16Array(buffer.indices)
          : new Uint16Array(buffer.indices) // Will truncate large values

        result.set(key, { positions, normals, colors, uvs, layers, indices })
      }

      return result
    }

    return {
      opaque: unpackBufferMap(packed.opaque),
      transparent: unpackBufferMap(packed.transparent)
    }
  }

  // === Private helper methods ===

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

    const isOpaque = (bx: number, by: number, bz: number) => {
      const blockType = this.voxels.getBlockType(bx, by, bz)
      if (blockType === -1) return false
      const blockDef = blockRegistry.get(blockType)
      return !(blockDef && blockDef.transparent)
    }

    if (normal.y === 1) {
      side1 = isOpaque(blockX + 1, blockY + 1, blockZ)
      side2 = isOpaque(blockX, blockY + 1, blockZ + 1)
      corner = isOpaque(blockX + 1, blockY + 1, blockZ + 1)
    } else if (normal.y === -1) {
      side1 = isOpaque(blockX + 1, blockY - 1, blockZ)
      side2 = isOpaque(blockX, blockY - 1, blockZ + 1)
      corner = isOpaque(blockX + 1, blockY - 1, blockZ + 1)
    } else if (normal.x !== 0) {
      const offset = normal.x
      side1 = isOpaque(blockX + offset, blockY + 1, blockZ)
      side2 = isOpaque(blockX + offset, blockY, blockZ + 1)
      corner = isOpaque(blockX + offset, blockY + 1, blockZ + 1)
    } else {
      const offset = normal.z
      side1 = isOpaque(blockX + 1, blockY, blockZ + offset)
      side2 = isOpaque(blockX, blockY + 1, blockZ + offset)
      corner = isOpaque(blockX + 1, blockY + 1, blockZ + offset)
    }

    if (side1 && side2) return 0
    return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0)
  }

  private getSmoothLight(
    worldX: number, worldY: number, worldZ: number,
    normal: { x: number, y: number, z: number }
  ): RGB {
    let baseX = worldX, baseY = worldY, baseZ = worldZ

    if (normal.x < 0) baseX -= 1
    if (normal.y < 0) baseY -= 1
    if (normal.z < 0) baseZ -= 1

    let totalR = 0, totalG = 0, totalB = 0
    let sampleCount = 0

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

  private getSampleOffsets(normal: { x: number, y: number, z: number }): Array<{ x: number, y: number, z: number }> {
    if (normal.y !== 0) {
      return [
        { x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: 0, z: -1 }, { x: -1, y: 0, z: -1 }
      ]
    } else if (normal.x !== 0) {
      return [
        { x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: -1 }, { x: 0, y: -1, z: -1 }
      ]
    } else {
      return [
        { x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 }, { x: -1, y: -1, z: 0 }
      ]
    }
  }

  private getWaterDepthFactor(worldY: number): number {
    const MAX_DEPTH = 30
    if (worldY >= SEA_LEVEL) return 1.0
    const depth = SEA_LEVEL - worldY
    const depthRatio = Math.min(depth / MAX_DEPTH, 1.0)
    return 1.0 - (depthRatio * 0.7)
  }

  private getFaceTint(
    normal: { x: number, y: number, z: number },
    worldX: number, worldY: number, worldZ: number
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
    const key = `${x},${y},${z}`
    let cached = this.hashCache.get(key)
    if (cached !== undefined) return cached

    let seed = x * 374761393 + y * 668265263 + z * 3266489917
    seed = (seed ^ (seed >> 13)) >>> 0
    seed = (seed * 1274126177) >>> 0
    cached = (seed & 0xffffff) / 0xffffff

    this.hashCache.set(key, cached)
    return cached
  }

  private getBuffer(materialKey: string, isTransparent: boolean): PackedBufferData {
    const bufferMap = isTransparent ? this.transparentBuffers : this.opaqueBuffers
    let buffer = bufferMap.get(materialKey)
    if (!buffer) {
      buffer = {
        packedVertices: [],
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
    color: { r: number, g: number, b: number },
    localY: number,
    height: number
  ): { r: number, g: number, b: number } {
    const overlay = blockRegistry.getSideOverlay(blockType)
    if (!overlay) return color
    if (!(normal.x !== 0 || normal.z !== 0)) return color

    const overlayStart = Math.max(0, height - overlay.height)
    const blend = Math.max(0, Math.min(1, (localY - overlayStart) / overlay.height))
    if (blend <= 0) return color

    return {
      r: color.r + (overlay.color.r - color.r) * blend,
      g: color.g + (overlay.color.g - color.g) * blend,
      b: color.b + (overlay.color.b - color.b) * blend
    }
  }
}
