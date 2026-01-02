/**
 * Value object representing current render state.
 * Tracks loaded chunks and their visual representation.
 */
export interface ChunkRenderState {
  /** Chunk key (e.g., "0,0") */
  key: string
  /** Whether opaque mesh is loaded */
  hasOpaqueMesh: boolean
  /** Whether transparent mesh is loaded */
  hasTransparentMesh: boolean
  /** Last update timestamp */
  lastUpdate: number
}

export interface RenderState {
  /** Currently rendered chunks */
  chunks: Map<string, ChunkRenderState>
  /** Total vertex count */
  totalVertices: number
  /** Total triangle count */
  totalTriangles: number
}
