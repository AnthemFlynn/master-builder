// src/shared/domain/ChunkData.ts
/**
 * ChunkData - Backward compatibility re-export
 *
 * The actual implementation is in ChunkColumn.ts which uses
 * vertical sections for better performance and memory efficiency.
 *
 * All existing code importing ChunkData will continue to work
 * without modification.
 */
export { ChunkColumn as ChunkData } from './ChunkColumn'
export { ChunkColumn } from './ChunkColumn'
