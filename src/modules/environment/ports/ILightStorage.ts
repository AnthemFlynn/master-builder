import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { LightData } from '../domain/voxel-lighting/LightData'

export interface ILightStorage {
  getLightData(coord: ChunkCoordinate): LightData | undefined
}
