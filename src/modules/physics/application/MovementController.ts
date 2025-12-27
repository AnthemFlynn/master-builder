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
  private waterGravity = 2       // Reduced gravity in water (buoyancy)
  private waterDrag = 0.85       // Water slows you down
  private swimSpeed = 0.4        // Swimming is slower than walking
  private forward = new THREE.Vector3()
  private right = new THREE.Vector3()
  private horizontal = new THREE.Vector3()

  // Pre-allocated vectors for movement calculations
  private readonly tempPosition = new THREE.Vector3()
  private readonly tempVelocity = new THREE.Vector3()

  constructor(
    private collision: ICollisionQuery,
    private player: WorkerPlayerState // Use the worker-local player state interface
  ) {}

  applyMovement(
    movement: MovementVector,
    cameraQuaternion: THREE.Quaternion,
    deltaTime: number
  ): THREE.Vector3 {
    // Reuse pre-allocated vectors to avoid GC pressure (this runs every frame)
    this.tempPosition.copy(this.player.getPosition())
    this.tempVelocity.copy(this.player.getVelocity())

    if (this.player.isFlying()) {
      return this.applyFlyingMovement(movement, cameraQuaternion, this.tempPosition, this.tempVelocity, deltaTime)
    }

    // Check if player is in water
    const waterDepth = this.collision.getWaterDepth(this.tempPosition)
    if (waterDepth > 0) {
      return this.applySwimmingMovement(movement, cameraQuaternion, this.tempPosition, this.tempVelocity, deltaTime, waterDepth)
    }

    return this.applyWalkingMovement(movement, cameraQuaternion, this.tempPosition, this.tempVelocity, deltaTime)
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

  /**
   * Swimming movement - Minecraft-style water physics
   * - Reduced gravity (buoyancy makes you float up slowly)
   * - Slower movement speed
   * - Can swim up with jump, sink with sneak
   * - Water drag reduces velocity
   */
  private applySwimmingMovement(
    movement: MovementVector,
    cameraQuaternion: THREE.Quaternion,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    deltaTime: number,
    waterDepth: number
  ): THREE.Vector3 {
    const baseSpeed = this.player.getSpeed() * this.swimSpeed

    // Calculate basis vectors from quaternion
    // In water, forward follows camera direction (can swim up/down by looking)
    this.forward.set(0, 0, -1).applyQuaternion(cameraQuaternion)
    this.right.set(1, 0, 0).applyQuaternion(cameraQuaternion)

    this.horizontal.set(0, 0, 0)

    // Forward/back movement follows camera look direction (can swim up/down)
    if (movement.forward !== 0) {
      this.horizontal.addScaledVector(this.forward, movement.forward)
    }
    if (movement.strafe !== 0) {
      this.horizontal.addScaledVector(this.right, movement.strafe)
    }

    if (this.horizontal.lengthSq() > 0) {
      this.horizontal.normalize().multiplyScalar(baseSpeed * deltaTime)

      // Apply horizontal movement with collision
      const horizontalDelta = new THREE.Vector3(this.horizontal.x, 0, this.horizontal.z)
      if (horizontalDelta.lengthSq() > 0) {
        const moved = this.collision.moveWithCollisions(position, horizontalDelta)
        position.copy(moved)
      }

      // Apply vertical component from looking up/down while swimming forward
      if (Math.abs(this.horizontal.y) > 0.01) {
        const verticalResult = this.collision.moveVertical(position, this.horizontal.y)
        position.copy(verticalResult.position)
      }
    }

    // Swim up (jump key) or sink (sneak key)
    if (movement.jump) {
      velocity.y = 4  // Swim upward
    } else if (movement.sneak) {
      velocity.y = -3  // Sink faster
    } else {
      // Buoyancy - slowly float up when submerged, neutral when wading
      if (waterDepth === 2) {
        // Fully submerged: slight upward buoyancy
        velocity.y += (0.5 - velocity.y * 0.1) * deltaTime * 10
      } else {
        // Wading: slight gravity to keep feet on ground
        velocity.y -= this.waterGravity * deltaTime
      }
    }

    // Apply water drag to slow down
    velocity.y *= this.waterDrag

    // Clamp vertical velocity in water
    velocity.y = Math.max(-4, Math.min(4, velocity.y))

    // Apply vertical movement
    const verticalResult = this.collision.moveVertical(position, velocity.y * deltaTime)
    position.copy(verticalResult.position)

    if (verticalResult.collided) {
      velocity.y = 0
    }

    // Never falling in water
    this.player.setFalling(false)

    // Update player state
    this.player.updatePosition(position)
    this.player.setVelocity(velocity)
    return position
  }
}
