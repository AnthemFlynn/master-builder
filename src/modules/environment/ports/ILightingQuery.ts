import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { LightValue } from '../domain/voxel-lighting/LightValue'

export interface ILightingQuery {
  getLight(worldX: number, worldY: number, worldZ: number): LightValue
  isLightingReady(coord: ChunkCoordinate): boolean
}
