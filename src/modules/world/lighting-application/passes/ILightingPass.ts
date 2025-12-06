// src/modules/lighting/application/passes/ILightingPass.ts
import { LightData } from '../../domain/LightData'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../world/ports/IVoxelQuery'

export interface ILightingPass {
  /**
   * Execute this pass on a chunk's lighting data
   */
  execute(
    lightData: LightData,
    voxels: IVoxelQuery,
    coord: ChunkCoordinate
  ): void
}
