// src/modules/world/adapters/NoiseGenerator.ts
import { VoxelChunk } from '../domain/VoxelChunk'
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import { BlockType } from '../domain/BlockType'
import { ChunkDecorator, DecorationContext } from '../decorators/ChunkDecorator'
import { TreeDecorator } from '../decorators/TreeDecorator'
import { SandPatchDecorator } from '../decorators/SandPatchDecorator'
import { RockDecorator } from '../decorators/RockDecorator'
import { BiomeDefinition, WorldPreset, getWorldPreset } from '../domain/WorldPreset'
import { DEFAULT_WORLD_PRESET_ID } from '../domain/WorldConfig'

export class NoiseGenerator {
  private noise: ImprovedNoise
  private seed: number
  private preset: WorldPreset
  private decorators: ChunkDecorator[]

  constructor(presetId: string = DEFAULT_WORLD_PRESET_ID, seed?: number) {
    this.seed = seed || Math.random()
    this.noise = new ImprovedNoise()
    this.preset = getWorldPreset(presetId)
    this.decorators = [
      new SandPatchDecorator(),
      new TreeDecorator(),
      new RockDecorator()
    ]
  }

  populate(chunk: VoxelChunk, coord: ChunkCoordinate): void {
    const chunkWorldX = coord.x * 24
    const chunkWorldZ = coord.z * 24
    const heightMap: number[][] = Array.from({ length: chunk.size }, () => new Array(chunk.size).fill(0))
    const biomeMap: BiomeDefinition[][] = Array.from({ length: chunk.size }, () => new Array(chunk.size))
    const surfaceBlockMap: BlockType[][] = Array.from({ length: chunk.size }, () => new Array(chunk.size))

    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        const worldX = chunkWorldX + localX
        const worldZ = chunkWorldZ + localZ
        const biome = this.pickBiome(worldX, worldZ)
        biomeMap[localX][localZ] = biome
        const height = this.calculateColumnHeight(worldX, worldZ, biome)
        heightMap[localX][localZ] = height
      }
    }

    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        surfaceBlockMap[localX][localZ] = this.pickSurfaceBlock(localX, localZ, heightMap, biomeMap[localX][localZ])
        const height = heightMap[localX][localZ]
        const biome = biomeMap[localX][localZ]

        for (let localY = 0; localY < 256; localY++) {
          let blockType: BlockType | -1 = -1  // Air

          if (localY === 0) {
            blockType = BlockType.bedrock
          } else if (localY < height - 4) {
            blockType = biome.fillerBlock
          } else if (localY < height - 1) {
            blockType = biome.subsurfaceBlock
          } else if (localY === height) {
            blockType = surfaceBlockMap[localX][localZ]
          }

          if (blockType !== -1) {
            chunk.setBlockType(localX, localY, localZ, blockType)
          }
        }
      }
    }

    const random = this.createRandom(coord)
    const decorationContext: DecorationContext = {
      preset: this.preset,
      chunkCoord: coord,
      getBiomeAt: (x, z) => biomeMap[x]?.[z] ?? this.preset.biomes[0],
      getHeightAt: (x, z) => heightMap[x]?.[z] ?? this.preset.baseHeight,
      random
    }
    for (const decorator of this.decorators) {
      decorator.decorate(chunk, decorationContext)
    }
  }

  private pickBiome(worldX: number, worldZ: number): BiomeDefinition {
    if (this.preset.biomes.length === 1) {
      return this.preset.biomes[0]
    }
    const n = this.noise.noise(
      worldX / this.preset.biomeNoiseScale,
      worldZ / this.preset.biomeNoiseScale,
      this.seed + this.preset.seedOffset
    )
    const normalized = (n + 1) / 2
    const index = Math.min(this.preset.biomes.length - 1, Math.max(0, Math.floor(normalized * this.preset.biomes.length)))
    return this.preset.biomes[index]
  }

  private calculateColumnHeight(worldX: number, worldZ: number, biome: BiomeDefinition): number {
    const large = this.noise.noise(worldX / 80, worldZ / 80, this.seed + 10) * this.preset.heightVariation
    const detail = this.noise.noise(worldX / 16, worldZ / 16, this.seed + 20) * this.preset.detailVariation
    const biomeNoise = this.noise.noise(worldX / 50, worldZ / 50, this.seed + 30)
    const biomeOffset = biome.minHeightOffset + ((biomeNoise + 1) / 2) * (biome.maxHeightOffset - biome.minHeightOffset)
    const height = Math.floor(this.preset.baseHeight + large + detail + biomeOffset)
    return Math.max(4, height)
  }

  private pickSurfaceBlock(
    localX: number,
    localZ: number,
    heightMap: number[][],
    biome: BiomeDefinition
  ): BlockType {
    const height = heightMap[localX][localZ]
    const waterLevel = this.preset.waterLevel
    if (height <= waterLevel + 1) {
      return BlockType.sand
    }

    const neighbors = [
      heightMap[localX - 1]?.[localZ],
      heightMap[localX + 1]?.[localZ],
      heightMap[localX]?.[localZ - 1],
      heightMap[localX]?.[localZ + 1]
    ].filter((h): h is number => typeof h === 'number')

    let gradient = 0
    for (const h of neighbors) {
      gradient = Math.max(gradient, Math.abs(h - height))
    }

    if (gradient >= 4 || height >= this.preset.baseHeight + this.preset.heightVariation - 2) {
      return BlockType.stone
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
