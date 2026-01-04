// src/modules/meshing/workers/types.ts

export type MeshingRequest =
  | {
      type: 'GEN_MESH'
      x: number
      z: number
      lodLevel?: 0 | 1 | 2 | 3  // LOD level (0 = full detail, 3 = lowest detail)
      neighborVoxels: Record<string, ArrayBuffer>
      neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
      textureLayerMap?: Record<string, number>
      useNativeFormat?: boolean  // If true, neighborVoxels are in serializeNative() format
    }

/**
 * Packed Vertex Format (12 bytes = 3 × uint32)
 *
 * This SOTA format reduces vertex size from 48 bytes to 12 bytes (4× reduction).
 * Based on techniques from Vercidium and Exile voxel engines.
 *
 * uint32[0]: Position + Normal + AO
 * ├─ bits 0-4:   X position (0-31, local chunk coords)
 * ├─ bits 5-9:   Z position (0-31, local chunk coords)
 * ├─ bits 10-18: Y position (0-511, supports world height)
 * ├─ bits 19-21: Normal index (0-5 for ±X/±Y/±Z)
 * ├─ bits 22-23: AO level (0-3, 4 discrete levels)
 * ├─ bits 24-31: unused (8 bits, reserved)
 *
 * uint32[1]: UV + Texture Layer
 * ├─ bits 0-7:   U coordinate (0-255, for greedy mesh tiling)
 * ├─ bits 8-15:  V coordinate (0-255, for greedy mesh tiling)
 * ├─ bits 16-27: Texture layer (0-4095, texture array index)
 * ├─ bits 28-31: unused (4 bits, reserved)
 *
 * uint32[2]: Color RGB8
 * ├─ bits 0-7:   Red (0-255)
 * ├─ bits 8-15:  Green (0-255)
 * ├─ bits 16-23: Blue (0-255)
 * ├─ bits 24-31: unused (8 bits, could be alpha)
 */
export const PACKED_VERTEX_SIZE = 12  // bytes per vertex (3 × uint32)
export const PACKED_VERTEX_UINT32S = 3 // uint32s per vertex

// Helper to pack a vertex (for worker use)
export function packVertex(
  x: number, z: number, y: number,
  normalIndex: number, aoLevel: number,
  u: number, v: number, textureLayer: number,
  r: number, g: number, b: number
): Uint32Array {
  const packed = new Uint32Array(3)

  // uint32[0]: Position + Normal + AO
  packed[0] =
    ((x & 0x1F) << 0) |           // bits 0-4
    ((z & 0x1F) << 5) |           // bits 5-9
    ((y & 0x1FF) << 10) |         // bits 10-18
    ((normalIndex & 0x7) << 19) | // bits 19-21
    ((aoLevel & 0x3) << 22)       // bits 22-23

  // uint32[1]: UV + Texture
  packed[1] =
    ((u & 0xFF) << 0) |           // bits 0-7
    ((v & 0xFF) << 8) |           // bits 8-15
    ((textureLayer & 0xFFF) << 16) // bits 16-27

  // uint32[2]: Color RGB8
  packed[2] =
    ((r & 0xFF) << 0) |           // bits 0-7
    ((g & 0xFF) << 8) |           // bits 8-15
    ((b & 0xFF) << 16)            // bits 16-23

  return packed
}

// Normal index to vector mapping (used in shader)
export const NORMAL_VECTORS = [
  { x: 1, y: 0, z: 0 },   // 0: +X
  { x: -1, y: 0, z: 0 },  // 1: -X
  { x: 0, y: 1, z: 0 },   // 2: +Y
  { x: 0, y: -1, z: 0 },  // 3: -Y
  { x: 0, y: 0, z: 1 },   // 4: +Z
  { x: 0, y: 0, z: -1 }   // 5: -Z
]

// Get normal index from normal vector
export function getNormalIndex(normal: { x: number, y: number, z: number }): number {
  if (normal.x === 1) return 0
  if (normal.x === -1) return 1
  if (normal.y === 1) return 2
  if (normal.y === -1) return 3
  if (normal.z === 1) return 4
  return 5 // -Z
}

// Packed geometry buffers (simplified from separate arrays)
export type PackedGeometryBuffers = {
  packedVertices: ArrayBuffer  // Uint32Array, 3 uint32s per vertex
  indices: ArrayBuffer         // Uint32Array for large meshes
}

// Legacy geometry buffer structure (kept for backwards compatibility during migration)
export type GeometryBuffers = {
  positions: ArrayBuffer
  normals: ArrayBuffer
  colors: ArrayBuffer
  uvs: ArrayBuffer
  layers: ArrayBuffer
  indices: ArrayBuffer
}

export type MeshingResponse =
  | {
      type: 'MESH_GENERATED'
      x: number
      z: number
      lodLevel: 0 | 1 | 2 | 3  // LOD level this mesh was built at
      // New packed format (keys are "sectionIndex:blockType:faceIndex")
      opaquePackedGeometry: Record<string, PackedGeometryBuffers>
      transparentPackedGeometry: Record<string, PackedGeometryBuffers>
      // Non-empty sections for efficient per-section culling
      nonEmptySections: number[]  // Array of section indices (0-23) with geometry
      // Vegetation instances (for InstancedMesh)
      vegetationInstances?: ArrayBuffer  // Packed vegetation instance data
      vegetationCount?: number
      timingMs: number
    }

export type WorkerMessage = MeshingRequest
export type MainMessage = MeshingResponse
