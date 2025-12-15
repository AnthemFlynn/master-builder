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

    // Initialize multi-scale noise samplers
    const continentalNoise = createNoise2D(() => context.seed + 1000)
    const terrainNoise = createNoise2D(() => context.seed + 2000)
    const detailNoise = createNoise2D(() => context.seed + 3000)

    const baseHeight = terrain.baseHeight

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // Multi-scale noise combination
        const continental = continentalNoise(worldX * 0.001, worldZ * 0.001) * 40
        const terrain = terrainNoise(worldX * 0.01, worldZ * 0.01) * 15
        const detail = detailNoise(worldX * 0.05, worldZ * 0.05) * 3

        const height = Math.floor(baseHeight + continental + terrain + detail)
        context.heightMap[x][z] = height
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
