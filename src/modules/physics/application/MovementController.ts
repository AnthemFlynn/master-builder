import * as THREE from 'three'
import { MovementVector } from '../domain/MovementVector'
import { ICollisionQuery } from '../ports/ICollisionQuery'
import { PlayerMode } from '../../player/domain/PlayerMode'

interface WorkerPlayerState {
  getPosition: () => THREE.Vector3
  getVelocity: () => THREE.Vector3
  getMode: () => PlayerMode
  getSpeed: () => number
  isFlying: () => boolean
  isFalling: () => boolean
  getJumpVelocity: () => number
  // Setters for internal state updates
  updatePosition: (p: THREE.Vector3) => void
  setVelocity: (v: THREE.Vector3) => void
  setFalling: (f: boolean) => void
  setJumpVelocity: (jv: number) => void
  setMode: (m: PlayerMode) => void
}

export class MovementController {
  private gravity = 25
  private forward = new THREE.Vector3()
  private right = new THREE.Vector3()
  private horizontal = new THREE.Vector3()

  constructor(
    private collision: ICollisionQuery,
    private player: WorkerPlayerState // Use the worker-local player state interface
  ) {}

  applyMovement(
    movement: MovementVector,
    cameraQuaternion: THREE.Quaternion,
    deltaTime: number
  ): THREE.Vector3 {
    const position = this.player.getPosition().clone()
    const velocity = this.player.getVelocity().clone()

    if (this.player.isFlying()) {
      return this.applyFlyingMovement(movement, cameraQuaternion, position, velocity, deltaTime)
    }

    return this.applyWalkingMovement(movement, cameraQuaternion, position, velocity, deltaTime)
  }

  private applyFlyingMovement(
    movement: MovementVector,
    cameraQuaternion: THREE.Quaternion,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    deltaTime: number
  ): THREE.Vector3 {
    const speed = this.player.getSpeed()
    
    // Calculate basis vectors from quaternion
    this.forward.set(0, 0, -1).applyQuaternion(cameraQuaternion)
    this.right.set(1, 0, 0).applyQuaternion(cameraQuaternion)

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

    // Update player state (velocity is not used in flying mode)
    this.player.updatePosition(position)
    this.player.setVelocity(velocity)
    return position
  }

  private applyWalkingMovement(
    movement: MovementVector,
    cameraQuaternion: THREE.Quaternion,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    deltaTime: number
  ): THREE.Vector3 {
    const baseSpeed = this.player.getSpeed()
    const speed = movement.sneak ? baseSpeed * 0.4 : baseSpeed

    // Calculate basis vectors from quaternion (horizontal only)
    this.forward.set(0, 0, -1).applyQuaternion(cameraQuaternion)
    this.forward.y = 0
    this.forward.normalize()
    this.right.set(1, 0, 0).applyQuaternion(cameraQuaternion)
    this.right.y = 0
    this.right.normalize()

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
      velocity.y = this.player.getJumpVelocity() // Use player's jump velocity
    }

    velocity.y -= this.gravity * deltaTime
    const verticalResult = this.collision.moveVertical(position, velocity.y * deltaTime)
    position.copy(verticalResult.position)

    if (verticalResult.collided) {
      velocity.y = 0
      this.player.setFalling(false)
    } else {
        // Only set falling if actually falling downwards
        this.player.setFalling(velocity.y < 0)
    }

    // Update player state
    this.player.updatePosition(position)
    this.player.setVelocity(velocity)
    return position
  }
}
