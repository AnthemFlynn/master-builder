import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

interface Island {
  x: number
  z: number
  y: number
  radius: number
}

export class IslandPass implements GenerationPass {
  readonly name = 'IslandPass'

  execute(context: GenerationContext): void {
    const islands = this.getIslandCenters(context.chunkCoord, context.seed, {
      spacing: 400,          // Moderate spacing (not too rare)
      noiseOffset: 120,
      minDistanceFromSpawn: 150  // Allow some islands visible from spawn
    })

    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 9973 + context.chunkCoord.z * 7919)

    for (const island of islands) {
      this.generateIsland(context, island, rng)
    }
  }

  private getIslandCenters(coord: ChunkCoordinate, seed: number, config: any): Island[] {
    const islands: Island[] = []

    // Check 3x3 grid around chunk
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        const gridX = Math.floor((coord.x * 24) / config.spacing) + gx
        const gridZ = Math.floor((coord.z * 24) / config.spacing) + gz

        const noise = createNoise2D(() => seed + gridX * 1000 + gridZ)
        const offsetX = noise(gridX, gridZ) * config.noiseOffset
        const offsetZ = noise(gridZ, gridX) * config.noiseOffset

        const islandX = gridX * config.spacing + offsetX
        const islandZ = gridZ * config.spacing + offsetZ

        // Check distance from spawn
        const distFromSpawn = Math.sqrt(islandX * islandX + islandZ * islandZ)
        if (distFromSpawn < config.minDistanceFromSpawn) continue

        const rng = new SeededRandom(seed + gridX * 7919 + gridZ * 6547)

        // Gaussian: mean=35, stdDev=8, range=20-50 (dramatic but not absurd)
        const radius = Math.floor(rng.clampedGaussian(35, 8, 20, 50))
        const height = Math.floor(rng.clampedGaussian(95, 12, 75, 115))
        const thickness = Math.floor(rng.clampedGaussian(15, 3, 10, 20))

        islands.push({ x: islandX, z: islandZ, y: height, radius })
      }
    }

    return islands
  }

  private generateIsland(context: GenerationContext, island: Island, rng: SeededRandom): void {
    const chunkX = context.chunkCoord.x * 24
    const chunkZ = context.chunkCoord.z * 24
    const thickness = Math.floor(rng.clampedGaussian(15, 3, 10, 20))

    // Create flattened dome (ellipsoid - wider than tall)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = chunkX + x
        const worldZ = chunkZ + z

        const dx = worldX - island.x
        const dz = worldZ - island.z
        const horizontalDist = Math.sqrt(dx*dx + dz*dz)

        if (horizontalDist > island.radius) continue

        // Dome shape using cosine curve (smooth dome, not cylinder)
        const heightFactor = Math.cos((horizontalDist / island.radius) * Math.PI / 2)
        const topY = Math.floor(island.y + thickness * heightFactor)
        const bottomY = Math.floor(island.y - thickness * 0.5)  // Thinner bottom

        for (let y = bottomY; y <= topY; y++) {
          if (y < 0 || y >= 256) continue

          // Top 2 layers will become grass (BiomePass handles this)
          // Interior is stone
          context.setBlock(x, y, z, BlockType.stone)

          // Update heightMap for island surfaces (so biomes/trees can use them)
          if (y > context.heightMap[x][z]) {
            context.heightMap[x][z] = y
          }
        }
      }
    }
  }
}
