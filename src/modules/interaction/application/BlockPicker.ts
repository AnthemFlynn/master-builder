import * as THREE from 'three'
import { RaycastResult } from '../domain/RaycastResult'
import { WorldService } from '../../world/application/WorldService'

export class BlockPicker {
  private raycaster = new THREE.Raycaster()

  constructor(private world: WorldService) {
    this.raycaster.far = 12
  }

  pickBlock(camera: THREE.Camera, _scene: THREE.Scene): RaycastResult {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera as THREE.PerspectiveCamera)
    const origin = this.raycaster.ray.origin.clone()
    const direction = this.raycaster.ray.direction.clone().normalize()

    return this.raycastVoxels(origin, direction)
  }

  private raycastVoxels(origin: THREE.Vector3, direction: THREE.Vector3): RaycastResult {
    const maxDistance = 12

    const voxel = new THREE.Vector3(
      Math.floor(origin.x),
      Math.floor(origin.y),
      Math.floor(origin.z)
    )

    const step = new THREE.Vector3(
      direction.x > 0 ? 1 : direction.x < 0 ? -1 : 0,
      direction.y > 0 ? 1 : direction.y < 0 ? -1 : 0,
      direction.z > 0 ? 1 : direction.z < 0 ? -1 : 0
    )

    const nextBoundary = new THREE.Vector3(
      voxel.x + (step.x > 0 ? 1 : 0),
      voxel.y + (step.y > 0 ? 1 : 0),
      voxel.z + (step.z > 0 ? 1 : 0)
    )

    const tMax = new THREE.Vector3(
      step.x !== 0 ? (nextBoundary.x - origin.x) / direction.x : Infinity,
      step.y !== 0 ? (nextBoundary.y - origin.y) / direction.y : Infinity,
      step.z !== 0 ? (nextBoundary.z - origin.z) / direction.z : Infinity
    )

    const tDelta = new THREE.Vector3(
      step.x !== 0 ? Math.abs(1 / direction.x) : Infinity,
      step.y !== 0 ? Math.abs(1 / direction.y) : Infinity,
      step.z !== 0 ? Math.abs(1 / direction.z) : Infinity
    )

    const faceNormal = new THREE.Vector3()
    let distanceTravelled = 0

    while (distanceTravelled <= maxDistance) {
      const blockType = this.world.getBlockType(voxel.x, voxel.y, voxel.z)
      if (blockType !== -1) {
        const hitBlock = voxel.clone()
        const adjacentBlock = hitBlock.clone().add(faceNormal)
        return {
          hit: true,
          hitBlock,
          adjacentBlock,
          normal: faceNormal.clone()
        }
      }

      if (tMax.x < tMax.y) {
        if (tMax.x < tMax.z) {
          voxel.x += step.x
          distanceTravelled = tMax.x
          tMax.x += tDelta.x
          faceNormal.set(-step.x, 0, 0)
        } else {
          voxel.z += step.z
          distanceTravelled = tMax.z
          tMax.z += tDelta.z
          faceNormal.set(0, 0, -step.z)
        }
      } else {
        if (tMax.y < tMax.z) {
          voxel.y += step.y
          distanceTravelled = tMax.y
          tMax.y += tDelta.y
          faceNormal.set(0, -step.y, 0)
        } else {
          voxel.z += step.z
          distanceTravelled = tMax.z
          tMax.z += tDelta.z
          faceNormal.set(0, 0, -step.z)
        }
      }

      if (step.x === 0 && step.y === 0 && step.z === 0) {
        break
      }
    }

    return { hit: false, hitBlock: null, adjacentBlock: null, normal: null }
  }
}
