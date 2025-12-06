// src/modules/world/lighting-application/LightingPipeline.ts
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { IVoxelQuery } from '../ports/IVoxelQuery'
import { LightData } from '../lighting-domain/LightData'
import { ILightingPass } from './passes/ILightingPass'
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
   * Returns fully calculated LightData
   */
  execute(coord: ChunkCoordinate): LightData {
    const startTime = performance.now()
    const lightData = new LightData(coord)

    // Run all passes in sequence (EXPLICIT ORDER)
    for (const pass of this.passes) {
      pass.execute(lightData, this.voxelQuery, coord)
    }

    const duration = performance.now() - startTime
    console.log(`💡 Lighting pipeline complete for chunk (${coord.x}, ${coord.z}) in ${duration.toFixed(2)}ms`)

    return lightData
  }
}
