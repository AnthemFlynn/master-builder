// src/modules/lighting/application/passes/ILightingPass.ts
import { LightData } from '../../domain/voxel-lighting/LightData'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../../shared/ports/IVoxelQuery'
import { ILightStorage } from '../../ports/ILightStorage'

export interface ILightingPass {
  /**
   * Execute this pass on a chunk's lighting data
   */
  execute(
    lightData: LightData,
    voxels: IVoxelQuery,
    coord: ChunkCoordinate,
    storage: ILightStorage
  ): void
}
