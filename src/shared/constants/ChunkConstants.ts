// src/shared/constants/ChunkConstants.ts
// Minecraft 1.18+ standard chunk dimensions

/**
 * Horizontal chunk dimensions (X and Z)
 * Minecraft uses 16x16 horizontal chunks
 */
export const CHUNK_WIDTH = 16
export const CHUNK_DEPTH = 16

/**
 * Total world height (Y axis)
 * Minecraft 1.18+ uses 384 blocks (-64 to 320)
 */
export const CHUNK_HEIGHT = 384

/**
 * Vertical section height
 * Each chunk column is divided into 16-block tall sections
 * for efficient culling and sparse storage
 */
export const SECTION_HEIGHT = 16

/**
 * Number of vertical sections per chunk column
 * 384 / 16 = 24 sections
 */
export const SECTIONS_PER_CHUNK = CHUNK_HEIGHT / SECTION_HEIGHT  // 24

/**
 * Blocks per section (16 x 16 x 16)
 */
export const BLOCKS_PER_SECTION = CHUNK_WIDTH * CHUNK_DEPTH * SECTION_HEIGHT  // 4096

/**
 * World Y coordinate bounds (Minecraft 1.18+ style)
 */
export const MIN_Y = -64
export const MAX_Y = 320  // MIN_Y + CHUNK_HEIGHT = -64 + 384 = 320

/**
 * Sea level (water surface Y coordinate)
 * Minecraft 1.18+ uses Y=64
 */
export const SEA_LEVEL = 64

/**
 * Convert world Y to section index (0-23)
 */
export function worldYToSectionIndex(worldY: number): number {
  return Math.floor((worldY - MIN_Y) / SECTION_HEIGHT)
}

/**
 * Convert section index to world Y (bottom of section)
 */
export function sectionIndexToWorldY(sectionIndex: number): number {
  return MIN_Y + sectionIndex * SECTION_HEIGHT
}

/**
 * Convert world coordinates to chunk coordinates
 */
export function worldToChunkCoord(worldX: number, worldZ: number): { x: number, z: number } {
  return {
    x: Math.floor(worldX / CHUNK_WIDTH),
    z: Math.floor(worldZ / CHUNK_DEPTH)
  }
}

/**
 * Convert world coordinates to local chunk coordinates (0-15)
 */
export function worldToLocalCoord(worldX: number, worldZ: number): { x: number, z: number } {
  return {
    x: ((worldX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH,
    z: ((worldZ % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH
  }
}

/**
 * Convert chunk coordinates to world coordinates (chunk origin)
 */
export function chunkToWorldCoord(chunkX: number, chunkZ: number): { x: number, z: number } {
  return {
    x: chunkX * CHUNK_WIDTH,
    z: chunkZ * CHUNK_DEPTH
  }
}

/**
 * Check if world Y is within valid bounds
 */
export function isValidWorldY(worldY: number): boolean {
  return worldY >= MIN_Y && worldY < MAX_Y
}

/**
 * Clamp world Y to valid bounds
 */
export function clampWorldY(worldY: number): number {
  return Math.max(MIN_Y, Math.min(MAX_Y - 1, worldY))
}
