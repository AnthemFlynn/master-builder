import { WorkerPool } from '../../../shared/infrastructure/WorkerPool'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'

interface LightingTask {
  type: 'CALC_LIGHT'
  x: number
  z: number
  neighborVoxels: Record<string, ArrayBuffer>
}

interface LightingResult {
  type: 'LIGHT_CALCULATED'
  x: number
  z: number
  chunkBuffer: ArrayBuffer
  timingMs: number
}

export class LightingWorkerPool {
  private pool: WorkerPool

  constructor(workerCount: number = 6) {
    this.pool = new WorkerPool(workerCount, '/assets/LightingWorker.js')
  }

  async calculateLight(
    coord: ChunkCoordinate,
    neighborVoxels: Record<string, ArrayBuffer>
  ): Promise<LightingResult> {
    const task: LightingTask = {
      type: 'CALC_LIGHT',
      x: coord.x,
      z: coord.z,
      neighborVoxels
    }

    return this.pool.execute(task) as Promise<LightingResult>
  }

  getUtilization(): { busy: number; total: number } {
    return this.pool.getUtilization()
  }

  terminate(): void {
    this.pool.terminate()
  }
}
