// src/modules/persistence/domain/commands/SaveGameCommand.ts
import { Command } from '../../../game/domain/commands/Command'

export class SaveGameCommand implements Command {
  readonly type = 'SaveGameCommand'
  readonly timestamp: number

  constructor(
    public readonly slotId: string,       // Unique slot identifier
    public readonly slotName: string,     // User-friendly name
    public readonly auto: boolean = false // Auto-save vs manual save
  ) {
    this.timestamp = Date.now()
  }
}
