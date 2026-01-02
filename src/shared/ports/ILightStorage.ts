import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { ChunkData } from '../domain/ChunkData'

export interface ILightStorage {
  getLightData(coord: ChunkCoordinate): ChunkData | undefined
}
