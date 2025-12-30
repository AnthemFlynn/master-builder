import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'

export class WaterPass implements GenerationPass {
  readonly name = 'WaterPass'
  private readonly seaLevel = 63  // Match Minecraft's sea level

  execute(context: GenerationContext): void {
    // Fill water (sea level)
    this.fillSeaLevel(context)

    // Create beaches (gentle slopes) vs cliffs (steep slopes)
    this.createCoastlines(context)

    // Update surface map for water surfaces
    this.updateWaterSurfaces(context)
  }

  private fillSeaLevel(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]

        // Fill air below sea level with water
        for (let y = terrainHeight + 1; y <= this.seaLevel; y++) {
          if (context.getBlock(x, y, z) === BlockType.air) {
            context.setBlock(x, y, z, BlockType.water)
          }
        }
      }
    }
  }

  private createCoastlines(context: GenerationContext): void {
    // Analyze slope at each position to determine beach vs cliff
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]

        // Only process coastline zone (near sea level)
        const isCoastalZone = terrainHeight >= this.seaLevel - 6 &&
                              terrainHeight <= this.seaLevel + 8

        if (!isCoastalZone) continue

        // Calculate slope (max height difference from neighbors)
        const slope = this.calculateSlope(context, x, z)

        // BEACH: Gentle slope (< 3 blocks difference) near water
        // CLIFF: Steep slope (>= 3 blocks difference) - keep as stone
        const isBeach = slope < 3 && terrainHeight <= this.seaLevel + 4

        if (isBeach) {
          const surfaceY = Math.min(terrainHeight, this.seaLevel)

          // Surface layer to sand
          if (context.getBlock(x, surfaceY, z) === BlockType.stone) {
            context.setBlock(x, surfaceY, z, BlockType.sand)
          }

          // Subsurface layers (3-5 blocks depending on how close to water)
          const sandDepth = terrainHeight < this.seaLevel ? 5 : 3
          for (let depth = 1; depth <= sandDepth; depth++) {
            const y = surfaceY - depth
            if (y > 0 && context.getBlock(x, y, z) === BlockType.stone) {
              context.setBlock(x, y, z, BlockType.sand)
            }
          }
        }
        // Cliffs stay as stone (natural rock faces)
      }
    }
  }

  private calculateSlope(context: GenerationContext, x: number, z: number): number {
    const centerHeight = context.heightMap[x][z]
    let maxDiff = 0

    // Check 4 cardinal neighbors
    const neighbors = [
      [x - 1, z], [x + 1, z],
      [x, z - 1], [x, z + 1]
    ]

    for (const [nx, nz] of neighbors) {
      if (nx >= 0 && nx < 24 && nz >= 0 && nz < 24) {
        const diff = Math.abs(context.heightMap[nx][nz] - centerHeight)
        maxDiff = Math.max(maxDiff, diff)
      }
    }

    return maxDiff
  }

  private updateWaterSurfaces(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]

        // If terrain is below sea level, surface is water at sea level
        if (terrainHeight < this.seaLevel) {
          context.surfaceMap.set(`${x},${z}`, {
            y: this.seaLevel,
            blockType: BlockType.water,
            isCave: false
          })
        }
      }
    }
  }
}
