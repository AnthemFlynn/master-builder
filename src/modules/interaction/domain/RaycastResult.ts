import * as THREE from 'three'

export interface RaycastResult {
  hit: boolean
  position: THREE.Vector3 | null
  normal: THREE.Vector3 | null
  blockType: number | null
}
