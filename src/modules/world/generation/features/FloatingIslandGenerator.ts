import { FeatureGenerator } from './FeatureGenerator'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { FloatingIslandFeature } from '../../domain/WorldDefinition'
import { resolveBlockType } from '../../domain/MaterialRegistry'
import { createNoise2D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

interface Island {
  x: number
  z: number
  y: number
  radius: number
}

export class FloatingIslandGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: FloatingIslandFeature): boolean {
    const islands = this.getIslandCenters(coord, seed, config)

    for (const island of islands) {
      const chunkMinX = coord.x * 24
      const chunkMaxX = coord.x * 24 + 24
      const chunkMinZ = coord.z * 24
      const chunkMaxZ = coord.z * 24 + 24

      const islandMinX = island.x - island.radius
      const islandMaxX = island.x + island.radius
      const islandMinZ = island.z - island.radius
      const islandMaxZ = island.z + island.radius

      // Check if island bounds intersect chunk bounds
      if (islandMinX < chunkMaxX && islandMaxX > chunkMinX &&
          islandMinZ < chunkMaxZ && islandMaxZ > chunkMinZ) {
        return true
      }
    }

    return false
  }

  generate(context: GenerationContext, config: FloatingIslandFeature): void {
    const islands = this.getIslandCenters(context.chunkCoord, context.seed, config)

    for (const island of islands) {
      this.carveSphere(context, island, config)
    }
  }

  private getIslandCenters(coord: ChunkCoordinate, seed: number, config: FloatingIslandFeature): Island[] {
    const islands: Island[] = []
    const spacing = config.spacing

    // Check 3x3 grid around chunk
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        const gridX = Math.floor((coord.x * 24) / spacing) + gx
        const gridZ = Math.floor((coord.z * 24) / spacing) + gz

        // Deterministic noise offset
        const noise = createNoise2D(() => seed + gridX * 1000 + gridZ)
        const offsetX = noise(gridX, gridZ) * (config.noiseOffset ?? 100)
        const offsetZ = noise(gridZ, gridX) * (config.noiseOffset ?? 100)

        const islandX = gridX * spacing + offsetX
        const islandZ = gridZ * spacing + offsetZ

        // Random radius and height (deterministic)
        const rng = new SeededRandom(seed + gridX * 7919 + gridZ * 6547)
        const radius = rng.range(config.radiusRange[0], config.radiusRange[1])
        const height = rng.range(config.heightRange[0], config.heightRange[1])

        islands.push({ x: islandX, z: islandZ, y: height, radius })
      }
    }

    return islands
  }

  private carveSphere(context: GenerationContext, island: Island, config: FloatingIslandFeature): void {
    const chunkX = context.chunkCoord.x * 24
    const chunkZ = context.chunkCoord.z * 24
    const material = resolveBlockType(config.material)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = chunkX + x
        const worldZ = chunkZ + z

        for (let y = 0; y < 256; y++) {
          const dx = worldX - island.x
          const dy = y - island.y
          const dz = worldZ - island.z
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)

          // Inside sphere and within thickness of top
          if (distance <= island.radius && dy >= -(config.thickness ?? 15)) {
            if (dy > 0 && distance >= island.radius - 1) {
              // Top surface layer
              context.setBlock(x, y, z, material)
            } else {
              // Interior
              context.setBlock(x, y, z, resolveBlockType('stone'))
            }
          }
        }
      }
    }
  }
}
