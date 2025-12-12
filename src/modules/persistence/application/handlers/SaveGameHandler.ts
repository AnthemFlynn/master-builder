// src/modules/persistence/application/handlers/SaveGameHandler.ts
import { CommandHandler } from '../../../game/domain/commands/Command'
import { SaveGameCommand } from '../../domain/commands/SaveGameCommand'
import { PersistenceService } from '../PersistenceService'
import { PlayerService } from '../../../player/application/PlayerService'
import { EventBus } from '../../../game/infrastructure/EventBus'

/**
 * Handler for SaveGameCommand
 * Captures game state and persists to storage
 */
export class SaveGameHandler implements CommandHandler<SaveGameCommand> {
  constructor(
    private persistenceService: PersistenceService,
    private playerService: PlayerService,
    private eventBus: EventBus
  ) {}

  async execute(command: SaveGameCommand): Promise<void> {
    const startTime = performance.now()

    // Emit save started event
    this.eventBus.emit('persistence', {
      type: 'GameSaveStartedEvent',
      timestamp: Date.now(),
      slotId: command.slotId,
      auto: command.auto
    })

    try {
      // Capture game state
      const snapshot = this.persistenceService.captureGameSnapshot(
        this.playerService
      )

      // Save to storage
      const saveSlot = await this.persistenceService.saveGame(
        command.slotId,
        snapshot
      )

      const duration = performance.now() - startTime

      // Emit success event
      this.eventBus.emit('persistence', {
        type: 'GameSavedEvent',
        timestamp: Date.now(),
        slotId: command.slotId,
        slotName: command.slotName,
        saveSlot,
        auto: command.auto,
        duration
      })

      const prefix = command.auto ? '💾 Auto-saved' : '💾 Game saved'
      console.log(`${prefix} to "${command.slotName}" in ${duration.toFixed(0)}ms`)
    } catch (error) {
      // Emit failure event
      this.eventBus.emit('persistence', {
        type: 'GameSaveFailedEvent',
        timestamp: Date.now(),
        slotId: command.slotId,
        error: error instanceof Error ? error.message : String(error)
      })

      console.error('❌ Save failed:', error)
      throw error
    }
  }
}
