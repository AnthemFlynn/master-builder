// src/modules/player/domain/PlayerState.ts
import * as THREE from 'three'
import { PlayerMode } from './PlayerMode'

export class PlayerState {
  position: THREE.Vector3
  mode: PlayerMode
  speed: number
  falling: boolean
  jumpVelocity: number

  constructor() {
    this.position = new THREE.Vector3(8, 40, 8)
    this.mode = PlayerMode.Flying  // Start in flying mode (walking physics incomplete)
    this.speed = 0.08
    this.falling = false
    this.jumpVelocity = 0
  }

  setMode(mode: PlayerMode): void {
    this.mode = mode

    // Adjust speed based on mode
    if (mode === PlayerMode.Flying) {
      this.speed = 0.08
    } else if (mode === PlayerMode.Sneaking) {
      this.speed = 0.025
    } else {
      this.speed = 0.05
    }
  }

  isFlying(): boolean {
    return this.mode === PlayerMode.Flying
  }

  isWalking(): boolean {
    return this.mode === PlayerMode.Walking
  }
}
