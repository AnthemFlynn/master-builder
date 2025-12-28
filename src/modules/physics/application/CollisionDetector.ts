import * as THREE from 'three'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ICollisionQuery } from '../ports/ICollisionQuery'

interface SweepResult {
  value: number
  collided: boolean
}

// Extended voxel query interface that includes water detection
interface IExtendedVoxelQuery extends IVoxelQuery {
  isBlockWater?(worldX: number, worldY: number, worldZ: number): boolean
}

export class CollisionDetector implements ICollisionQuery {
  private playerRadius = 0.4
  private playerHeight = 1.8
  private eyeOffset = 1.6
  private stepSize = 0.1
  private maxStepUp = 0.6  // Max height player can auto-climb (Minecraft-like)

  // Pre-allocated vectors to avoid GC pressure in physics loop
  private readonly workingPosition = new THREE.Vector3()
  private readonly testPosition = new THREE.Vector3()
  private readonly resultPosition = new THREE.Vector3()
  private readonly stepUpPosition = new THREE.Vector3()

  constructor(private voxels: IExtendedVoxelQuery) {}

  /**
   * Check if player is submerged in water (body is in water)
   * Returns depth: 0 = not in water, 1 = feet in water, 2 = fully submerged
   */
  getWaterDepth(position: THREE.Vector3): number {
    if (!this.voxels.isBlockWater) return 0

    const feetY = this.getFeetY(position)
    const headY = position.y

    // Check at feet level
    const feetInWater = this.voxels.isBlockWater(
      Math.floor(position.x),
      Math.floor(feetY),
      Math.floor(position.z)
    )

    // Check at head level
    const headInWater = this.voxels.isBlockWater(
      Math.floor(position.x),
      Math.floor(headY),
      Math.floor(position.z)
    )

    if (headInWater) return 2  // Fully submerged
    if (feetInWater) return 1  // Wading
    return 0                    // Not in water
  }

  moveWithCollisions(position: THREE.Vector3, delta: THREE.Vector3): THREE.Vector3 {
    this.workingPosition.copy(position)

    // First, try normal horizontal movement
    const sweepX = this.sweepAxis(this.workingPosition, delta.x, 'x')
    this.workingPosition.x = sweepX.value

    const sweepZ = this.sweepAxis(this.workingPosition, delta.z, 'z')
    this.workingPosition.z = sweepZ.value

    // If we hit something, try step-up (Minecraft-style auto-climb)
    if (sweepX.collided || sweepZ.collided) {
      // Check if we can step up to clear the obstacle
      const stepUpHeight = this.findStepUpHeight(position, delta)

      if (stepUpHeight > 0 && stepUpHeight <= this.maxStepUp) {
        // Try movement from stepped-up position
        this.stepUpPosition.copy(position)
        this.stepUpPosition.y += stepUpHeight + 0.01  // Small buffer

        // Check if stepped-up position is clear
        if (!this.intersectsWorld(this.stepUpPosition)) {
          // Try horizontal movement from stepped-up position
          const steppedSweepX = this.sweepAxis(this.stepUpPosition, delta.x, 'x')
          this.stepUpPosition.x = steppedSweepX.value

          const steppedSweepZ = this.sweepAxis(this.stepUpPosition, delta.z, 'z')
          this.stepUpPosition.z = steppedSweepZ.value

          // If we made more progress with step-up, use that position
          const originalProgress = Math.abs(this.workingPosition.x - position.x) + Math.abs(this.workingPosition.z - position.z)
          const steppedProgress = Math.abs(this.stepUpPosition.x - position.x) + Math.abs(this.stepUpPosition.z - position.z)

          if (steppedProgress > originalProgress) {
            // Step up was successful - settle back down to ground
            const settleResult = this.settleToGround(this.stepUpPosition)
            this.workingPosition.copy(settleResult)
          }
        }
      }
    }

    // Return a copy since caller may store the result
    return this.resultPosition.copy(this.workingPosition)
  }

  moveVertical(position: THREE.Vector3, deltaY: number): { position: THREE.Vector3; collided: boolean } {
    this.workingPosition.copy(position)
    const sweepY = this.sweepAxis(this.workingPosition, deltaY, 'y')
    this.workingPosition.y = sweepY.value
    // Return a copy since caller may store the result
    return { position: this.resultPosition.copy(this.workingPosition), collided: sweepY.collided }
  }

  isGrounded(position: THREE.Vector3): boolean {
    const feetY = this.getFeetY(position) - 0.05
    const minX = Math.floor(position.x - this.playerRadius)
    const maxX = Math.floor(position.x + this.playerRadius)
    const minZ = Math.floor(position.z - this.playerRadius)
    const maxZ = Math.floor(position.z + this.playerRadius)
    const sampleY = Math.floor(feetY)

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (this.voxels.isBlockSolid(x, sampleY, z)) {
          return true
        }
      }
    }

    return false
  }

  private sweepAxis(position: THREE.Vector3, delta: number, axis: 'x' | 'y' | 'z'): SweepResult {
    if (delta === 0) {
      return { value: position[axis], collided: false }
    }

    const step = Math.sign(delta) * this.stepSize
    let travelled = 0
    let currentValue = position[axis]
    let collided = false

    // Reuse pre-allocated test position
    this.testPosition.copy(position)

    while (Math.abs(travelled) < Math.abs(delta)) {
      const remaining = delta - travelled
      const movement = Math.abs(remaining) < Math.abs(step) ? remaining : step
      const testValue = currentValue + movement

      this.testPosition[axis] = testValue

      if (this.intersectsWorld(this.testPosition)) {
        collided = true
        break
      }

      currentValue = testValue
      travelled += movement
    }

    // Reset testPosition axis to match position for next call
    this.testPosition[axis] = position[axis]

    return { value: currentValue, collided }
  }

  private intersectsWorld(position: THREE.Vector3): boolean {
    const bounds = this.getBounds(position)

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
          if (this.voxels.isBlockSolid(x, y, z)) {
            return true
          }
        }
      }
    }

    return false
  }

  private getBounds(position: THREE.Vector3) {
    const minX = Math.floor(position.x - this.playerRadius)
    const maxX = Math.floor(position.x + this.playerRadius)
    const minZ = Math.floor(position.z - this.playerRadius)
    const maxZ = Math.floor(position.z + this.playerRadius)

    const feetY = this.getFeetY(position)
    const minY = Math.floor(feetY)
    const maxY = Math.floor(feetY + this.playerHeight)

    return { minX, maxX, minZ, maxZ, minY, maxY }
  }

  private getFeetY(position: THREE.Vector3): number {
    return position.y - this.eyeOffset
  }

  /**
   * Find the height needed to step up over an obstacle in the given direction.
   * Returns 0 if no step-up is possible (too high, or no obstacle).
   */
  private findStepUpHeight(position: THREE.Vector3, delta: THREE.Vector3): number {
    const feetY = this.getFeetY(position)
    const feetBlock = Math.floor(feetY)

    // Check blocks in the direction of movement at feet level
    const checkX = position.x + Math.sign(delta.x) * (this.playerRadius + 0.1)
    const checkZ = position.z + Math.sign(delta.z) * (this.playerRadius + 0.1)

    // Find the highest solid block at feet level in our path
    let maxBlockTop = 0

    // Check along X direction
    if (delta.x !== 0) {
      const blockX = Math.floor(checkX)
      for (let z = Math.floor(position.z - this.playerRadius); z <= Math.floor(position.z + this.playerRadius); z++) {
        if (this.voxels.isBlockSolid(blockX, feetBlock, z)) {
          // This block is solid at feet level - need to step over it
          const blockTop = feetBlock + 1 - feetY
          maxBlockTop = Math.max(maxBlockTop, blockTop)
        }
      }
    }

    // Check along Z direction
    if (delta.z !== 0) {
      const blockZ = Math.floor(checkZ)
      for (let x = Math.floor(position.x - this.playerRadius); x <= Math.floor(position.x + this.playerRadius); x++) {
        if (this.voxels.isBlockSolid(x, feetBlock, blockZ)) {
          const blockTop = feetBlock + 1 - feetY
          maxBlockTop = Math.max(maxBlockTop, blockTop)
        }
      }
    }

    return maxBlockTop
  }

  /**
   * Move position down until it rests on solid ground (or maxDrop distance).
   */
  private settleToGround(position: THREE.Vector3): THREE.Vector3 {
    const maxDrop = this.maxStepUp + 0.1
    const feetY = this.getFeetY(position)

    // Step down incrementally until we hit ground
    for (let drop = 0; drop < maxDrop; drop += this.stepSize) {
      this.testPosition.copy(position)
      this.testPosition.y -= drop

      if (this.intersectsWorld(this.testPosition)) {
        // Went too far, back up one step
        this.testPosition.y += this.stepSize
        return this.testPosition.clone()
      }

      // Check if we're now grounded
      const testFeetY = this.getFeetY(this.testPosition) - 0.05
      const sampleY = Math.floor(testFeetY)
      const minX = Math.floor(position.x - this.playerRadius)
      const maxX = Math.floor(position.x + this.playerRadius)
      const minZ = Math.floor(position.z - this.playerRadius)
      const maxZ = Math.floor(position.z + this.playerRadius)

      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.voxels.isBlockSolid(x, sampleY, z)) {
            return this.testPosition.clone()
          }
        }
      }
    }

    // Couldn't settle, return original
    return position.clone()
  }
}
