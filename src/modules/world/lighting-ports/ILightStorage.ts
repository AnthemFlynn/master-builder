import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { LightData } from '../lighting-domain/LightData'

export interface ILightStorage {
  getLightData(coord: ChunkCoordinate): LightData | undefined
}
