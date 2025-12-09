// src/modules/player/application/PlayerService.ts
import * as THREE from 'three'
import { PlayerState } from '../domain/PlayerState'
import { PlayerMode } from '../domain/PlayerMode'
import { IPlayerQuery } from '../ports/IPlayerQuery'
import { EventBus } from '../../game/infrastructure/EventBus'

export class PlayerService implements IPlayerQuery {
  private state: PlayerState

  constructor(private eventBus: EventBus) {
    this.state = new PlayerState()
  }

  getPosition(): THREE.Vector3 {
    return this.state.position
  }

  getVelocity(): THREE.Vector3 {
    return this.state.velocity
  }

  getMode(): PlayerMode {
    return this.state.mode
  }

  getSpeed(): number {
    return this.state.speed
  }

  isFlying(): boolean {
    return this.state.isFlying()
  }

  isFalling(): boolean {
      return this.state.falling
  }

  getJumpVelocity(): number {
      return this.state.jumpVelocity
  }

  setMode(mode: PlayerMode): void {
    const oldMode = this.state.mode
    this.state.setMode(mode)

    // Emit event
    this.eventBus.emit('player', {
      type: 'PlayerModeChangedEvent',
      timestamp: Date.now(),
      oldMode,
      newMode: mode
    })
  }

  updatePosition(position: THREE.Vector3): void {
    this.state.position.copy(position)
  }

  setVelocity(velocity: THREE.Vector3): void {
      this.state.velocity.copy(velocity)
  }

  setFalling(falling: boolean): void {
      this.state.falling = falling
  }

  setJumpVelocity(jumpVelocity: number): void {
      this.state.jumpVelocity = jumpVelocity
  }

  // Expose full state for physics module (internal use)
  getState(): PlayerState {
    return this.state
  }
}
