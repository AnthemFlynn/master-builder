/**
 * Value object representing mesh geometry data for a chunk.
 * Contains vertex buffers transferred from meshing workers.
 */
export interface MeshBuffers {
  positions: Float32Array
  colors: Float32Array
  uvs: Float32Array
  indices: Uint32Array
}

export interface MeshData {
  /** Chunk X coordinate */
  x: number
  /** Chunk Z coordinate */
  z: number
  /** Opaque geometry keyed by texture atlas index */
  opaqueGeometry: Record<string, MeshBuffers>
  /** Transparent geometry keyed by texture atlas index */
  transparentGeometry: Record<string, MeshBuffers>
  /** Time taken to generate mesh in milliseconds */
  timingMs: number
}
