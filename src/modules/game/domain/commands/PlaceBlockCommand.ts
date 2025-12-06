// src/modules/terrain/domain/commands/PlaceBlockCommand.ts
import { Command } from './Command'

export class PlaceBlockCommand implements Command {
  readonly type = 'PlaceBlockCommand'
  readonly timestamp: number

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
    public readonly blockType: number
  ) {
    this.timestamp = Date.now()
  }
}
