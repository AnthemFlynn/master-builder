import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../environment/ports/ILightingQuery'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { VertexBuilder } from './VertexBuilder'
import { blockRegistry } from '../../../modules/blocks'

export class ChunkMesher {
  constructor(
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery,
    private chunkCoord: ChunkCoordinate
  ) {}

  buildMesh(vertexBuilder: VertexBuilder): void {
    const startX = this.chunkCoord.x * 24
    const startZ = this.chunkCoord.z * 24
    const size = 24
    const height = 256

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < size; z++) {
          const worldX = startX + x
          const worldY = y
          const worldZ = startZ + z
          
          const blockType = this.voxels.getBlockType(worldX, worldY, worldZ)
          if (blockType === -1 || blockType === 0) continue // Skip Air and Void

          // Check all 6 faces
          this.checkFace(vertexBuilder, worldX, worldY, worldZ, blockType, 1, 0, 0, 0, 1)  // Right (+X)
          this.checkFace(vertexBuilder, worldX, worldY, worldZ, blockType, -1, 0, 0, 0, -1) // Left (-X)
          this.checkFace(vertexBuilder, worldX, worldY, worldZ, blockType, 0, 1, 0, 1, 1)  // Top (+Y)
          this.checkFace(vertexBuilder, worldX, worldY, worldZ, blockType, 0, -1, 0, 1, -1) // Bottom (-Y)
          this.checkFace(vertexBuilder, worldX, worldY, worldZ, blockType, 0, 0, 1, 2, 1)  // Front (+Z)
          this.checkFace(vertexBuilder, worldX, worldY, worldZ, blockType, 0, 0, -1, 2, -1) // Back (-Z)
        }
      }
    }
  }

  private checkFace(
    vertexBuilder: VertexBuilder,
    wx: number, wy: number, wz: number,
    currentBlock: number,
    dx: number, dy: number, dz: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): void {
    const neighborX = wx + dx
    const neighborY = wy + dy
    const neighborZ = wz + dz

    // 1. Get neighbor block type
    const neighborBlock = this.voxels.getBlockType(neighborX, neighborY, neighborZ)

    // 2. CULLING LOGIC: Determine if we should draw this face
    let shouldDraw = false

    if (neighborBlock === -1) {
      // Neighbor is Air -> Draw
      shouldDraw = true
    } else {
      // Neighbor is a block. Check transparency.
      const currentDef = blockRegistry.get(currentBlock)
      const neighborDef = blockRegistry.get(neighborBlock)

      const currentTransparent = currentDef?.transparent ?? false
      const neighborTransparent = neighborDef?.transparent ?? false

      if (!neighborTransparent) {
        // Neighbor is solid/opaque -> CULL (Never draw face against solid block)
        shouldDraw = false
      } else {
        // Neighbor is transparent.
        if (!currentTransparent) {
          // Current is solid, Neighbor is transparent -> Draw (e.g. Stone next to Water)
          shouldDraw = true
        } else {
          // Both are transparent (e.g. Glass next to Glass, or Water next to Glass)
          // Optimized Culling: If they are the SAME block type, don't draw inner faces.
          // (Unless it's leaves? Leaves usually want inner faces if they are "fancy", but standard is cull)
          // For now: Cull if same type.
          if (currentBlock === neighborBlock) {
             shouldDraw = false
          } else {
             shouldDraw = true
          }
        }
      }
    }

    if (shouldDraw) {
      // Calculate local coords for vertex builder (relative to chunk)
      // Ensure positive local coordinates even if world coords are negative
      const lx = ((wx % 24) + 24) % 24
      const ly = wy
      const lz = ((wz % 24) + 24) % 24

      const faceIndex = this.getFaceIndex(axis, direction)
      
      vertexBuilder.addQuad(
        lx, ly, lz, // Use correct local coords
        1, 1, // Width, Height (always 1 for naive meshing)
        axis, direction,
        currentBlock,
        faceIndex
      )
    }
  }

  private getFaceIndex(axis: 0 | 1 | 2, direction: -1 | 1): number {
    if (axis === 0) return direction === 1 ? 0 : 1 // Right, Left
    if (axis === 1) return direction === 1 ? 2 : 3 // Top, Bottom
    if (axis === 2) return direction === 1 ? 4 : 5 // Front, Back
    return 0
  }
}
