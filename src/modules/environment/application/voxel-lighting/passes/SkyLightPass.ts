// src/modules/environment/application/voxel-lighting/passes/SkyLightPass.ts
import { ILightingPass } from './ILightingPass'
import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../../../shared/ports/IVoxelQuery'
import { ILightStorage } from '../../ports/ILightStorage'

export class SkyLightPass implements ILightingPass {
  execute(lightData: ChunkData, voxels: IVoxelQuery, coord: ChunkCoordinate, storage: ILightStorage): void {
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Vertical shadow pass: trace from top to bottom
    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        let skyLight = 15  // Start at full brightness

        // Scan from top to bottom
        for (let localY = 255; localY >= 0; localY--) {
          // Attenuate light based on block absorption
          const absorption = voxels.getLightAbsorption(
            worldX + localX,
            localY,
            worldZ + localZ
          )
          
          skyLight = Math.max(0, skyLight - absorption)

          // Set sky light using ChunkData API
          lightData.setSkyLight(localX, localY, localZ, skyLight)
        }
      }
    }

    // console.log(`☀️ SkyLightPass complete for chunk (${coord.x}, ${coord.z})`)
  }
}
