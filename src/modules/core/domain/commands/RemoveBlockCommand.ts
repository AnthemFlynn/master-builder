// src/modules/core/domain/commands/RemoveBlockCommand.ts
import { Command } from '../../../../shared/domain/Command'

export class RemoveBlockCommand implements Command {
  readonly type = 'RemoveBlockCommand'
  readonly timestamp: number

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number
  ) {
    this.timestamp = Date.now()
  }
}
