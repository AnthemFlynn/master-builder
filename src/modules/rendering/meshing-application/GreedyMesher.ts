// src/modules/meshing/application/GreedyMesher.ts
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ILightingQuery } from '../../world/lighting-ports/ILightingQuery'
import { VertexBuilder } from './VertexBuilder'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'

export class GreedyMesher {
  constructor(
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery,
    private chunkCoord: ChunkCoordinate
  ) {}

  buildMesh(vertexBuilder: VertexBuilder): void {
    // Process each axis
    for (const axis of [0, 1, 2] as const) {
      for (const direction of [-1, 1] as const) {
        this.processAxis(vertexBuilder, axis, direction)
      }
    }
  }

  private processAxis(
    vertexBuilder: VertexBuilder,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): void {
    // Use same greedy meshing algorithm from original
    // But query via this.voxels.getBlockType() and this.lighting.getLight()

    const [u, v] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1]
    const uSize = [24, 256, 24][u]
    const vSize = [24, 256, 24][v]
    const axisSize = [24, 256, 24][axis]

    const worldOffsetX = this.chunkCoord.x * 24
    const worldOffsetZ = this.chunkCoord.z * 24

    for (let d = 0; d < axisSize; d++) {
      const mask: (number | null)[][] = []
      for (let i = 0; i < uSize; i++) {
        mask[i] = []
        for (let j = 0; j < vSize; j++) {
          let localX = 0, localY = 0, localZ = 0
          if (axis === 0) { localX = d; localY = i; localZ = j }
          else if (axis === 1) { localX = i; localY = d; localZ = j }
          else { localX = i; localY = j; localZ = d }

          mask[i][j] = this.isFaceVisible(localX, localY, localZ, axis, direction)
        }
      }

      // Greedy merge (same as original)
      for (let i = 0; i < uSize; i++) {
        for (let j = 0; j < vSize; j++) {
          const blockType = mask[i][j]
          if (blockType === null) continue

          let baseX = 0, baseY = 0, baseZ = 0
          if (axis === 0) { baseX = d; baseY = i; baseZ = j }
          else if (axis === 1) { baseX = i; baseY = d; baseZ = j }
          else { baseX = i; baseY = j; baseZ = d }

          // Expand width
          let width = 1
          while (j + width < vSize) {
            if (mask[i][j + width] !== blockType) break

            let checkX = baseX, checkY = baseY, checkZ = baseZ
            if (axis === 0) checkZ += width
            else if (axis === 1) checkZ += width
            else checkY += width

            if (!this.lightMatches(baseX, baseY, baseZ, checkX, checkY, checkZ)) break

            width++
          }

          // Expand height
          let height = 1
          while (i + height < uSize) {
            let canExpand = true

            for (let k = 0; k < width; k++) {
              if (mask[i + height][j + k] !== blockType) {
                canExpand = false
                break
              }

              let checkX = baseX, checkY = baseY, checkZ = baseZ
              if (axis === 0) { checkY += height; checkZ += k }
              else if (axis === 1) { checkX += height; checkZ += k }
              else { checkX += height; checkY += k }

              if (!this.lightMatches(baseX, baseY, baseZ, checkX, checkY, checkZ)) {
                canExpand = false
                break
              }
            }

            if (!canExpand) break
            height++
          }

          vertexBuilder.addQuad(baseX, baseY, baseZ, width, height, axis, direction, blockType)

          for (let di = 0; di < height; di++) {
            for (let dj = 0; dj < width; dj++) {
              mask[i + di][j + dj] = null
            }
          }
        }
      }
    }
  }

  private isFaceVisible(
    localX: number, localY: number, localZ: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): number | null {
    const worldX = this.chunkCoord.x * 24 + localX
    const worldZ = this.chunkCoord.z * 24 + localZ

    // Bounds check
    if (localX < 0 || localX >= 24 || localY < 0 || localY >= 256 || localZ < 0 || localZ >= 24) {
      return null
    }

    const currentBlock = this.voxels.getBlockType(worldX, localY, worldZ)

    if (currentBlock === -1) {
      return null  // Air has no faces
    }

    // Check neighbor
    let nx = worldX, ny = localY, nz = worldZ

    if (axis === 0) nx += direction
    else if (axis === 1) ny += direction
    else nz += direction

    const neighborBlock = this.voxels.getBlockType(nx, ny, nz)

    if (neighborBlock === -1 || neighborBlock !== currentBlock) {
      return currentBlock  // Face visible
    }

    return null  // Hidden
  }

  private lightMatches(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number
  ): boolean {
    const worldX1 = this.chunkCoord.x * 24 + x1
    const worldZ1 = this.chunkCoord.z * 24 + z1
    const worldX2 = this.chunkCoord.x * 24 + x2
    const worldZ2 = this.chunkCoord.z * 24 + z2

    const l1 = this.lighting.getLight(worldX1, y1, worldZ1)
    const l2 = this.lighting.getLight(worldX2, y2, worldZ2)

    return (
      l1.sky.r === l2.sky.r && l1.sky.g === l2.sky.g && l1.sky.b === l2.sky.b &&
      l1.block.r === l2.block.r && l1.block.g === l2.block.g && l1.block.b === l2.block.b
    )
  }
}
