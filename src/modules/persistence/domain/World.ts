// src/modules/persistence/domain/World.ts

/**
 * World settings that can be customized per-world
 */
export interface WorldSettings {
  renderDistance: number
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard'
}

/**
 * World entity - represents a persistent game world
 *
 * A world contains the seed and settings used to generate terrain,
 * plus metadata about play history. Save slots are stored separately
 * but reference the world by ID.
 */
export interface World {
  id: string                              // UUID
  name: string                            // User-given name, e.g., "My Kingdom"
  seed: number                            // Terrain generation seed
  worldType: string                       // "default" | "flat" | "caves" | "forest" | "crystals"
  gameMode: 'creative' | 'survival'       // Creative has flight + infinite blocks
  createdAt: number                       // Timestamp when created
  lastPlayed: number                      // Timestamp of last session
  totalPlayTime: number                   // Total seconds played across all sessions
  thumbnail: string | null                // Base64 encoded screenshot
  settings: WorldSettings                 // Per-world settings
}

/**
 * Parameters for creating a new world
 */
export interface CreateWorldParams {
  name: string
  seed?: number                           // Auto-generated if not provided
  worldType?: string                      // Defaults to "default"
  gameMode?: 'creative' | 'survival'      // Defaults to "creative"
  settings?: Partial<WorldSettings>
}

/**
 * Default settings for new worlds
 */
export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
  renderDistance: 6,
  difficulty: 'peaceful'
}

/**
 * Generate a random seed for world generation
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647)
}

/**
 * Generate a UUID for world identification
 */
export function generateWorldId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Create a new World with default values
 */
export function createWorld(params: CreateWorldParams): World {
  return {
    id: generateWorldId(),
    name: params.name,
    seed: params.seed ?? generateSeed(),
    worldType: params.worldType ?? 'default',
    gameMode: params.gameMode ?? 'creative',
    createdAt: Date.now(),
    lastPlayed: Date.now(),
    totalPlayTime: 0,
    thumbnail: null,
    settings: {
      ...DEFAULT_WORLD_SETTINGS,
      ...params.settings
    }
  }
}
