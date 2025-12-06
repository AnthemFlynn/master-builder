import * as THREE from 'three'
import { RaycastResult } from '../domain/RaycastResult'

export class BlockPicker {
  private raycaster = new THREE.Raycaster()

  constructor() {
    this.raycaster.far = 8  // Pick distance
  }

  pickBlock(
    camera: THREE.Camera,
    scene: THREE.Scene
  ): RaycastResult {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera as THREE.PerspectiveCamera)

    const intersects = this.raycaster.intersectObjects(scene.children, true)

    if (intersects.length > 0) {
      const hit = intersects[0]

      // Get block position from hit point
      // Subtract small epsilon in direction of ray to get the block we actually hit
      // (not the one on the other side of the face)
      const epsilon = 0.001
      const direction = this.raycaster.ray.direction
      const adjustedPoint = hit.point.clone().sub(direction.clone().multiplyScalar(epsilon))

      const position = new THREE.Vector3(
        Math.floor(adjustedPoint.x),
        Math.floor(adjustedPoint.y),
        Math.floor(adjustedPoint.z)
      )

      return {
        hit: true,
        position,
        normal: hit.face?.normal || null,
        blockType: null
      }
    }

    return {
      hit: false,
      position: null,
      normal: null,
      blockType: null
    }
  }
}
