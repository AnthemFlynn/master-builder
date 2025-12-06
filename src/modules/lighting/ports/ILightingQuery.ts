// src/modules/lighting/ports/ILightingQuery.ts
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { LightValue } from '../domain/LightValue'

/**
 * Port for querying lighting data
 * Implemented by LightingService
 * Used by: Meshing module
 */
export interface ILightingQuery {
  /**
   * Get light value at world coordinates
   */
  getLight(worldX: number, worldY: number, worldZ: number): LightValue

  /**
   * Check if lighting has been calculated for chunk
   */
  isLightingReady(coord: ChunkCoordinate): boolean
}
