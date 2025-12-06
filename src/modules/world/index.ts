// src/modules/world/index.ts
export { ChunkCoordinate } from './domain/ChunkCoordinate'
export { VoxelChunk } from './domain/VoxelChunk'
export { IVoxelQuery } from './ports/IVoxelQuery'
export { WorldService } from './application/WorldService'

// Lighting exports (now part of world)
export { LightValue, RGB, combineLightChannels, normalizeLightToColor } from './lighting-domain/LightValue'
export { LightData } from './lighting-domain/LightData'
export { ILightingQuery } from './lighting-ports/ILightingQuery'
export { LightingService } from './lighting-application/LightingService'
export { LightingPipeline } from './lighting-application/LightingPipeline'

// Domain classes NOT exported (private to module):
// - Internal helpers
// - Private utilities
