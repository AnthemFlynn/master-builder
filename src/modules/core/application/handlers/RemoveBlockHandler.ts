// src/modules/core/application/handlers/RemoveBlockHandler.ts
import { CommandHandler } from '../../../../shared/domain/Command'
import { RemoveBlockCommand } from '../../domain/commands/RemoveBlockCommand'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../../../../shared/infrastructure/EventBus'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_HEIGHT } from '../../../../shared/constants/ChunkConstants'

export class RemoveBlockHandler implements CommandHandler<RemoveBlockCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus
  ) {}

  execute(command: RemoveBlockCommand): void {
    const { x, y, z } = command

    // Validate
    if (y < 0 || y >= CHUNK_HEIGHT) {
      console.warn('Invalid Y position for block removal')
      return
    }

    // Get the block type before removing (for audio)
    const blockType = this.worldService.getBlockType(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z)
    )

    // Update world with AIR (0)
    this.worldService.setBlock(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z),
      0 // Air
    )

    // Calculate chunk coordinate
    const chunkCoord = new ChunkCoordinate(
      Math.floor(x / CHUNK_WIDTH),
      Math.floor(z / CHUNK_DEPTH)
    )

    const position = {
      x: Math.floor(x),
      y: Math.floor(y),
      z: Math.floor(z)
    }

    // Emit event with block type for audio
    this.eventBus.emit('world', {
      type: 'BlockRemovedEvent',
      timestamp: Date.now(),
      position,
      blockType: blockType,
      chunkCoord: chunkCoord
    })

    console.log(`🔨 Block removed at (${x}, ${y}, ${z})`)
  }
}
