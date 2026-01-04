import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D, NoiseFunction2D } from 'simplex-noise'
import { OrganicIslandGenerator } from '../OrganicIslandGenerator'
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_HEIGHT } from '../../../../shared/constants/ChunkConstants'

export class TerrainPass implements GenerationPass {
  readonly name = 'TerrainPass'

  // Organic island generator (replaces hardcoded circular islands)
  private organicGenerator: OrganicIslandGenerator | null = null
  private cachedSeed: number | null = null

  // Cached noise functions for climate (created once, reused for all chunks)
  private tempNoise: NoiseFunction2D | null = null
  private humidNoise: NoiseFunction2D | null = null

  /**
   * Pre-initialize the island generator with a given seed
   * Call this ONCE per worker to avoid expensive lazy initialization
   */
  warmup(seed: number): void {
    if (this.organicGenerator) return  // Already initialized

    this.cachedSeed = seed
    this.organicGenerator = new OrganicIslandGenerator(seed)
    this.organicGenerator.initialize()

    // Also pre-initialize climate noise functions
    this.tempNoise = createNoise2D(() => seed + 5000)
    this.humidNoise = createNoise2D(() => seed + 6000)
  }

  execute(context: GenerationContext): void {
    const { terrain } = context.worldDef

    if (terrain.generator === 'flat') {
      this.generateFlat(context, terrain.baseHeight)
    } else {
      // Initialize organic island generator if not pre-warmed
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
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        context.heightMap[x][z] = height
      }
    }
  }

  private generateArchipelago(context: GenerationContext): void {
    if (!this.organicGenerator) {
      throw new Error('OrganicIslandGenerator not initialized')
    }

    // Store island configs in context for InterIslandCavePass
    const islands = this.organicGenerator.getAllIslands()
    context.setIslandConfigs(islands)

    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        const worldX = context.chunkCoord.x * CHUNK_WIDTH + x
        const worldZ = context.chunkCoord.z * CHUNK_DEPTH + z

        // Use organic island generator for height
        const result = this.organicGenerator.getIslandHeight(worldX, worldZ)

        context.heightMap[x][z] = Math.floor(Math.max(1, Math.min(CHUNK_HEIGHT - 1, result.height)))
      }
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private generateClimateData(context: GenerationContext): void {
    // Use cached noise functions (or create if not warmed up)
    if (!this.tempNoise || this.cachedSeed !== context.seed) {
      this.tempNoise = createNoise2D(() => context.seed + 5000)
      this.humidNoise = createNoise2D(() => context.seed + 6000)
      this.cachedSeed = context.seed
    }
    const tempNoise = this.tempNoise
    const humidNoise = this.humidNoise!

    // Get island configurations from organic generator
    const islands = this.organicGenerator?.getAllIslands() ?? []

    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        const worldX = context.chunkCoord.x * CHUNK_WIDTH + x
        const worldZ = context.chunkCoord.z * CHUNK_DEPTH + z
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
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        const height = Math.floor(context.heightMap[x][z])
        context.setBlock(x, 0, z, BlockType.bedrock)
        for (let y = 1; y <= height && y < CHUNK_HEIGHT; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }
  }

  private initializeSurfaceMap(context: GenerationContext): void {
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
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
