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

  /**
   * Set the world type for all workers (must be called before generating chunks)
   */
  async setWorldType(worldType: string, seed?: number): Promise<void> {
    const message = {
      type: 'SET_WORLD_TYPE',
      worldType,
      seed
    }
    await this.pool.broadcast(message)
    console.log(`🌍 All ${this.pool.getWorkerCount()} workers set to world type: ${worldType}`)
  }

  terminate(): void {
    this.pool.terminate()
  }
}
