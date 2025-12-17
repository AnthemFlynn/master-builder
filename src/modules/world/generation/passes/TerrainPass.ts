import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'

export class TerrainPass implements GenerationPass {
  readonly name = 'TerrainPass'

  // Minecraft-style constants
  private readonly SEA_LEVEL = 63
  private readonly OCEAN_FLOOR_BASE = 35
  private readonly LAND_BASE = 64
  private readonly MOUNTAIN_PEAK = 128

  execute(context: GenerationContext): void {
    const { terrain } = context.worldDef

    if (terrain.generator === 'flat') {
      this.generateFlat(context, terrain.baseHeight)
    } else {
      this.generateMinecraftStyleTerrain(context)
    }

    // Populate climate data
    this.generateClimateData(context)

    // Fill terrain with blocks
    this.fillTerrain(context)

    // Initialize surface map
    this.initializeSurfaceMap(context)
  }

  private generateFlat(context: GenerationContext, height: number): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = height
      }
    }
  }

  private generateMinecraftStyleTerrain(context: GenerationContext): void {
    // MINECRAFT-STYLE TERRAIN GENERATION
    // Key insight: Continentalness determines LAND vs OCEAN first, then we add features

    // Noise layers (different scales for different features)
    const continentalnessNoise = createNoise2D(() => context.seed + 1000)  // Land vs ocean
    const erosionNoise = createNoise2D(() => context.seed + 2000)          // Flat vs mountainous
    const peaksNoise = createNoise2D(() => context.seed + 3000)            // Mountain peaks
    const ridgeNoise = createNoise2D(() => context.seed + 4000)            // Ridge lines
    const detailNoise = createNoise2D(() => context.seed + 5000)           // Small details
    const riverNoise = createNoise2D(() => context.seed + 6000)            // River carving

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // STEP 1: Continentalness (-1 = deep ocean, 0 = coast, 1 = inland)
        // Very large scale - creates continents and oceans
        const continentalness = continentalnessNoise(worldX * 0.0005, worldZ * 0.0005)

        // STEP 2: Erosion (0 = flat, 1 = mountainous)
        // Medium scale - determines terrain roughness
        const erosion = (erosionNoise(worldX * 0.002, worldZ * 0.002) + 1) / 2

        // STEP 3: Peaks and valleys (for mountain areas)
        const peaks = peaksNoise(worldX * 0.008, worldZ * 0.008)
        const ridges = Math.abs(ridgeNoise(worldX * 0.015, worldZ * 0.015))

        // STEP 4: Detail noise (small bumps and variations)
        const detail = detailNoise(worldX * 0.05, worldZ * 0.05) * 3

        // STEP 5: River carving potential
        const riverCarve = Math.abs(riverNoise(worldX * 0.01, worldZ * 0.01))

        // Calculate final height based on terrain type
        let height: number

        if (continentalness < -0.3) {
          // DEEP OCEAN: Floor at 25-45
          const oceanDepth = this.OCEAN_FLOOR_BASE + (continentalness + 1) * 15
          const oceanDetail = detailNoise(worldX * 0.03, worldZ * 0.03) * 8
          height = oceanDepth + oceanDetail
        }
        else if (continentalness < 0.0) {
          // SHALLOW OCEAN / COAST: Transition zone 45-63
          const t = (continentalness + 0.3) / 0.3  // 0 to 1
          const shallowFloor = this.OCEAN_FLOOR_BASE + 10
          height = shallowFloor + t * (this.SEA_LEVEL - shallowFloor)
          height += detail
        }
        else if (continentalness < 0.3) {
          // COASTAL LAND / BEACHES: Just above sea level 63-70
          const t = continentalness / 0.3  // 0 to 1
          height = this.SEA_LEVEL + t * 7
          height += detail

          // River valleys near coast
          if (riverCarve < 0.1 && height > this.SEA_LEVEL) {
            height = this.SEA_LEVEL - 1 + riverCarve * 20
          }
        }
        else if (continentalness < 0.6) {
          // INLAND: Plains, hills, forests 64-85
          const baseInland = this.LAND_BASE
          const hillFactor = erosion * 20
          const hillNoise = peaks * hillFactor
          height = baseInland + hillNoise + detail

          // River valleys through plains
          if (riverCarve < 0.08) {
            const valleyDepth = (0.08 - riverCarve) * 150
            height = Math.max(this.SEA_LEVEL - 2, height - valleyDepth)
          }
        }
        else {
          // MOUNTAINS: High peaks 70-128+
          const baseMount = this.LAND_BASE + 10
          const mountainHeight = erosion * 50
          const peakBonus = Math.max(0, peaks) * 30
          const ridgeBonus = ridges * 20
          height = baseMount + mountainHeight + peakBonus + ridgeBonus + detail

          // Limit maximum height
          height = Math.min(height, this.MOUNTAIN_PEAK)
        }

        // Clamp to valid range
        height = Math.max(1, Math.min(255, height))

        context.heightMap[x][z] = Math.floor(height)
      }
    }
  }

  private generateClimateData(context: GenerationContext): void {
    // Initialize climate noise samplers
    const temperatureNoise = createNoise2D(() => context.seed + 4000)
    const humidityNoise = createNoise2D(() => context.seed + 5000)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // Sample climate (returns -1 to 1)
        context.temperature[x][z] = temperatureNoise(worldX * 0.003, worldZ * 0.003)
        context.humidity[x][z] = humidityNoise(worldX * 0.004, worldZ * 0.004)
      }
    }
  }

  private fillTerrain(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])

        // Bedrock at Y=0
        context.setBlock(x, 0, z, BlockType.bedrock)

        // Fill from Y=1 to height with stone
        for (let y = 1; y <= height && y < 256; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }
  }

  private initializeSurfaceMap(context: GenerationContext): void {
    // Initialize surface map for all columns (will be updated by CavePass later)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])

        context.surfaceMap.set(`${x},${z}`, {
          y: height,
          blockType: BlockType.stone,
          isCave: false
        })
      }
    }
  }
}
