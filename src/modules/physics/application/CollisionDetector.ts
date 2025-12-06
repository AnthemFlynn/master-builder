import * as THREE from 'three'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { CollisionResult } from '../domain/CollisionResult'
import { ICollisionQuery } from '../ports/ICollisionQuery'

export class CollisionDetector implements ICollisionQuery {
  private raycaster = new THREE.Raycaster()

  constructor(
    private voxels: IVoxelQuery,
    private scene: THREE.Scene
  ) {
    this.raycaster.far = 1.5  // Collision detection distance
  }

  checkCollisions(position: THREE.Vector3, playerBody: THREE.Mesh): CollisionResult {
    const result: CollisionResult = {
      front: false,
      back: false,
      left: false,
      right: false,
      up: false,
      down: false
    }

    // Check each direction
    result.front = this.checkDirection(position, playerBody, new THREE.Vector3(1, 0, 0))
    result.back = this.checkDirection(position, playerBody, new THREE.Vector3(-1, 0, 0))
    result.left = this.checkDirection(position, playerBody, new THREE.Vector3(0, 0, -1))
    result.right = this.checkDirection(position, playerBody, new THREE.Vector3(0, 0, 1))
    result.up = this.checkDirection(position, playerBody, new THREE.Vector3(0, 1, 0))
    result.down = this.checkDirection(position, playerBody, new THREE.Vector3(0, -1, 0))

    return result
  }

  isGrounded(position: THREE.Vector3): boolean {
    // Check if block below
    const blockBelow = this.voxels.getBlockType(
      Math.floor(position.x),
      Math.floor(position.y - 1.5),
      Math.floor(position.z)
    )
    return blockBelow !== -1
  }

  private checkDirection(
    position: THREE.Vector3,
    playerBody: THREE.Mesh,
    direction: THREE.Vector3
  ): boolean {
    this.raycaster.set(position, direction)

    // Create temp mesh with nearby blocks for collision check
    // (Simplified - in real impl, query voxels and build collision mesh)
    const collision = this.raycaster.intersectObject(playerBody, false)
    return collision.length > 0
  }
}
