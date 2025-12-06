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

      // Get block position
      let position: THREE.Vector3 | null = null
      if (hit.object instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
        const matrix = new THREE.Matrix4()
        hit.object.getMatrixAt(hit.instanceId, matrix)
        position = new THREE.Vector3().setFromMatrixPosition(matrix)
      }

      return {
        hit: true,
        position,
        normal: hit.face?.normal || null,
        blockType: null // Would extract from mesh name
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
