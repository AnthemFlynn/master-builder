// src/modules/environment/application/voxel-lighting/passes/ILightingPass.ts
import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../../../shared/ports/IVoxelQuery'
import { ILightStorage } from '../../../../../shared/ports/ILightStorage'

export interface ILightingPass {
  /**
   * Execute this pass on a chunk's lighting data
   */
  execute(
    lightData: ChunkData,
    voxels: IVoxelQuery,
    coord: ChunkCoordinate,
    storage: ILightStorage
  ): void
}
