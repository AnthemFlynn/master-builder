// src/modules/terrain/domain/commands/PlaceBlockCommand.ts
import { Command } from './Command'
import * as THREE from 'three'

export class PlaceBlockCommand implements Command {
  readonly type = 'PlaceBlockCommand'
  readonly timestamp: number

  constructor(
    public readonly position: THREE.Vector3,
    public readonly blockType: number
  ) {
    this.timestamp = Date.now()
  }
}
