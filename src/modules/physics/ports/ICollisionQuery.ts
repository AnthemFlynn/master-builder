import * as THREE from 'three'

export interface ICollisionQuery {
  moveWithCollisions(position: THREE.Vector3, delta: THREE.Vector3): THREE.Vector3
  moveVertical(position: THREE.Vector3, deltaY: number): { position: THREE.Vector3; collided: boolean }
  isGrounded(position: THREE.Vector3): boolean
}
