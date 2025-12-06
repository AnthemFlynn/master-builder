import * as THREE from 'three'
import { MovementVector } from '../domain/MovementVector'
import { ICollisionQuery } from '../ports/ICollisionQuery'
import { IPlayerQuery } from '../../player/ports/IPlayerQuery'

export class MovementController {
  private velocity = new THREE.Vector3()
  private gravity = 25

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
      // Flying mode - direct movement, no gravity
      const speed = this.player.getSpeed()

      // Forward/back
      if (movement.forward !== 0) {
        camera.getWorldDirection(this.velocity)
        this.velocity.y = 0
        this.velocity.normalize()
        position.add(this.velocity.multiplyScalar(movement.forward * speed))
      }

      // Strafe
      if (movement.strafe !== 0) {
        const right = new THREE.Vector3()
        right.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()))
        position.add(right.multiplyScalar(movement.strafe * speed))
      }

      // Vertical
      position.y += movement.vertical * speed

    } else {
      // Walking mode - apply gravity and collision
      const speed = this.player.getSpeed()

      // Apply gravity
      this.velocity.y -= this.gravity * deltaTime

      // Horizontal movement
      if (movement.forward !== 0) {
        camera.getWorldDirection(this.velocity)
        this.velocity.y = 0
        this.velocity.normalize()
        position.add(this.velocity.multiplyScalar(movement.forward * speed))
      }

      if (movement.strafe !== 0) {
        const right = new THREE.Vector3()
        right.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()))
        position.add(right.multiplyScalar(movement.strafe * speed))
      }

      // Apply vertical velocity (gravity/jumping)
      position.y += this.velocity.y * deltaTime

      // Simple ground collision - stop falling at y=32
      if (position.y <= 32) {
        position.y = 32
        this.velocity.y = 0
      }
    }

    return position
  }
}
