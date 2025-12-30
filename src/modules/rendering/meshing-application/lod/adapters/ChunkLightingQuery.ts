import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { ILightingQuery } from '../../../../environment/ports/ILightingQuery'

/**
 * Adapter that wraps a single ChunkData to implement ILightingQuery interface.
 * Used by LOD meshers to query lighting data from a chunk.
 */
export class ChunkLightingQuery implements ILightingQuery {
  constructor(private chunk: ChunkData) {}

  getLight(worldX: number, worldY: number, worldZ: number): any {
    const chunkX = this.chunk.coord.x * 24
    const chunkZ = this.chunk.coord.z * 24
    const localX = worldX - chunkX
    const localZ = worldZ - chunkZ

    if (localX < 0 || localX >= 24 || localZ < 0 || localZ >= 24 || worldY < 0 || worldY >= 256) {
      return {
        sky: { r: 15, g: 15, b: 15 },
        block: { r: 0, g: 0, b: 0 }
      }
    }

    const sky = this.chunk.getSkyLight(localX, worldY, localZ)
    const block = this.chunk.getBlockLight(localX, worldY, localZ)

    return {
      sky: { r: sky, g: sky, b: sky },
      block
    }
  }
}
