// src/modules/lighting/application/passes/SkyLightPass.ts
import { ILightingPass } from './ILightingPass'
import { LightData } from '../../lighting-domain/LightData'
import { ChunkCoordinate } from '../../domain/ChunkCoordinate'
import { IVoxelQuery } from '../../ports/IVoxelQuery'
import { ILightStorage } from '../../lighting-ports/ILightStorage'

export class SkyLightPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoordinate, storage: ILightStorage): void {
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Vertical shadow pass: trace from top to bottom
    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        let skyLight = 15  // Start at full brightness

        // Scan from top to bottom
        for (let localY = 255; localY >= 0; localY--) {
          const blockType = voxels.getBlockType(
            worldX + localX,
            localY,
            worldZ + localZ
          )

          if (blockType !== -1) {
            // Hit solid block - shadow below this point
            skyLight = 0
          }

          // Set sky light (block light still 0, comes from PropagationPass)
          lightData.setLight(localX, localY, localZ, {
            sky: { r: skyLight, g: skyLight, b: skyLight },
            block: { r: 0, g: 0, b: 0 }
          })
        }
      }
    }

    console.log(`☀️ SkyLightPass complete for chunk (${coord.x}, ${coord.z})`)
  }
}
