import { blockRegistry } from './application/BlockRegistry'
import { AIR_BLOCKS } from './domain/definitions/air'
import { GROUND_BLOCKS } from './domain/definitions/ground'
import { STONE_BLOCKS } from './domain/definitions/stone'
import { WOOD_BLOCKS } from './domain/definitions/wood'
import { ILLUMINATION_BLOCKS } from './domain/definitions/illumination'
import { METAL_BLOCKS } from './domain/definitions/metals'
import { TRANSPARENT_BLOCKS } from './domain/definitions/transparent'
import { FLUID_BLOCKS } from './domain/definitions/fluids'
import { DECORATION_BLOCKS } from './domain/definitions/decorations'

let initialized = false

/**
 * Initialize block registry with all block definitions
 * Call this once at application startup.
 * Safe to call multiple times - will only initialize once.
 */
export function initializeBlockRegistry(): void {
  // Skip if already initialized
  if (initialized) {
    return
  }

  // Register all block types
  blockRegistry.registerAll([
    ...AIR_BLOCKS,
    ...GROUND_BLOCKS,
    ...STONE_BLOCKS,
    ...WOOD_BLOCKS,
    ...ILLUMINATION_BLOCKS,
    ...METAL_BLOCKS,
    ...TRANSPARENT_BLOCKS,
    ...FLUID_BLOCKS,
    ...DECORATION_BLOCKS
  ])

  initialized = true
  console.log(`✅ BlockRegistry initialized with ${blockRegistry.size()} blocks`)
}

// Re-export for convenience
export { blockRegistry } from './application/BlockRegistry'
export * from './domain/types'
export type { IBlockRegistry } from './ports/IBlockRegistry'
