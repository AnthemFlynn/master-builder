// src/modules/rendering/meshing-application/lod/NoAOMesher.ts
import { ChunkMesher } from '../ChunkMesher'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../../shared/domain/ChunkData'
import { IVoxelQuery } from '../../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../../environment/ports/ILightingQuery'
import { VertexBuilder } from '../VertexBuilder'

/**
 * Simple VoxelQuery wrapper for single chunk
 */
class ChunkVoxelQuery implements IVoxelQuery {
  constructor(private chunk: ChunkData) {}

  getBlockType(worldX: number, worldY: number, worldZ: number): number {
    const chunkX = this.chunk.coord.x * 24
    const chunkZ = this.chunk.coord.z * 24
    const localX = worldX - chunkX
    const localZ = worldZ - chunkZ

    if (localX < 0 || localX >= 24 || localZ < 0 || localZ >= 24 || worldY < 0 || worldY >= 256) {
      return -1 // Air
    }

    return this.chunk.getBlockId(localX, worldY, localZ)
  }
}

/**
 * Simple LightingQuery wrapper for single chunk
 */
class ChunkLightingQuery implements ILightingQuery {
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

/**
 * Level 1 LOD Mesher: Same as full detail but skips AO calculation
 * Saves ~20-30% generation time with minimal visual impact at distance
 */
export class NoAOMesher {
  buildMesh(
    chunk: ChunkData,
    voxelQuery?: IVoxelQuery,
    lightingQuery?: ILightingQuery
  ): {
    positions: Float32Array
    colors: Float32Array
    uvs: Float32Array
    indices: Uint16Array
  } {
    const coord = chunk.coord

    // Use provided queries or create simple wrappers
    const voxels = voxelQuery || new ChunkVoxelQuery(chunk)
    const lighting = lightingQuery || new ChunkLightingQuery(chunk)

    const vertexBuilder = new VertexBuilder(voxels, lighting, coord.x, coord.z)

    // Set flag to skip AO in VertexBuilder
    vertexBuilder.setSkipAO(true)

    const mesher = new ChunkMesher(voxels, lighting, coord)
    mesher.buildMesh(vertexBuilder)

    const allBuffers = vertexBuilder.getBuffers()

    // Combine all buffers into one
    // VertexBuilder creates separate buffers per material (blockType:faceIndex)
    // but for LOD we can merge them into a single buffer
    const positions: number[] = []
    const colors: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    let vertexOffset = 0

    for (const buffer of allBuffers.values()) {
      // Append vertex data
      positions.push(...buffer.positions)
      colors.push(...buffer.colors)
      uvs.push(...buffer.uvs)

      // Adjust indices by current vertex offset
      for (let i = 0; i < buffer.indices.length; i++) {
        indices.push(buffer.indices[i] + vertexOffset)
      }

      // Update vertex offset for next buffer
      vertexOffset += buffer.positions.length / 3
    }

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices)
    }
  }
}
