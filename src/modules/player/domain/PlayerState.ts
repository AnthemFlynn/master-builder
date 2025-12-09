// src/modules/player/domain/PlayerState.ts
import * as THREE from 'three'
import { PlayerMode } from './PlayerMode'

export class PlayerState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  mode: PlayerMode
  speed: number
  falling: boolean
  jumpVelocity: number

  constructor() {
    this.position = new THREE.Vector3(8, 40, 8)
    this.velocity = new THREE.Vector3() // Initialize velocity
    this.mode = PlayerMode.Walking  // Default to walking so collisions apply
    this.speed = 5
    this.falling = false
    this.jumpVelocity = 0
  }

  setMode(mode: PlayerMode): void {
    this.mode = mode

    // Adjust speed based on mode
    if (mode === PlayerMode.Flying) {
      this.speed = 10
    } else if (mode === PlayerMode.Sneaking) {
      this.speed = 2.5
    } else {
      this.speed = 5
    }
  }

  isFlying(): boolean {
    return this.mode === PlayerMode.Flying
  }

  isWalking(): boolean {
    return this.mode === PlayerMode.Walking
  }
}
