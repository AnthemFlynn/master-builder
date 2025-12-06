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
    const { position, blockType } = command

    // Validate
    if (position.y < 0 || position.y > 255) {
      console.warn('Invalid Y position for block placement')
      return
    }

    // Update world
    this.worldService.setBlock(
      Math.floor(position.x),
      Math.floor(position.y),
      Math.floor(position.z),
      blockType
    )

    // Calculate chunk coordinate
    const chunkCoord = new ChunkCoordinate(
      Math.floor(position.x / 24),
      Math.floor(position.z / 24)
    )

    // Emit event
    this.eventBus.emit('world', {
      type: 'BlockPlacedEvent',
      timestamp: Date.now(),
      position: position,
      blockType: blockType,
      chunkCoord: chunkCoord
    })

    console.log(`🧱 Block placed at (${position.x}, ${position.y}, ${position.z})`)
  }
}
