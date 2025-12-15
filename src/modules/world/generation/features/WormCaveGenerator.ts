import { FeatureGenerator } from './FeatureGenerator'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { CaveSystemFeature } from '../../domain/WorldDefinition'
import { BlockType } from '../../domain/BlockType'
import { SeededRandom } from '../utils/SeededRandom'
import { createNoise3D } from 'simplex-noise'

interface WormPath {
  x: number
  y: number
  z: number
  radius: number
}

export class WormCaveGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: CaveSystemFeature): boolean {
    // Always return true for caves (they can appear anywhere)
    // Actual generation is density-based
    return true
  }

  generate(context: GenerationContext, config: CaveSystemFeature): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 31 + context.chunkCoord.z * 17)

    // Determine number of worm starts in this chunk
    const wormCount = Math.floor(config.density * 10)

    for (let i = 0; i < wormCount; i++) {
      if (rng.next() < config.density) {
        this.generateWormPath(context, config, rng)
      }
    }
  }

  private generateWormPath(context: GenerationContext, config: CaveSystemFeature, rng: SeededRandom): void {
    const chunkX = context.chunkCoord.x * 24
    const chunkZ = context.chunkCoord.z * 24

    // Random start position within chunk
    const startX = rng.range(0, 24)
    const startZ = rng.range(0, 24)
    const startY = rng.range(config.depthRange[0], config.depthRange[1])

    // Worm parameters
    const pathLength = rng.int(20, 50)
    const radius = rng.range(config.radiusRange[0], config.radiusRange[1])

    let x = startX
    let y = startY
    let z = startZ
    let dirX = rng.range(-1, 1)
    let dirY = rng.range(-0.5, 0.5)
    let dirZ = rng.range(-1, 1)

    const noise3D = createNoise3D(() => context.seed + startX + startY + startZ)

    for (let step = 0; step < pathLength; step++) {
      // Carve sphere at current position
      this.carveSphere(context, x, y, z, radius)

      // Update direction with winding
      const noiseVal = noise3D(x * 0.1, y * 0.1, z * 0.1)
      dirX += noiseVal * config.windingFactor
      dirY += noise3D(y * 0.1, z * 0.1, x * 0.1) * config.windingFactor * 0.5
      dirZ += noise3D(z * 0.1, x * 0.1, y * 0.1) * config.windingFactor

      // Normalize
      const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ)
      dirX /= len
      dirY /= len
      dirZ /= len

      // Move worm
      x += dirX
      y += dirY
      z += dirZ

      // Clamp to valid range
      y = Math.max(config.depthRange[0], Math.min(config.depthRange[1], y))

      // Stop if worm leaves chunk by too much
      if (x < -radius || x >= 24 + radius || z < -radius || z >= 24 + radius) {
        break
      }
    }
  }

  private carveSphere(context: GenerationContext, cx: number, cy: number, cz: number, radius: number): void {
    const minX = Math.max(0, Math.floor(cx - radius))
    const maxX = Math.min(23, Math.ceil(cx + radius))
    const minY = Math.max(0, Math.floor(cy - radius))
    const maxY = Math.min(255, Math.ceil(cy + radius))
    const minZ = Math.max(0, Math.floor(cz - radius))
    const maxZ = Math.min(23, Math.ceil(cz + radius))

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const dx = x - cx
          const dy = y - cy
          const dz = z - cz
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)

          if (distance <= radius) {
            context.setBlock(x, y, z, BlockType.air)
          }
        }
      }
    }
  }
}
