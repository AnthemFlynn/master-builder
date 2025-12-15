import { FeatureGenerator } from './FeatureGenerator'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { GiantTreeFeature } from '../../domain/WorldDefinition'
import { resolveBlockType } from '../../domain/MaterialRegistry'
import { SeededRandom } from '../utils/SeededRandom'

export class GiantTreeGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: GiantTreeFeature): boolean {
    // Trees can appear in any chunk (density-based)
    return true
  }

  generate(context: GenerationContext, config: GiantTreeFeature): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 73 + context.chunkCoord.z * 151)

    const trunkMaterial = resolveBlockType(config.material.trunk)
    const leavesMaterial = resolveBlockType(config.material.leaves)

    // Try to place tree at each column
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        if (rng.next() < config.density) {
          const surfaceY = this.findSurface(context, x, z)
          if (surfaceY > 0) {
            this.generateTree(context, x, surfaceY + 1, z, config, rng, trunkMaterial, leavesMaterial)
          }
        }
      }
    }
  }

  private generateTree(
    context: GenerationContext,
    baseX: number,
    baseY: number,
    baseZ: number,
    config: GiantTreeFeature,
    rng: SeededRandom,
    trunkMaterial: number,
    leavesMaterial: number
  ): void {
    const trunkRadius = rng.range(config.trunkRadiusRange[0], config.trunkRadiusRange[1])
    const height = rng.range(config.heightRange[0], config.heightRange[1])

    // Generate trunk (cylinder)
    for (let y = baseY; y < baseY + height && y < 256; y++) {
      for (let dx = -trunkRadius; dx <= trunkRadius; dx++) {
        for (let dz = -trunkRadius; dz <= trunkRadius; dz++) {
          const x = baseX + dx
          const z = baseZ + dz

          const dist = Math.sqrt(dx*dx + dz*dz)
          if (dist <= trunkRadius) {
            context.setBlock(x, y, z, trunkMaterial)
          }
        }
      }
    }

    // Generate canopy (sphere of leaves)
    const canopyY = baseY + height
    const canopyRadius = config.canopyRadius

    for (let dx = -canopyRadius; dx <= canopyRadius; dx++) {
      for (let dy = -canopyRadius; dy <= canopyRadius; dy++) {
        for (let dz = -canopyRadius; dz <= canopyRadius; dz++) {
          const x = baseX + dx
          const y = canopyY + dy
          const z = baseZ + dz

          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
          if (dist <= canopyRadius) {
            // Don't overwrite trunk
            if (context.getBlock(x, y, z) !== trunkMaterial) {
              context.setBlock(x, y, z, leavesMaterial)
            }
          }
        }
      }
    }
  }

  private findSurface(context: GenerationContext, x: number, z: number): number {
    for (let y = 255; y >= 0; y--) {
      if (context.getBlock(x, y, z) !== 0) {
        return y
      }
    }
    return -1
  }
}
