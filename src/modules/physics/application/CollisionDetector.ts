import * as THREE from 'three'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ICollisionQuery } from '../ports/ICollisionQuery'

interface SweepResult {
  value: number
  collided: boolean
}

export class CollisionDetector implements ICollisionQuery {
  private playerRadius = 0.4
  private playerHeight = 1.8
  private eyeOffset = 1.6
  private stepSize = 0.1

  constructor(private voxels: IVoxelQuery) {}

  moveWithCollisions(position: THREE.Vector3, delta: THREE.Vector3): THREE.Vector3 {
    const workingPosition = position.clone()

    const sweepX = this.sweepAxis(workingPosition, delta.x, 'x')
    workingPosition.x = sweepX.value

    const sweepZ = this.sweepAxis(workingPosition, delta.z, 'z')
    workingPosition.z = sweepZ.value

    return workingPosition
  }

  moveVertical(position: THREE.Vector3, deltaY: number): { position: THREE.Vector3; collided: boolean } {
    const workingPosition = position.clone()
    const sweepY = this.sweepAxis(workingPosition, deltaY, 'y')
    workingPosition.y = sweepY.value
    return { position: workingPosition, collided: sweepY.collided }
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

    while (Math.abs(travelled) < Math.abs(delta)) {
      const remaining = delta - travelled
      const movement = Math.abs(remaining) < Math.abs(step) ? remaining : step
      const testValue = currentValue + movement

      const testPosition = position.clone()
      testPosition[axis] = testValue

      if (this.intersectsWorld(testPosition)) {
        collided = true
        break
      }

      currentValue = testValue
      travelled += movement
    }

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
