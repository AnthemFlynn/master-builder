export type MeshingRequest = 
  | {
      type: 'GEN_MESH'
      x: number
      z: number
      neighborVoxels: Record<string, ArrayBuffer>
      neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
    }

// Geometry buffer structure for a single material
export type GeometryBuffers = {
  positions: ArrayBuffer
  normals: ArrayBuffer      // Pre-computed normals (axis-aligned)
  colors: ArrayBuffer
  uvs: ArrayBuffer
  layers: ArrayBuffer       // Texture array layer indices
  indices: ArrayBuffer
}

export type MeshingResponse =
  | {
      type: 'MESH_GENERATED'
      x: number
      z: number
      // Separate opaque and transparent geometry for two-pass rendering
      opaqueGeometry: Record<string, GeometryBuffers>
      transparentGeometry: Record<string, GeometryBuffers>
      timingMs: number
    }

export type WorkerMessage = MeshingRequest
export type MainMessage = MeshingResponse
