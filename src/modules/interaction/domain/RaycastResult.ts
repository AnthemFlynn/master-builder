import * as THREE from 'three'

export interface RaycastResult {
  hit: boolean
  hitBlock: THREE.Vector3 | null
  adjacentBlock: THREE.Vector3 | null
  normal: THREE.Vector3 | null
}
