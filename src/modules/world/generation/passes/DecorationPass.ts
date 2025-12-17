import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

/**
 * DecorationPass - Places vegetation decorations (grass, flowers, mushrooms)
 * Based on biome settings for density and type
 */
export class DecorationPass implements GenerationPass {
  readonly name = 'DecorationPass'

  // Flower types available for placement
  private readonly FLOWERS = [
    BlockType.dandelion,
    BlockType.poppy,
    BlockType.blue_orchid,
    BlockType.allium,
    BlockType.azure_bluet,
    BlockType.red_tulip,
    BlockType.orange_tulip,
    BlockType.white_tulip,
    BlockType.pink_tulip,
    BlockType.oxeye_daisy,
    BlockType.cornflower,
    BlockType.lily_of_valley
  ]

  execute(context: GenerationContext): void {
    const rng = new SeededRandom(
      context.seed + context.chunkCoord.x * 73 + context.chunkCoord.z * 151 + 9000
    )
    const decorationNoise = createNoise2D(() => context.seed + 8000)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const surface = context.surfaceMap.get(`${x},${z}`)
        if (!surface) continue

        // Skip cave surfaces, water surfaces, and non-grass/dirt surfaces
        if (surface.isCave) continue
        if (surface.blockType === BlockType.water) continue
        if (surface.blockType === BlockType.sand) continue
        if (surface.blockType === BlockType.stone) continue
        if (surface.blockType === BlockType.snow) continue
        if (surface.blockType === BlockType.gravel) continue

        const biome = context.getBiomeAt(x, z)
        if (!biome) continue

        const surfaceY = surface.y
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // Use noise for natural clustering
        const clusterNoise = (decorationNoise(worldX * 0.1, worldZ * 0.1) + 1) / 2

        // Place tall grass based on biome grassDensity
        if (biome.grassDensity && biome.grassDensity > 0) {
          const grassChance = biome.grassDensity * clusterNoise
          if (rng.next() < grassChance) {
            // Check if space is empty above surface
            if (context.getBlock(x, surfaceY + 1, z) === BlockType.air) {
              // Random choice between tall grass and fern (ferns in humid areas)
              const humidity = context.humidity[x][z]
              const isFern = humidity > 0.3 && rng.next() < 0.3
              context.setBlock(x, surfaceY + 1, z, isFern ? BlockType.fern : BlockType.tall_grass)
            }
          }
        }

        // Place flowers based on biome flowerDensity
        if (biome.flowerDensity && biome.flowerDensity > 0) {
          const flowerChance = biome.flowerDensity * clusterNoise
          if (rng.next() < flowerChance) {
            // Check if space is empty above surface
            if (context.getBlock(x, surfaceY + 1, z) === BlockType.air) {
              // Pick a random flower
              const flowerIndex = Math.floor(rng.next() * this.FLOWERS.length)
              context.setBlock(x, surfaceY + 1, z, this.FLOWERS[flowerIndex])
            }
          }
        }

        // Place mushrooms in dark/humid areas (low light, high humidity)
        if (surface.blockType === BlockType.grass || surface.blockType === BlockType.mycelium) {
          const humidity = context.humidity[x][z]
          const temp = context.temperature[x][z]

          // Mushrooms prefer shade and humidity
          const mushroomChance = humidity > 0.4 ? 0.02 : (humidity > 0.2 ? 0.005 : 0)

          if (rng.next() < mushroomChance) {
            if (context.getBlock(x, surfaceY + 1, z) === BlockType.air) {
              // Red mushrooms are rarer
              const isRed = rng.next() < 0.3
              context.setBlock(
                x, surfaceY + 1, z,
                isRed ? BlockType.red_mushroom : BlockType.brown_mushroom
              )
            }
          }
        }

        // Place dead bushes in deserts
        if (surface.blockType === BlockType.sand || surface.blockType === BlockType.terracotta) {
          if (rng.next() < 0.01) {  // 1% chance
            if (context.getBlock(x, surfaceY + 1, z) === BlockType.air) {
              context.setBlock(x, surfaceY + 1, z, BlockType.dead_bush)
            }
          }
        }

        // Place cacti in deserts (very sparse, need spacing)
        if (surface.blockType === BlockType.sand) {
          if (rng.next() < 0.002) {  // 0.2% chance
            if (this.canPlaceCactus(context, x, surfaceY + 1, z)) {
              // Place cactus 1-3 blocks tall
              const height = Math.floor(rng.next() * 3) + 1
              for (let h = 0; h < height; h++) {
                context.setBlock(x, surfaceY + 1 + h, z, BlockType.cactus)
              }
            }
          }
        }

        // Place sugar cane near water
        if (surface.blockType === BlockType.grass || surface.blockType === BlockType.sand) {
          if (this.isNearWater(context, x, surfaceY, z)) {
            if (rng.next() < 0.05) {  // 5% chance near water
              if (context.getBlock(x, surfaceY + 1, z) === BlockType.air) {
                // Sugar cane 1-3 blocks tall
                const height = Math.floor(rng.next() * 3) + 1
                for (let h = 0; h < height; h++) {
                  if (context.getBlock(x, surfaceY + 1 + h, z) === BlockType.air) {
                    context.setBlock(x, surfaceY + 1 + h, z, BlockType.sugar_cane)
                  }
                }
              }
            }
          }
        }
      }
    }

    // Place seagrass and kelp underwater
    this.placeUnderwaterVegetation(context, rng)
  }

  private canPlaceCactus(context: GenerationContext, x: number, y: number, z: number): boolean {
    // Check air above
    if (context.getBlock(x, y, z) !== BlockType.air) return false

    // Check no adjacent blocks (cacti can't touch other blocks)
    const adjacentOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    for (const [dx, dz] of adjacentOffsets) {
      const ax = x + dx
      const az = z + dz
      if (ax >= 0 && ax < 24 && az >= 0 && az < 24) {
        const block = context.getBlock(ax, y, az)
        if (block !== BlockType.air && block !== BlockType.cactus) {
          return false
        }
      }
    }

    return true
  }

  private isNearWater(context: GenerationContext, x: number, y: number, z: number): boolean {
    // Check 4 cardinal directions for water
    const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    for (const [dx, dz] of offsets) {
      const nx = x + dx
      const nz = z + dz
      if (nx >= 0 && nx < 24 && nz >= 0 && nz < 24) {
        // Check at surface level and one below
        if (context.getBlock(nx, y, nz) === BlockType.water) return true
        if (context.getBlock(nx, y - 1, nz) === BlockType.water) return true
      }
    }
    return false
  }

  private placeUnderwaterVegetation(context: GenerationContext, rng: SeededRandom): void {
    const SEA_LEVEL = 63

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const surface = context.surfaceMap.get(`${x},${z}`)
        if (!surface) continue

        // Only underwater surfaces
        if (surface.y >= SEA_LEVEL - 1) continue

        const terrainHeight = context.heightMap[x][z]
        if (terrainHeight >= SEA_LEVEL) continue

        // Place seagrass on sand/gravel underwater
        const bottomBlock = context.getBlock(x, Math.floor(terrainHeight), z)
        if (bottomBlock === BlockType.sand || bottomBlock === BlockType.gravel) {
          if (rng.next() < 0.1) {  // 10% chance
            const seagrassY = Math.floor(terrainHeight) + 1
            if (context.getBlock(x, seagrassY, z) === BlockType.water) {
              context.setBlock(x, seagrassY, z, BlockType.seagrass)
            }
          }
        }

        // Place kelp in deeper water
        if (terrainHeight < SEA_LEVEL - 10) {
          if (rng.next() < 0.03) {  // 3% chance
            const kelpBaseY = Math.floor(terrainHeight) + 1
            if (context.getBlock(x, kelpBaseY, z) === BlockType.water) {
              // Kelp grows up to water surface
              const maxHeight = Math.min(15, SEA_LEVEL - kelpBaseY - 1)
              const height = Math.floor(rng.next() * maxHeight) + 1
              for (let h = 0; h < height; h++) {
                const ky = kelpBaseY + h
                if (context.getBlock(x, ky, z) === BlockType.water) {
                  context.setBlock(x, ky, z, BlockType.kelp)
                }
              }
            }
          }
        }
      }
    }
  }
}
