import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { LightData } from '../lighting-domain/LightData'
import { ILightStorage } from '../lighting-ports/ILightStorage'

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
