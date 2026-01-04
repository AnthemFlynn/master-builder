// src/modules/environment/application/CameraEffectsController.ts
/**
 * CameraEffectsController - Camera-based environmental effects
 *
 * Extracted from EnvironmentService to isolate camera effect logic.
 * Handles underwater detection with hysteresis to prevent rapid state switching.
 * Can be extended for additional effects (cave darkness, lava glow, etc.)
 */
import * as THREE from 'three'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { BlockType } from '../../world/domain/BlockType'

export interface CameraEffectsDependencies {
  camera: THREE.Camera
  onUnderwaterChange: (underwater: boolean) => void
}

export class CameraEffectsController {
  private camera: THREE.Camera
  private voxelQuery: IVoxelQuery | null = null
  private onUnderwaterChange: (underwater: boolean) => void

  // Hysteresis to prevent rapid underwater state switching at water surface
  private isCurrentlyUnderwater = false
  private lastTransitionY: number | null = null
  private readonly HYSTERESIS_DISTANCE = 0.5 // Must move 0.5 blocks past transition point to switch back

  constructor(deps: CameraEffectsDependencies) {
    this.camera = deps.camera
    this.onUnderwaterChange = deps.onUnderwaterChange
  }

  /**
   * Set voxel query for block detection
   */
  setVoxelQuery(voxelQuery: IVoxelQuery): void {
    this.voxelQuery = voxelQuery
  }

  /**
   * Update camera effects - call every frame
   */
  update(): void {
    this.checkUnderwater()
  }

  /**
   * Check if camera is underwater and apply hysteresis
   */
  private checkUnderwater(): void {
    if (!this.voxelQuery) return

    const pos = this.camera.position

    // Check block at camera's eye position
    const blockAtCamera = this.voxelQuery.getBlockType(
      Math.floor(pos.x),
      Math.floor(pos.y),
      Math.floor(pos.z)
    )

    const cameraInWater = blockAtCamera === BlockType.water

    // Apply hysteresis: once we transition, require movement past threshold to transition back
    if (this.lastTransitionY === null) {
      // First check - just set initial state
      this.isCurrentlyUnderwater = cameraInWater
      this.lastTransitionY = pos.y
      this.onUnderwaterChange(cameraInWater)
      return
    }

    if (this.isCurrentlyUnderwater) {
      // Currently underwater - only surface if we've moved UP past hysteresis AND not in water
      if (!cameraInWater && pos.y > this.lastTransitionY + this.HYSTERESIS_DISTANCE) {
        console.log(`🌊 Surfacing at y=${pos.y.toFixed(2)}`)
        this.isCurrentlyUnderwater = false
        this.lastTransitionY = pos.y
        this.onUnderwaterChange(false)
      }
    } else {
      // Currently above water - only submerge if we've moved DOWN past hysteresis AND in water
      if (cameraInWater && pos.y < this.lastTransitionY - this.HYSTERESIS_DISTANCE) {
        console.log(`🌊 Submerging at y=${pos.y.toFixed(2)}`)
        this.isCurrentlyUnderwater = true
        this.lastTransitionY = pos.y
        this.onUnderwaterChange(true)
      }
    }
  }

  /**
   * Get current underwater state
   */
  isUnderwater(): boolean {
    return this.isCurrentlyUnderwater
  }

  /**
   * Reset underwater state (e.g., when loading new world)
   */
  reset(): void {
    this.isCurrentlyUnderwater = false
    this.lastTransitionY = null
  }
}
