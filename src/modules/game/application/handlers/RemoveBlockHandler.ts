// src/modules/game/application/handlers/RemoveBlockHandler.ts
import { CommandHandler } from '../../domain/commands/Command'
import { RemoveBlockCommand } from '../../domain/commands/RemoveBlockCommand'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../../infrastructure/EventBus'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'

export class RemoveBlockHandler implements CommandHandler<RemoveBlockCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus
  ) {}

  execute(command: RemoveBlockCommand): void {
    const { x, y, z } = command

    // Validate
    if (y < 0 || y > 255) {
      console.warn('Invalid Y position for block removal')
      return
    }

    // Get the block type before removing (for audio)
    const blockType = this.worldService.getBlockType(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z)
    )

    // Remove block (set to air = -1)
    this.worldService.setBlock(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z),
      -1
    )

    // Calculate chunk coordinate
    const chunkCoord = new ChunkCoordinate(
      Math.floor(x / 24),
      Math.floor(z / 24)
    )

    // Emit event with block type for audio
    this.eventBus.emit('world', {
      type: 'BlockRemovedEvent',
      timestamp: Date.now(),
      x: Math.floor(x),
      y: Math.floor(y),
      z: Math.floor(z),
      blockType: blockType,
      chunkCoord: chunkCoord
    })

    console.log(`🔨 Block removed at (${x}, ${y}, ${z})`)
  }
}
