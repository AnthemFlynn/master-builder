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

  // Pre-allocated vectors to avoid GC pressure in physics loop
  private readonly workingPosition = new THREE.Vector3()
  private readonly testPosition = new THREE.Vector3()
  private readonly resultPosition = new THREE.Vector3()

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

    const sweepX = this.sweepAxis(this.workingPosition, delta.x, 'x')
    this.workingPosition.x = sweepX.value

    const sweepZ = this.sweepAxis(this.workingPosition, delta.z, 'z')
    this.workingPosition.z = sweepZ.value

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
}
