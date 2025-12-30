// src/modules/core/domain/commands/GenerateChunkCommand.ts
import { Command } from '../../../../shared/domain/Command'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'

export class GenerateChunkCommand implements Command {
  readonly type = 'GenerateChunkCommand'
  readonly timestamp: number

  constructor(
    public readonly chunkCoord: ChunkCoordinate,
    public readonly renderDistance: number,
    public readonly lodLevel: 0 | 1 | 2 | 3 = 0
  ) {
    this.timestamp = Date.now()
  }
}
