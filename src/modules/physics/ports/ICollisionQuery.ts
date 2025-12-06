import * as THREE from 'three'
import { CollisionResult } from '../domain/CollisionResult'

export interface ICollisionQuery {
  checkCollisions(position: THREE.Vector3, playerBody: THREE.Mesh): CollisionResult
  isGrounded(position: THREE.Vector3): boolean
}
