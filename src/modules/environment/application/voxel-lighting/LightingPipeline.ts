// src/modules/environment/application/voxel-lighting/LightingPipeline.ts
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../../../shared/ports/IVoxelQuery'
import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { ILightingPass } from './passes/ILightingPass'
import { ILightStorage } from '../../ports/ILightStorage'
import { SkyLightPass } from './passes/SkyLightPass'
import { PropagationPass } from './passes/PropagationPass'

export class LightingPipeline {
  private passes: ILightingPass[] = [
    new SkyLightPass(),      // Phase 1: Vertical shadows
    new PropagationPass(),   // Phase 2: Horizontal flood-fill
  ]

  constructor(private voxelQuery: IVoxelQuery) {}

  /**
   * Execute full lighting pipeline for a chunk
   * Modifies ChunkData in-place.
   */
  execute(coord: ChunkCoordinate, storage: ILightStorage): ChunkData {
    const startTime = performance.now()
    // We assume the chunk is already in storage (via voxelQuery)
    const chunkData = storage.getLightData(coord)
    if (!chunkData) throw new Error("Chunk not found for lighting")

    // Run all passes in sequence
    for (const pass of this.passes) {
      pass.execute(chunkData, this.voxelQuery, coord, storage)
    }

    const duration = performance.now() - startTime
    // console.log(`💡 Lighting pipeline complete for chunk (${coord.x}, ${coord.z}) in ${duration.toFixed(2)}ms`)

    return chunkData
  }
}
