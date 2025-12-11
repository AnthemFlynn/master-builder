// src/modules/environment/application/voxel-lighting/LightingPipeline.ts
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../../../shared/ports/IVoxelQuery'
import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { ILightingPass } from './passes/ILightingPass'
import { ILightStorage } from '../../ports/ILightStorage'
import { SkyLightPass } from './passes/SkyLightPass'
import { PropagationPass } from './passes/PropagationPass'

export class LightingPipeline {
  private skyLightPass: SkyLightPass
  private propagationPass: PropagationPass

  constructor(private voxelQuery: IVoxelQuery) {
    this.skyLightPass = new SkyLightPass()
    this.propagationPass = new PropagationPass()
  }

  /**
   * Execute full lighting pipeline for a chunk
   * Modifies ChunkData in-place.
   */
  execute(coord: ChunkCoordinate, storage: ILightStorage): ChunkData {
    const startTime = performance.now()
    const chunkData = storage.getLightData(coord)
    if (!chunkData) throw new Error("Chunk not found for lighting")

    // Run passes in sequence
    this.skyLightPass.execute(chunkData, this.voxelQuery, coord, storage)
    this.propagationPass.execute(chunkData, this.voxelQuery, coord, storage)

    const duration = performance.now() - startTime
    // console.log(`💡 Lighting pipeline complete for chunk (${coord.x}, ${coord.z}) in ${duration.toFixed(2)}ms`)

    return chunkData
  }
}
