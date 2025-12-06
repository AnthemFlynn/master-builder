// src/modules/lighting/application/passes/PropagationPass.ts
import { ILightingPass } from './ILightingPass'
import { LightData } from '../../domain/LightData'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../world/ports/IVoxelQuery'

export class PropagationPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoordinate): void {
    // TODO: Extract flood-fill logic from src/lighting/LightingEngine.ts
    // For now, stub that does nothing (SkyLightPass provides basic lighting)
    console.log(`💡 PropagationPass stub for chunk (${coord.x}, ${coord.z})`)
  }
}
