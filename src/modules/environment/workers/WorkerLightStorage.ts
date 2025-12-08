import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { ILightStorage } from '../ports/ILightStorage'
import { WorkerVoxelQuery } from './WorkerVoxelQuery'

// Adapter: LightStorage IS VoxelQuery in the Unified Model
export class WorkerLightStorage implements ILightStorage {
  constructor(private voxelQuery: WorkerVoxelQuery) {}

  getLightData(coord: ChunkCoordinate): ChunkData | undefined {
    return this.voxelQuery.getChunk(coord) || undefined
  }
}
