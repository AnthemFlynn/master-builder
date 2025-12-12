// src/modules/persistence/application/handlers/LoadGameHandler.ts
import { CommandHandler } from '../../../game/domain/commands/Command'
import { LoadGameCommand } from '../../domain/commands/LoadGameCommand'
import { PersistenceService } from '../PersistenceService'
import { PlayerService } from '../../../player/application/PlayerService'
import { EventBus } from '../../../game/infrastructure/EventBus'

/**
 * Handler for LoadGameCommand
 * Loads game state and restores to services
 */
export class LoadGameHandler implements CommandHandler<LoadGameCommand> {
  constructor(
    private persistenceService: PersistenceService,
    private playerService: PlayerService,
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

      // Restore game state
      await this.persistenceService.restoreGameSnapshot(
        snapshot,
        this.playerService
      )

      // Emit success event
      this.eventBus.emit('persistence', {
        type: 'GameLoadedEvent',
        timestamp: Date.now(),
        slotId: command.slotId,
        slotName: command.slotId // Will be improved in Phase 6
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
