// src/modules/persistence/application/PersistenceService.ts
import { IPersistenceStorage } from '../ports/IPersistenceStorage'
import { IPersistenceQuery } from '../ports/IPersistenceQuery'
import { GameSnapshot, PlayerSnapshot } from '../domain/GameSnapshot'
import { SaveSlot } from '../domain/SaveSlot'
import { PlayerService } from '../../player/application/PlayerService'

/**
 * Service orchestrating game state persistence
 * Follows hexagonal architecture: service uses ports
 */
export class PersistenceService implements IPersistenceQuery {
  constructor(
    private storage: IPersistenceStorage & IPersistenceQuery
  ) {}

  async initialize(): Promise<void> {
    await this.storage.initialize()
  }

  /**
   * Capture current game state from services
   * Phase 1: Player only
   */
  captureGameSnapshot(playerService: PlayerService): GameSnapshot {
    const playerState = playerService.getState()

    const playerSnapshot: PlayerSnapshot = {
      position: {
        x: playerState.position.x,
        y: playerState.position.y,
        z: playerState.position.z
      },
      velocity: {
        x: playerState.velocity.x,
        y: playerState.velocity.y,
        z: playerState.velocity.z
      },
      mode: playerState.mode.toString(),
      speed: playerState.speed,
      falling: playerState.falling,
      jumpVelocity: playerState.jumpVelocity
    }

    return {
      version: '1.0.0',
      player: playerSnapshot,
      metadata: {
        savedAt: Date.now(),
        playTime: 0 // TODO: Track play time
      }
    }
  }

  /**
   * Restore game state to services
   * Phase 1: Player only
   */
  async restoreGameSnapshot(
    snapshot: GameSnapshot,
    playerService: PlayerService
  ): Promise<void> {
    // Restore player state
    playerService.restoreState(snapshot.player)

    console.log('✅ Game state restored from snapshot')
  }

  /**
   * Save game to storage
   */
  async saveGame(slotId: string, snapshot: GameSnapshot): Promise<SaveSlot> {
    return this.storage.saveGame(slotId, snapshot)
  }

  // IPersistenceQuery pass-through methods

  async listSaveSlots(): Promise<SaveSlot[]> {
    return this.storage.listSaveSlots()
  }

  async loadGame(slotId: string): Promise<GameSnapshot> {
    return this.storage.loadGame(slotId)
  }

  async saveSlotExists(slotId: string): Promise<boolean> {
    return this.storage.saveSlotExists(slotId)
  }

  async getSaveSlotMetadata(slotId: string): Promise<SaveSlot | null> {
    return this.storage.getSaveSlotMetadata(slotId)
  }
}
