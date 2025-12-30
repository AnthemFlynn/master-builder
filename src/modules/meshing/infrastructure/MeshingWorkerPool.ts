import { WorkerPool } from '../../../shared/infrastructure/WorkerPool'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'

interface MeshingTask {
  type: 'GEN_MESH'
  x: number
  z: number
  neighborVoxels: Record<string, ArrayBuffer>
  neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
}

interface MeshingResult {
  type: 'MESH_GENERATED'
  x: number
  z: number
  geometry: Record<string, {
    positions: ArrayBuffer
    colors: ArrayBuffer
    uvs: ArrayBuffer
    indices: ArrayBuffer
  }>
  timingMs: number
}

export class MeshingWorkerPool {
  private pool: WorkerPool

  constructor(workerCount: number = 6) {
    this.pool = new WorkerPool(workerCount, '/assets/MeshingWorker.js')
  }

  async generateMesh(
    coord: ChunkCoordinate,
    neighborVoxels: Record<string, ArrayBuffer>,
    neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
  ): Promise<MeshingResult> {
    const task: MeshingTask = {
      type: 'GEN_MESH',
      x: coord.x,
      z: coord.z,
      neighborVoxels,
      neighborLight
    }

    return this.pool.execute(task) as Promise<MeshingResult>
  }

  getUtilization(): { busy: number; total: number } {
    return this.pool.getUtilization()
  }

  terminate(): void {
    this.pool.terminate()
  }
}
