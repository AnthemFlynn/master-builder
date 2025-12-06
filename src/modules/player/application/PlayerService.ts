// src/modules/player/application/PlayerService.ts
import { PlayerState } from '../domain/PlayerState'
import { PlayerMode } from '../domain/PlayerMode'
import { IPlayerQuery } from '../ports/IPlayerQuery'
import { EventBus } from '../../game/infrastructure/EventBus'
import * as THREE from 'three'

export class PlayerService implements IPlayerQuery {
  private state: PlayerState

  constructor(private eventBus: EventBus) {
    this.state = new PlayerState()
  }

  getPosition(): THREE.Vector3 {
    return this.state.position
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

  // Expose full state for physics module (internal use)
  getState(): PlayerState {
    return this.state
  }
}
