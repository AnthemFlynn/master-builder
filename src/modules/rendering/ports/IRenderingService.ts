import { RenderState } from '../domain/RenderState'

/**
 * Port interface for the rendering service.
 * Handles chunk mesh rendering via Three.js.
 */
export interface IRenderingService {
  /**
   * Get current render state for debugging/monitoring
   */
  getRenderState?(): RenderState
}
