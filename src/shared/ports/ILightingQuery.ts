import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { LightValue } from '../domain/LightValue'

export interface ILightingQuery {
  getLight(worldX: number, worldY: number, worldZ: number): LightValue
  isLightingReady(coord: ChunkCoordinate): boolean
}
