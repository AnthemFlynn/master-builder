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
  private gravity = 32          // Faster fall for snappier feel (Minecraft-like)
  private terminalVelocity = -78 // Max fall speed (blocks/sec) - prevents tunneling through terrain
  private waterGravity = 2       // Reduced gravity in water (buoyancy)
  private waterDrag = 0.85       // Water slows you down
  private swimSpeed = 0.4        // Swimming is slower than walking
  private forward = new THREE.Vector3()
  private right = new THREE.Vector3()
  private horizontal = new THREE.Vector3()

  // Movement acceleration constants (Minecraft-like feel)
  private readonly GROUND_ACCELERATION = 45   // blocks/sec² - quick response on ground
  private readonly AIR_ACCELERATION = 4       // blocks/sec² - reduced air control
  private readonly GROUND_FRICTION = 0.88     // velocity decay on ground (per frame at 60fps)
  private readonly AIR_FRICTION = 0.98        // less friction in air (momentum preserved)
  private readonly FLY_ACCELERATION = 30      // blocks/sec² - responsive flying
  private readonly FLY_FRICTION = 0.90        // moderate friction while flying

  // Horizontal velocity tracking (x, z components)
  private horizontalVelocity = new THREE.Vector2(0, 0)
  private readonly targetVelocity = new THREE.Vector2(0, 0)

  // Pre-allocated vectors for movement calculations
  private readonly tempPosition = new THREE.Vector3()
  private readonly tempVelocity = new THREE.Vector3()
  private readonly actualDelta = new THREE.Vector3()  // For wall collision detection

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
    const maxSpeed = this.player.getSpeed()

    // Calculate basis vectors from quaternion
    this.forward.set(0, 0, -1).applyQuaternion(cameraQuaternion)
    this.right.set(1, 0, 0).applyQuaternion(cameraQuaternion)

    // Calculate target direction
    this.horizontal.set(0, 0, 0)
    if (movement.forward !== 0) {
      this.horizontal.addScaledVector(this.forward, movement.forward)
    }
    if (movement.strafe !== 0) {
      this.horizontal.addScaledVector(this.right, movement.strafe)
    }

    // Handle horizontal movement with acceleration
    if (this.horizontal.lengthSq() > 0) {
      this.horizontal.normalize()
      this.targetVelocity.set(this.horizontal.x * maxSpeed, this.horizontal.z * maxSpeed)

      // Accelerate toward target
      const accelX = (this.targetVelocity.x - this.horizontalVelocity.x) * this.FLY_ACCELERATION * deltaTime
      const accelZ = (this.targetVelocity.y - this.horizontalVelocity.y) * this.FLY_ACCELERATION * deltaTime

      this.horizontalVelocity.x += accelX
      this.horizontalVelocity.y += accelZ
    } else {
      // Apply friction when no input (frame-rate independent)
      const flyFriction = Math.pow(this.FLY_FRICTION, deltaTime * 60)
      this.horizontalVelocity.x *= flyFriction
      this.horizontalVelocity.y *= flyFriction

      if (Math.abs(this.horizontalVelocity.x) < 0.01) this.horizontalVelocity.x = 0
      if (Math.abs(this.horizontalVelocity.y) < 0.01) this.horizontalVelocity.y = 0
    }

    // Clamp to max speed
    const currentSpeed = this.horizontalVelocity.length()
    if (currentSpeed > maxSpeed) {
      this.horizontalVelocity.multiplyScalar(maxSpeed / currentSpeed)
    }

    // Apply horizontal movement
    if (this.horizontalVelocity.lengthSq() > 0.0001) {
      this.horizontal.set(
        this.horizontalVelocity.x * deltaTime,
        0,
        this.horizontalVelocity.y * deltaTime
      )
      const moved = this.collision.moveWithCollisions(position, this.horizontal)
      position.copy(moved)
    }

    // Vertical movement (direct for flying - feels more responsive)
    if (movement.vertical !== 0) {
      const verticalDelta = movement.vertical * maxSpeed * deltaTime
      const verticalResult = this.collision.moveVertical(position, verticalDelta)
      position.copy(verticalResult.position)
    }

    // Update player state
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
    const maxSpeed = movement.sneak ? baseSpeed * 0.4 : baseSpeed
    const isGrounded = this.collision.isGrounded(position)

    // Calculate basis vectors from quaternion (horizontal only)
    this.forward.set(0, 0, -1).applyQuaternion(cameraQuaternion)
    this.forward.y = 0
    this.forward.normalize()
    this.right.set(1, 0, 0).applyQuaternion(cameraQuaternion)
    this.right.y = 0
    this.right.normalize()

    // Calculate target velocity direction
    this.horizontal.set(0, 0, 0)
    if (movement.forward !== 0) {
      this.horizontal.addScaledVector(this.forward, movement.forward)
    }
    if (movement.strafe !== 0) {
      this.horizontal.addScaledVector(this.right, movement.strafe)
    }

    // Determine acceleration and friction based on grounded state
    const acceleration = isGrounded ? this.GROUND_ACCELERATION : this.AIR_ACCELERATION
    const friction = isGrounded ? this.GROUND_FRICTION : this.AIR_FRICTION

    if (this.horizontal.lengthSq() > 0) {
      // Player is providing input - accelerate toward target velocity
      this.horizontal.normalize()
      this.targetVelocity.set(this.horizontal.x * maxSpeed, this.horizontal.z * maxSpeed)

      // Accelerate toward target velocity
      const accelX = (this.targetVelocity.x - this.horizontalVelocity.x) * acceleration * deltaTime
      const accelZ = (this.targetVelocity.y - this.horizontalVelocity.y) * acceleration * deltaTime

      this.horizontalVelocity.x += accelX
      this.horizontalVelocity.y += accelZ
    } else {
      // No input - apply friction to slow down (frame-rate independent)
      const frictionFactor = Math.pow(friction, deltaTime * 60)
      this.horizontalVelocity.x *= frictionFactor
      this.horizontalVelocity.y *= frictionFactor

      // Stop completely if very slow (prevents drifting)
      if (Math.abs(this.horizontalVelocity.x) < 0.01) this.horizontalVelocity.x = 0
      if (Math.abs(this.horizontalVelocity.y) < 0.01) this.horizontalVelocity.y = 0
    }

    // Clamp horizontal velocity to max speed
    const currentSpeed = this.horizontalVelocity.length()
    if (currentSpeed > maxSpeed) {
      this.horizontalVelocity.multiplyScalar(maxSpeed / currentSpeed)
    }

    // Apply horizontal movement with collision
    if (this.horizontalVelocity.lengthSq() > 0.0001) {
      this.horizontal.set(
        this.horizontalVelocity.x * deltaTime,
        0,
        this.horizontalVelocity.y * deltaTime
      )
      const moved = this.collision.moveWithCollisions(position, this.horizontal)

      // If we hit a wall, reduce velocity in that direction
      this.actualDelta.copy(moved).sub(position)
      if (Math.abs(this.actualDelta.x) < Math.abs(this.horizontal.x) * 0.5) {
        this.horizontalVelocity.x *= 0.3  // Hit wall on X axis
      }
      if (Math.abs(this.actualDelta.z) < Math.abs(this.horizontal.z) * 0.5) {
        this.horizontalVelocity.y *= 0.3  // Hit wall on Z axis
      }

      position.copy(moved)
    }

    // Jump handling
    if (movement.jump && isGrounded) {
      velocity.y = this.player.getJumpVelocity()
    }

    // Apply gravity with terminal velocity cap
    velocity.y -= this.gravity * deltaTime
    if (velocity.y < this.terminalVelocity) {
      velocity.y = this.terminalVelocity
    }

    // Apply vertical movement
    const verticalResult = this.collision.moveVertical(position, velocity.y * deltaTime)
    position.copy(verticalResult.position)

    if (verticalResult.collided) {
      velocity.y = 0
      this.player.setFalling(false)
    } else {
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
