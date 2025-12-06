// src/modules/game/application/handlers/GenerateChunkHandler.ts
import { CommandHandler } from '../../domain/commands/Command'
import { GenerateChunkCommand } from '../../domain/commands/GenerateChunkCommand'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../../infrastructure/EventBus'

export class GenerateChunkHandler implements CommandHandler<GenerateChunkCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus,
    private terrainGenerator: any  // TODO: Type this properly
  ) {}

  execute(command: GenerateChunkCommand): void {
    const chunk = this.worldService.getOrCreateChunk(command.chunkCoord)

    // Check if already generated
    if (chunk.getBlockType(12, 128, 12) !== -1) {
      console.log(`⏭️ Chunk (${command.chunkCoord.x}, ${command.chunkCoord.z}) already generated`)
      return
    }

    // Generate blocks using terrain generator
    this.terrainGenerator.populate(chunk, command.chunkCoord)

    // Emit event
    this.eventBus.emit('world', {
      type: 'ChunkGeneratedEvent',
      timestamp: Date.now(),
      chunkCoord: command.chunkCoord,
      renderDistance: command.renderDistance
    })

    console.log(`🌍 Generated chunk (${command.chunkCoord.x}, ${command.chunkCoord.z})`)
  }
}
