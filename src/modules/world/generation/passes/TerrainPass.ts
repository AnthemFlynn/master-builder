import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'

export class TerrainPass implements GenerationPass {
  readonly name = 'TerrainPass'

  execute(context: GenerationContext): void {
    const { terrain } = context.worldDef

    if (terrain.generator === 'flat') {
      this.generateFlat(context, terrain.baseHeight)
    } else {
      this.generateMultiScaleNoise(context, terrain)
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

  private generateMultiScaleNoise(context: GenerationContext, terrain: any): void {
    if (!terrain.noise) {
      throw new Error('Noise generator requires noise configuration')
    }

    // ARCHIPELAGO TERRAIN: "Islands are mountains up to their necks in ocean"
    // Sea level = 62. We need:
    // - Peaks reaching 75-100+ (island mountains)
    // - Valleys going down to 15-40 (ocean floor canyons)

    const continentalNoise = createNoise2D(() => context.seed + 1000)
    const ridgeNoise = createNoise2D(() => context.seed + 1500)      // Island ridges
    const terrainNoise = createNoise2D(() => context.seed + 2000)
    const detailNoise = createNoise2D(() => context.seed + 3000)
    const underwaterNoise = createNoise2D(() => context.seed + 3500) // Ocean floor detail

    const seaLevel = 62
    const baseHeight = terrain.baseHeight  // Usually 64

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // Continental: large landmasses vs ocean basins (±50)
        const continental = continentalNoise(worldX * 0.0008, worldZ * 0.0008) * 50

        // Ridge noise: creates island chains/mountain ridges (±25)
        const ridge = Math.abs(ridgeNoise(worldX * 0.004, worldZ * 0.004)) * 25

        // Terrain variation (±18)
        const terrainVar = terrainNoise(worldX * 0.012, worldZ * 0.012) * 18

        // Detail (±4)
        const detail = detailNoise(worldX * 0.05, worldZ * 0.05) * 4

        let height = baseHeight + continental + ridge + terrainVar + detail

        // UNDERWATER CANYON DRAMA: If below sea level, add extra depth variation
        if (height < seaLevel) {
          // How far below sea level?
          const depthFactor = (seaLevel - height) / 40  // 0 to 1
          // Add canyon depth (deeper areas get more dramatic variation)
          const canyonDepth = underwaterNoise(worldX * 0.02, worldZ * 0.02) * 20 * depthFactor
          height -= Math.abs(canyonDepth)  // Canyons go deeper
        }

        // Clamp to valid range
        height = Math.max(5, Math.min(200, height))

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
