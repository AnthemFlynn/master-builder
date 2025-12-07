// src/modules/game/application/handlers/PlaceBlockHandler.ts
import { CommandHandler } from '../../domain/commands/Command'
import { PlaceBlockCommand } from '../../domain/commands/PlaceBlockCommand'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../../infrastructure/EventBus'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'

export class PlaceBlockHandler implements CommandHandler<PlaceBlockCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus
  ) {}

  execute(command: PlaceBlockCommand): void {
    const { x, y, z, blockType } = command

    // Validate
    if (y < 0 || y > 255) {
      console.warn('Invalid Y position for block placement')
      return
    }

    // Update world
    this.worldService.setBlock(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z),
      blockType
    )

    // Calculate chunk coordinate
    const chunkCoord = new ChunkCoordinate(
      Math.floor(x / 24),
      Math.floor(z / 24)
    )

    const position = {
      x: Math.floor(x),
      y: Math.floor(y),
      z: Math.floor(z)
    }

    // Emit event
    this.eventBus.emit('world', {
      type: 'BlockPlacedEvent',
      timestamp: Date.now(),
      position,
      blockType: blockType,
      chunkCoord: chunkCoord
    })

    console.log(`🧱 Block placed at (${x}, ${y}, ${z})`)
  }
}
