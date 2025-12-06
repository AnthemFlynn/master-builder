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
      // For chunk meshes (THREE.Mesh), use the intersection point
      // Floor to get block coordinates
      const position = new THREE.Vector3(
        Math.floor(hit.point.x),
        Math.floor(hit.point.y),
        Math.floor(hit.point.z)
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
