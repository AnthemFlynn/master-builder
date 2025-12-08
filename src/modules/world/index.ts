// src/modules/world/index.ts
export { WorldService } from './application/WorldService'

// Note: ChunkCoordinate and IVoxelQuery are now in src/shared
// but we can re-export them for convenience if needed, 
// or consumers should import from shared.
// For now, let's keep the module exports clean.