import * as THREE from 'three'
import { RaycastResult } from '../domain/RaycastResult'
import { WorldService } from '../../world/application/WorldService'
import { blockRegistry } from '../../blocks'

export class BlockPicker {
  private raycaster = new THREE.Raycaster()

  // Pre-allocated vectors to avoid GC pressure (reused every frame)
  private readonly screenCenter = new THREE.Vector2(0, 0)
  private readonly voxel = new THREE.Vector3()
  private readonly step = new THREE.Vector3()
  private readonly tMax = new THREE.Vector3()
  private readonly tDelta = new THREE.Vector3()
  private readonly faceNormal = new THREE.Vector3()
  private readonly tempOrigin = new THREE.Vector3()
  private readonly tempDirection = new THREE.Vector3()

  constructor(private world: WorldService) {
    this.raycaster.far = 12
  }

  pickBlock(camera: THREE.Camera, _scene: THREE.Scene): RaycastResult {
    this.raycaster.setFromCamera(this.screenCenter, camera as THREE.PerspectiveCamera)
    this.tempOrigin.copy(this.raycaster.ray.origin)
    this.tempDirection.copy(this.raycaster.ray.direction).normalize()

    return this.raycastVoxels()
  }

  private raycastVoxels(): RaycastResult {
    const maxDistance = 12
    const origin = this.tempOrigin
    const direction = this.tempDirection

    // Reuse pre-allocated vectors
    this.voxel.set(
      Math.floor(origin.x),
      Math.floor(origin.y),
      Math.floor(origin.z)
    )

    this.step.set(
      direction.x > 0 ? 1 : direction.x < 0 ? -1 : 0,
      direction.y > 0 ? 1 : direction.y < 0 ? -1 : 0,
      direction.z > 0 ? 1 : direction.z < 0 ? -1 : 0
    )

    const nextBoundaryX = this.voxel.x + (this.step.x > 0 ? 1 : 0)
    const nextBoundaryY = this.voxel.y + (this.step.y > 0 ? 1 : 0)
    const nextBoundaryZ = this.voxel.z + (this.step.z > 0 ? 1 : 0)

    this.tMax.set(
      this.step.x !== 0 ? (nextBoundaryX - origin.x) / direction.x : Infinity,
      this.step.y !== 0 ? (nextBoundaryY - origin.y) / direction.y : Infinity,
      this.step.z !== 0 ? (nextBoundaryZ - origin.z) / direction.z : Infinity
    )

    this.tDelta.set(
      this.step.x !== 0 ? Math.abs(1 / direction.x) : Infinity,
      this.step.y !== 0 ? Math.abs(1 / direction.y) : Infinity,
      this.step.z !== 0 ? Math.abs(1 / direction.z) : Infinity
    )

    this.faceNormal.set(0, 0, 0)
    let distanceTravelled = 0

    while (distanceTravelled <= maxDistance) {
      const blockType = this.world.getBlockType(this.voxel.x, this.voxel.y, this.voxel.z)
      // Skip Air (0) and Void (-1)
      if (blockType !== -1 && blockType !== 0) {
        const blockDef = blockRegistry.get(blockType)
        // Skip transparent blocks (water, glass) - can't select them
        // Also skip unknown blocks (not in registry) to prevent false positives
        if (!blockDef || blockDef.transparent) {
          // Continue raycasting through transparent/unknown blocks
        } else {
          // Clone only on hit (rare compared to misses) - necessary for caller
          const hitBlock = this.voxel.clone()
          const adjacentBlock = hitBlock.clone().add(this.faceNormal)
          return {
            hit: true,
            hitBlock,
            adjacentBlock,
            normal: this.faceNormal.clone()
          }
        }
      }

      if (this.tMax.x < this.tMax.y) {
        if (this.tMax.x < this.tMax.z) {
          this.voxel.x += this.step.x
          distanceTravelled = this.tMax.x
          this.tMax.x += this.tDelta.x
          this.faceNormal.set(-this.step.x, 0, 0)
        } else {
          this.voxel.z += this.step.z
          distanceTravelled = this.tMax.z
          this.tMax.z += this.tDelta.z
          this.faceNormal.set(0, 0, -this.step.z)
        }
      } else {
        if (this.tMax.y < this.tMax.z) {
          this.voxel.y += this.step.y
          distanceTravelled = this.tMax.y
          this.tMax.y += this.tDelta.y
          this.faceNormal.set(0, -this.step.y, 0)
        } else {
          this.voxel.z += this.step.z
          distanceTravelled = this.tMax.z
          this.tMax.z += this.tDelta.z
          this.faceNormal.set(0, 0, -this.step.z)
        }
      }

      if (this.step.x === 0 && this.step.y === 0 && this.step.z === 0) {
        break
      }
    }

    return { hit: false, hitBlock: null, adjacentBlock: null, normal: null }
  }
}
