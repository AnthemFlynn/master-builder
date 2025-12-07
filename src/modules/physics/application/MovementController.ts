import * as THREE from 'three'
import { MovementVector } from '../domain/MovementVector'
import { ICollisionQuery } from '../ports/ICollisionQuery'
import { IPlayerQuery } from '../../player/ports/IPlayerQuery'

export class MovementController {
  private velocity = new THREE.Vector3()
  private gravity = 25
  private jumpImpulse = 8
  private forward = new THREE.Vector3()
  private right = new THREE.Vector3()
  private horizontal = new THREE.Vector3()

  constructor(
    private collision: ICollisionQuery,
    private player: IPlayerQuery
  ) {}

  applyMovement(
    movement: MovementVector,
    camera: THREE.PerspectiveCamera,
    deltaTime: number
  ): THREE.Vector3 {
    const position = this.player.getPosition().clone()

    if (this.player.isFlying()) {
      return this.applyFlyingMovement(movement, camera, position, deltaTime)
    }

    return this.applyWalkingMovement(movement, camera, position, deltaTime)
  }

  private applyFlyingMovement(
    movement: MovementVector,
    camera: THREE.PerspectiveCamera,
    position: THREE.Vector3,
    deltaTime: number
  ): THREE.Vector3 {
    const speed = this.player.getSpeed()
    camera.getWorldDirection(this.forward)
    this.forward.normalize()
    this.right.crossVectors(this.forward, camera.up).normalize()

    this.horizontal.set(0, 0, 0)

    if (movement.forward !== 0) {
      this.horizontal.addScaledVector(this.forward, movement.forward)
    }
    if (movement.strafe !== 0) {
      this.horizontal.addScaledVector(this.right, movement.strafe)
    }

    if (this.horizontal.lengthSq() > 0) {
      this.horizontal.normalize().multiplyScalar(speed * deltaTime)
      const moved = this.collision.moveWithCollisions(position, this.horizontal)
      position.copy(moved)
    }

    if (movement.vertical !== 0) {
      const verticalDelta = movement.vertical * speed * deltaTime
      const verticalResult = this.collision.moveVertical(position, verticalDelta)
      position.copy(verticalResult.position)
    }

    return position
  }

  private applyWalkingMovement(
    movement: MovementVector,
    camera: THREE.PerspectiveCamera,
    position: THREE.Vector3,
    deltaTime: number
  ): THREE.Vector3 {
    const baseSpeed = this.player.getSpeed()
    const speed = movement.sneak ? baseSpeed * 0.4 : baseSpeed

    camera.getWorldDirection(this.forward)
    this.forward.y = 0
    this.forward.normalize()
    this.right.crossVectors(this.forward, camera.up).normalize()

    this.horizontal.set(0, 0, 0)

    if (movement.forward !== 0) {
      this.horizontal.addScaledVector(this.forward, movement.forward)
    }
    if (movement.strafe !== 0) {
      this.horizontal.addScaledVector(this.right, movement.strafe)
    }

    if (this.horizontal.lengthSq() > 0) {
      this.horizontal.normalize().multiplyScalar(speed * deltaTime)
      const moved = this.collision.moveWithCollisions(position, this.horizontal)
      position.copy(moved)
    }

    if (movement.jump && this.collision.isGrounded(position)) {
      this.velocity.y = this.jumpImpulse
    }

    this.velocity.y -= this.gravity * deltaTime
    const verticalResult = this.collision.moveVertical(position, this.velocity.y * deltaTime)
    position.copy(verticalResult.position)

    if (verticalResult.collided && this.velocity.y < 0) {
      this.velocity.y = 0
    }

    return position
  }
}
