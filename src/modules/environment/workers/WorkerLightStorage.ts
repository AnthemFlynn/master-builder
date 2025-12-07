import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { LightData } from '../domain/voxel-lighting/LightData'
import { ILightStorage } from '../ports/ILightStorage'

export class WorkerLightStorage implements ILightStorage {
  private chunks = new Map<string, LightData>()

  addLightData(lightData: LightData) {
    this.chunks.set(lightData.coord.toKey(), lightData)
  }

  getLightData(coord: ChunkCoordinate): LightData | undefined {
    return this.chunks.get(coord.toKey())
  }
  
  getAll(): LightData[] {
    return Array.from(this.chunks.values())
  }
}
