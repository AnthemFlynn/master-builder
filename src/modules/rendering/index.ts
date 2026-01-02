// src/modules/rendering/index.ts
export { RenderingService } from './application/RenderingService'
export { MeshingService } from './meshing-application/MeshingService'
export type { IMeshingService } from './ports/IMeshingService'

// Private to module (not exported):
// - ChunkRenderer, MaterialSystem
// - VertexBuilder, GreedyMesher
