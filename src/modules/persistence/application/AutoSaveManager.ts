// src/modules/persistence/application/AutoSaveManager.ts
import { CommandBus } from '../../game/infrastructure/CommandBus'
import { SaveGameCommand } from '../domain/commands/SaveGameCommand'

/**
 * Manages automatic saving at regular intervals
 * Saves to a dedicated "autosave" slot
 */
export class AutoSaveManager {
  private timerId: number | null = null
  private readonly interval: number = 5 * 60 * 1000  // 5 minutes
  private readonly slotId = 'autosave'

  constructor(
    private commandBus: CommandBus
  ) {}

  /**
   * Start auto-save timer
   */
  start(): void {
    if (this.timerId !== null) {
      console.warn('[AutoSaveManager] Already running')
      return
    }

    this.timerId = window.setInterval(() => {
      this.triggerAutoSave()
    }, this.interval)

    console.log(`⏰ Auto-save started (every ${this.interval / 1000}s)`)
  }

  /**
   * Stop auto-save timer
   */
  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
      console.log('⏰ Auto-save stopped')
    }
  }

  /**
   * Trigger an immediate auto-save
   */
  private triggerAutoSave(): void {
    this.commandBus.send(
      new SaveGameCommand(this.slotId, 'Auto Save', true)
    )
  }

  /**
   * Check if auto-save is running
   */
  isRunning(): boolean {
    return this.timerId !== null
  }
}
