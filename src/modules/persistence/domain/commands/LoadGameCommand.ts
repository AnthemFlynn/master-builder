// src/modules/persistence/domain/commands/LoadGameCommand.ts
import { Command } from '../../../../shared/domain/Command'

export class LoadGameCommand implements Command {
  readonly type = 'LoadGameCommand'
  readonly timestamp: number

  constructor(
    public readonly slotId: string        // Unique slot identifier to load
  ) {
    this.timestamp = Date.now()
  }
}
