// src/modules/rendering/meshing-application/lod/OuterShellMesher.ts
import { ChunkData } from '../../../../shared/domain/ChunkData'
import { IVoxelQuery } from '../../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../../environment/ports/ILightingQuery'

/**
 * Level 3 LOD Mesher: Renders only exposed surface blocks
 * Extreme simplification for distant chunks (7+ chunks away)
 */
export class OuterShellMesher {
  buildMesh(
    chunk: ChunkData,
    voxelQuery: IVoxelQuery,
    lightingQuery: ILightingQuery
  ): {
    positions: Float32Array
    colors: Float32Array
    uvs: Float32Array
    indices: Uint16Array
  } {
    const positions: number[] = []
    const colors: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    let vertexCount = 0

    const chunkSize = 24
    const chunkHeight = 256

    // Iterate all blocks in chunk
    for (let x = 0; x < chunkSize; x++) {
      for (let y = 0; y < chunkHeight; y++) {
        for (let z = 0; z < chunkSize; z++) {
          const blockId = chunk.getBlockId(x, y, z)
          if (blockId === 0) continue // Skip air

          // Check 6 neighbors
          const faces = [
            { dx: 1, dy: 0, dz: 0, u: [0, 1, 1, 0], v: [0, 0, 1, 1] }, // +X
            { dx: -1, dy: 0, dz: 0, u: [0, 1, 1, 0], v: [0, 0, 1, 1] }, // -X
            { dx: 0, dy: 1, dz: 0, u: [0, 1, 1, 0], v: [0, 0, 1, 1] }, // +Y
            { dx: 0, dy: -1, dz: 0, u: [0, 1, 1, 0], v: [0, 0, 1, 1] }, // -Y
            { dx: 0, dy: 0, dz: 1, u: [0, 1, 1, 0], v: [0, 0, 1, 1] }, // +Z
            { dx: 0, dy: 0, dz: -1, u: [0, 1, 1, 0], v: [0, 0, 1, 1] }  // -Z
          ]

          for (const face of faces) {
            const nx = x + face.dx
            const ny = y + face.dy
            const nz = z + face.dz

            // Check if neighbor is air or out of bounds
            const neighborId = chunk.getBlockId(nx, ny, nz)
            if (neighborId !== 0) continue // Not exposed

            // Emit quad for this face
            const baseX = x
            const baseY = y
            const baseZ = z

            // Generate 4 vertices for quad (simplified, no rotation logic)
            const quad = this.createQuad(baseX, baseY, baseZ, face.dx, face.dy, face.dz)
            positions.push(...quad.positions)
            colors.push(...quad.colors) // Flat color (no lighting variation)
            uvs.push(...face.u.concat(face.v))

            // Indices (two triangles)
            indices.push(
              vertexCount, vertexCount + 1, vertexCount + 2,
              vertexCount, vertexCount + 2, vertexCount + 3
            )
            vertexCount += 4
          }
        }
      }
    }

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices)
    }
  }

  private createQuad(
    x: number, y: number, z: number,
    dx: number, dy: number, dz: number
  ): { positions: number[]; colors: number[] } {
    // Simplified quad generation (flat color, no lighting)
    const positions = []
    const colors = []

    // Generate 4 vertices based on face direction
    if (dx !== 0) { // X face
      const xPos = dx > 0 ? x + 1 : x
      positions.push(xPos, y, z, xPos, y + 1, z, xPos, y + 1, z + 1, xPos, y, z + 1)
    } else if (dy !== 0) { // Y face
      const yPos = dy > 0 ? y + 1 : y
      positions.push(x, yPos, z, x + 1, yPos, z, x + 1, yPos, z + 1, x, yPos, z + 1)
    } else { // Z face
      const zPos = dz > 0 ? z + 1 : z
      positions.push(x, y, zPos, x + 1, y, zPos, x + 1, y + 1, zPos, x, y + 1, zPos)
    }

    // Flat gray color (no lighting)
    for (let i = 0; i < 4; i++) {
      colors.push(0.7, 0.7, 0.7)
    }

    return { positions, colors }
  }
}
