import { WorkerPool } from '../../../shared/infrastructure/WorkerPool'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'

interface ChunkGenerationTask {
  type: 'GENERATE_CHUNK'
  x: number
  z: number
  renderDistance: number
}

interface ChunkGenerationResult {
  type: 'CHUNK_GENERATED'
  x: number
  z: number
  renderDistance: number
  blockBuffer: ArrayBuffer
  metadata: Map<number, any>
  timingMs: number
}

export class ChunkWorkerPool {
  private pool: WorkerPool

  constructor(workerCount: number = 6) {
    this.pool = new WorkerPool(workerCount, '/assets/ChunkWorker.js')
  }

  async generateChunk(
    coord: ChunkCoordinate,
    renderDistance: number
  ): Promise<ChunkGenerationResult> {
    const task: ChunkGenerationTask = {
      type: 'GENERATE_CHUNK',
      x: coord.x,
      z: coord.z,
      renderDistance
    }

    return this.pool.execute(task) as Promise<ChunkGenerationResult>
  }

  getUtilization(): { busy: number; total: number } {
    return this.pool.getUtilization()
  }

  terminate(): void {
    this.pool.terminate()
  }
}
