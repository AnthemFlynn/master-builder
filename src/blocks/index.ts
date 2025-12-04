import { blockRegistry } from './BlockRegistry'
import { GROUND_BLOCKS } from './definitions/ground'
import { STONE_BLOCKS } from './definitions/stone'
import { WOOD_BLOCKS } from './definitions/wood'
import { ILLUMINATION_BLOCKS } from './definitions/illumination'
import { METAL_BLOCKS } from './definitions/metals'
import { TRANSPARENT_BLOCKS } from './definitions/transparent'

/**
 * Initialize block registry with all block definitions
 * Call this once at application startup
 */
export function initializeBlockRegistry(): void {
  // Register all block types
  blockRegistry.registerAll([
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
export { blockRegistry } from './BlockRegistry'
export * from './types'
