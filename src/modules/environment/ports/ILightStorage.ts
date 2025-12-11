import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'

export interface ILightStorage {
  getLightData(coord: ChunkCoordinate): ChunkData | undefined
}
