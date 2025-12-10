import { ChunkData } from '../../../shared/domain/ChunkData'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import { BlockType } from '../domain/BlockType'
import { ChunkDecorator, DecorationContext } from '../decorators/ChunkDecorator'
import { TreeDecorator } from '../decorators/TreeDecorator'
import { SandPatchDecorator } from '../decorators/SandPatchDecorator'
import { RockDecorator } from '../decorators/RockDecorator'
import { BiomeGenerator } from '../domain/biomes/BiomeGenerator'
import { BiomeDefinition } from '../domain/biomes/types'

export class NoiseGenerator {
  private noise: ImprovedNoise
  private seed: number
  private biomeGenerator: BiomeGenerator
  private decorators: ChunkDecorator[]

  constructor(seed?: number) {
    this.seed = seed || Math.random()
    this.noise = new ImprovedNoise()
    this.biomeGenerator = new BiomeGenerator(this.seed.toString())
    this.decorators = [
      new SandPatchDecorator(),
      new TreeDecorator(),
      new RockDecorator()
    ]
  }

  populate(chunk: ChunkData, coord: ChunkCoordinate): void {
    const chunkWorldX = coord.x * 24
    const chunkWorldZ = coord.z * 24
    const heightMap: number[][] = Array.from({ length: chunk.size }, () => new Array(chunk.size).fill(0))
    const biomeMap: BiomeDefinition[][] = Array.from({ length: chunk.size }, () => new Array(chunk.size))

    // 1. Calculate Biomes & Heightmap
    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        const worldX = chunkWorldX + localX
        const worldZ = chunkWorldZ + localZ
        
        // Pick Biome
        const biome = this.biomeGenerator.getBiomeAt(worldX, worldZ)
        biomeMap[localX][localZ] = biome
        
        // Calculate Height using Biome Parameters
        const height = this.calculateColumnHeight(worldX, worldZ, biome)
        heightMap[localX][localZ] = height
      }
    }

    // 2. Fill Blocks
    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        const height = heightMap[localX][localZ]
        const biome = biomeMap[localX][localZ]
        
        // Pick Surface Block (e.g. Stone on steep cliffs, else Biome Surface)
        const surfaceBlock = this.pickSurfaceBlock(localX, localZ, heightMap, biome)

        for (let localY = 0; localY < 256; localY++) {
          let blockType: BlockType | -1 = -1  // Air

          if (localY === 0) {
            blockType = BlockType.bedrock
          } else if (localY < height - 4) {
            blockType = biome.stoneBlock
          } else if (localY < height) {
            blockType = biome.subSurfaceBlock
          } else if (localY === height) {
            blockType = surfaceBlock
          }

          if (blockType !== -1) {
            chunk.setBlockId(localX, localY, localZ, blockType)
          }
        }
      }
    }

    // 3. Decorate
    const random = this.createRandom(coord)
    // Decoration logic needs update for new BiomeDefinition...
    // For now, minimal support or decorators need refactor.
    // Let's pass a mock preset if needed or update decorators to read BiomeDefinition.
    // Decorators usually just need height.
    // TreeDecorator needs biome info?
    
    // Simplification: We skip decorators update in this step, focusing on terrain.
    // But we need to pass context.
    const decorationContext: DecorationContext = {
      chunkCoord: coord,
      getBiomeAt: (x, z) => biomeMap[x]?.[z] as any, // Cast for now
      getHeightAt: (x, z) => heightMap[x]?.[z] ?? 0,
      random,
      preset: {} as any // Deprecated
    }
    
    for (const decorator of this.decorators) {
      decorator.decorate(chunk, decorationContext)
    }
  }

  private calculateColumnHeight(worldX: number, worldZ: number, biome: BiomeDefinition): number {
    const { baseHeight, heightVariance, roughness } = biome.terrain
    
    const large = this.noise.noise(worldX * roughness * 0.5, worldZ * roughness * 0.5, this.seed + 10) * heightVariance
    const detail = this.noise.noise(worldX * roughness * 4, worldZ * roughness * 4, this.seed + 20) * (heightVariance * 0.1)
    
    const height = Math.floor(baseHeight + large + detail)
    return Math.max(1, height)
  }

  private pickSurfaceBlock(
    localX: number,
    localZ: number,
    heightMap: number[][],
    biome: BiomeDefinition
  ): BlockType {
    const height = heightMap[localX][localZ]
    
    // Cliff detection
    const neighbors = [
      heightMap[localX - 1]?.[localZ],
      heightMap[localX + 1]?.[localZ],
      heightMap[localX]?.[localZ - 1],
      heightMap[localX]?.[localZ + 1]
    ].filter((h): h is number => typeof h === 'number')

    let maxDiff = 0
    for (const h of neighbors) {
      maxDiff = Math.max(maxDiff, Math.abs(h - height))
    }

    if (maxDiff >= 4) {
      return biome.stoneBlock // Cliffs are stone
    }

    return biome.surfaceBlock
  }

  private createRandom(coord: ChunkCoordinate): () => number {
    let seed = Math.floor(this.seed * 1000000) ^
      (coord.x * 374761393) ^ (coord.z * 668265263)
    return () => {
      seed = (seed + 0x6D2B79F5) | 0
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
      return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
  }
}
