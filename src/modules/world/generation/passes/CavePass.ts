import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise3D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

export class CavePass implements GenerationPass {
  readonly name = 'CavePass'

  execute(context: GenerationContext): void {
    // Generate cheese caves (large caverns)
    this.generateCheeseCaves(context)

    // Rebuild surface map (caves changed what's "surface")
    this.rebuildSurfaceMap(context)
  }

  private generateCheeseCaves(context: GenerationContext): void {
    const noise3D = createNoise3D(() => context.seed + 1000)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const surfaceHeight = context.heightMap[x][z]
        const minY = 5   // Don't carve near bedrock
        const maxY = Math.max(minY, surfaceHeight - 10)  // Stay deep underground

        for (let y = minY; y < maxY; y++) {
          const worldX = context.chunkCoord.x * 24 + x
          const worldZ = context.chunkCoord.z * 24 + z

          // 3D density noise
          const density = noise3D(worldX * 0.04, y * 0.04, worldZ * 0.04)

          // Threshold: 0.65 creates ~35% caves (balanced)
          if (density > 0.65) {
            context.setBlock(x, y, z, BlockType.air)
            context.markCave(x, y, z)
          }
        }
      }
    }
  }

  private rebuildSurfaceMap(context: GenerationContext): void {
    // After carving caves, find real surface at each X,Z
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.updateSurfaceAt(x, z)
      }
    }
  }
}
