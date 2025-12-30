// src/modules/persistence/application/PersistenceService.ts
import { IPersistenceStorage } from '../ports/IPersistenceStorage'
import { IPersistenceQuery } from '../ports/IPersistenceQuery'
import { GameSnapshot, PlayerSnapshot } from '../domain/GameSnapshot'
import { SaveSlot } from '../domain/SaveSlot'
import { PlayerService } from '../../player/application/PlayerService'
import { InteractionService } from '../../building/application/InteractionService'
import { EnvironmentService } from '../../environment/application/EnvironmentService'
import { ModificationTracker } from './ModificationTracker'

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
   * Now captures full game state including hotbar, time, and block modifications
   */
  captureGameSnapshot(
    playerService: PlayerService,
    interactionService: InteractionService,
    environmentService: EnvironmentService,
    modificationTracker: ModificationTracker,
    worldId: string
  ): GameSnapshot {
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
      worldId,
      player: playerSnapshot,
      selectedHotbarSlot: interactionService.getSelectedBlock(),
      timeOfDay: environmentService.getTimeOfDay(),
      blockModifications: modificationTracker.getAllModifications(),
      metadata: {
        savedAt: Date.now(),
        playTime: 0 // TODO: Track actual play time
      }
    }
  }

  /**
   * Restore game state to services
   * Now restores full game state including hotbar, time, and block modifications
   */
  restoreGameSnapshot(
    snapshot: GameSnapshot,
    playerService: PlayerService,
    interactionService: InteractionService,
    environmentService: EnvironmentService,
    modificationTracker: ModificationTracker
  ): void {
    // Restore player state
    playerService.restoreState(snapshot.player)

    // Restore hotbar selection
    interactionService.setSelectedBlock(snapshot.selectedHotbarSlot)

    // Restore time of day
    if (snapshot.timeOfDay !== null) {
      environmentService.setHour(snapshot.timeOfDay)
    }

    // Load block modifications
    modificationTracker.loadModifications(snapshot.blockModifications)

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
