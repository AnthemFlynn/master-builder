// src/modules/persistence/application/handlers/LoadGameHandler.ts
import { CommandHandler } from '../../../game/domain/commands/Command'
import { LoadGameCommand } from '../../domain/commands/LoadGameCommand'
import { PersistenceService } from '../PersistenceService'
import { PlayerService } from '../../../player/application/PlayerService'
import { InteractionService } from '../../../interaction/application/InteractionService'
import { EnvironmentService } from '../../../environment/application/EnvironmentService'
import { ModificationTracker } from '../ModificationTracker'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../../../game/infrastructure/EventBus'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'

/**
 * Handler for LoadGameCommand
 * Loads game state and restores to services
 */
export class LoadGameHandler implements CommandHandler<LoadGameCommand> {
  constructor(
    private persistenceService: PersistenceService,
    private playerService: PlayerService,
    private interactionService: InteractionService,
    private environmentService: EnvironmentService,
    private modificationTracker: ModificationTracker,
    private worldService: WorldService,
    private eventBus: EventBus
  ) {}

  async execute(command: LoadGameCommand): Promise<void> {
    // Emit load started event
    this.eventBus.emit('persistence', {
      type: 'GameLoadStartedEvent',
      timestamp: Date.now(),
      slotId: command.slotId
    })

    try {
      // Load snapshot from storage
      const snapshot = await this.persistenceService.loadGame(command.slotId)

      // Restore full game state
      this.persistenceService.restoreGameSnapshot(
        snapshot,
        this.playerService,
        this.interactionService,
        this.environmentService,
        this.modificationTracker
      )

      // Regenerate chunks around the loaded player position to apply modifications
      const playerPos = snapshot.player.position
      const centerChunk = new ChunkCoordinate(
        Math.floor(playerPos.x / 24),
        Math.floor(playerPos.z / 24)
      )

      // Clear existing chunks and regenerate
      this.worldService.clearAllChunks()

      // Emit event to trigger chunk regeneration
      this.eventBus.emit('persistence', {
        type: 'GameLoadedEvent',
        timestamp: Date.now(),
        slotId: command.slotId,
        slotName: command.slotId,
        playerPosition: playerPos,
        centerChunk
      })

      console.log(`📂 Game loaded from "${command.slotId}"`)
    } catch (error) {
      // Emit failure event
      this.eventBus.emit('persistence', {
        type: 'GameLoadFailedEvent',
        timestamp: Date.now(),
        slotId: command.slotId,
        error: error instanceof Error ? error.message : String(error)
      })

      console.error('❌ Load failed:', error)
      throw error
    }
  }
}
