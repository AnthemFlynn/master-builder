import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'
import { OrganicIslandGenerator } from '../OrganicIslandGenerator'

export class TerrainPass implements GenerationPass {
  readonly name = 'TerrainPass'

  // Organic island generator (replaces hardcoded circular islands)
  private organicGenerator: OrganicIslandGenerator | null = null

  execute(context: GenerationContext): void {
    const { terrain } = context.worldDef

    if (terrain.generator === 'flat') {
      this.generateFlat(context, terrain.baseHeight)
    } else {
      // Initialize organic island generator with world seed
      if (!this.organicGenerator) {
        this.organicGenerator = new OrganicIslandGenerator(context.seed)
        this.organicGenerator.initialize()
      }
      this.generateArchipelago(context)
    }

    this.generateClimateData(context)
    this.fillTerrain(context)
    this.initializeSurfaceMap(context)
  }

  private generateFlat(context: GenerationContext, height: number): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = height
      }
    }
  }

  private generateArchipelago(context: GenerationContext): void {
    if (!this.organicGenerator) {
      throw new Error('OrganicIslandGenerator not initialized')
    }

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // Use organic island generator for height
        const result = this.organicGenerator.getIslandHeight(worldX, worldZ)

        context.heightMap[x][z] = Math.floor(Math.max(1, Math.min(255, result.height)))
      }
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private generateClimateData(context: GenerationContext): void {
    const tempNoise = createNoise2D(() => context.seed + 5000)
    const humidNoise = createNoise2D(() => context.seed + 6000)

    // Get island configurations from organic generator
    const islands = this.organicGenerator?.getAllIslands() ?? []

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z
        const height = context.heightMap[x][z]

        // Find closest island
        let minDist = Infinity
        let islandIdx = -1
        for (let i = 0; i < islands.length; i++) {
          const island = islands[i]
          const dx = worldX - island.centerX
          const dz = worldZ - island.centerZ
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist < minDist) {
            minDist = dist
            islandIdx = i
          }
        }

        // Base climate
        const tVar = tempNoise(worldX * 0.003, worldZ * 0.003) * 0.15
        const hVar = humidNoise(worldX * 0.003, worldZ * 0.003) * 0.15

        let temp = 0.3 + tVar
        let humid = 0.4 + hVar

        // Apply island biome if on island
        if (islandIdx >= 0 && islandIdx < islands.length) {
          const island = islands[islandIdx]
          const influenceRadius = island.baseRadius + 30
          if (minDist < influenceRadius) {
            const influence = Math.max(0, 1 - minDist / influenceRadius)

            temp = this.lerp(temp, island.temperature, influence * 0.8)
            humid = this.lerp(humid, island.humidity, influence * 0.8)

            // Snow on high elevations of cold islands (Taiga - island 1)
            if (island.temperature < 0 && height > 100) {
              temp -= (height - 100) * 0.025
            }
          }
        }

        context.temperature[x][z] = Math.max(-0.5, Math.min(0.9, temp))
        context.humidity[x][z] = Math.max(-0.5, Math.min(0.9, humid))
      }
    }
  }

  private fillTerrain(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])
        context.setBlock(x, 0, z, BlockType.bedrock)
        for (let y = 1; y <= height && y < 256; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }
  }

  private initializeSurfaceMap(context: GenerationContext): void {
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
