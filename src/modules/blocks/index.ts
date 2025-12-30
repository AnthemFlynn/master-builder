import { blockRegistry } from './application/BlockRegistry'
import { AIR_BLOCKS } from './domain/definitions/air'
import { GROUND_BLOCKS } from './domain/definitions/ground'
import { STONE_BLOCKS } from './domain/definitions/stone'
import { WOOD_BLOCKS } from './domain/definitions/wood'
import { ILLUMINATION_BLOCKS } from './domain/definitions/illumination'
import { METAL_BLOCKS } from './domain/definitions/metals'
import { TRANSPARENT_BLOCKS } from './domain/definitions/transparent'

/**
 * Initialize block registry with all block definitions
 * Call this once at application startup
 */
export function initializeBlockRegistry(): void {
  // Register all block types
  blockRegistry.registerAll([
    ...AIR_BLOCKS,
    ...GROUND_BLOCKS,
    ...STONE_BLOCKS,
    ...WOOD_BLOCKS,
    ...ILLUMINATION_BLOCKS,
    ...METAL_BLOCKS,
    ...TRANSPARENT_BLOCKS
  ])

  console.log(`✅ BlockRegistry initialized with ${blockRegistry.size()} blocks`)
}

// Re-export for convenience
export { blockRegistry } from './application/BlockRegistry'
export * from './domain/types'
