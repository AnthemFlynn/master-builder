// src/modules/game/application/handlers/GenerateChunkHandler.ts
import { CommandHandler } from '../../domain/commands/Command'
import { GenerateChunkCommand } from '../../domain/commands/GenerateChunkCommand'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../../infrastructure/EventBus'

export class GenerateChunkHandler implements CommandHandler<GenerateChunkCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus
  ) {}

  execute(command: GenerateChunkCommand): void {
    // Delegate to WorldService for async generation (Worker)
    this.worldService.generateChunkAsync(command.chunkCoord, command.renderDistance)
  }
}
