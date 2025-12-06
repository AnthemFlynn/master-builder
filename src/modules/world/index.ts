// src/modules/world/index.ts
export { ChunkCoordinate } from './domain/ChunkCoordinate'
export { VoxelChunk } from './domain/VoxelChunk'
export { IVoxelQuery } from './ports/IVoxelQuery'
export { WorldService } from './application/WorldService'

// Domain classes NOT exported (private to module):
// - Internal helpers
// - Private utilities
