// src/modules/lighting/application/passes/ILightingPass.ts
import { LightData } from '../../lighting-domain/LightData'
import { ChunkCoordinate } from '../../domain/ChunkCoordinate'
import { IVoxelQuery } from '../../ports/IVoxelQuery'

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
