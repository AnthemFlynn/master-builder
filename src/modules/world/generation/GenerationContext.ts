import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorldDefinition } from '../domain/WorldDefinition'
import { BlockType } from '../domain/BlockType'
import { SurfaceBiome, UndergroundBiome } from './biomes/BiomeTypes'
import type { IslandConfig } from './OrganicIslandGenerator'

interface SurfaceInfo {
  y: number
  blockType: number
  isCave: boolean
}

/**
 * GenerationContext - State container for chunk generation pipeline
 *
 * ARCHITECTURE NOTE: Follows ChunkData pattern with Uint8Array for reliable bundling
 * Nested JavaScript arrays are fragile during minification/bundling
 */
export class GenerationContext {
  public seed: number
  public heightMap: number[][]
  public temperature: number[][]
  public humidity: number[][]
  public surfaceMap: Map<string, SurfaceInfo> = new Map()
  public caveBlocks: Set<string> = new Set()
  public placedFeatures: Set<string> = new Set()
  public biomeMap: Map<string, SurfaceBiome> = new Map()             // NEW
  public undergroundBiomeMap: Map<string, UndergroundBiome> = new Map()  // NEW
  public minY: number = 256
  public maxY: number = 0

  // Island configs for inter-island cave system
  private islandConfigs: IslandConfig[] = []

  private readonly size: number = 24
  private readonly height: number = 256
  private data: Uint8Array
  private _cachedBlockTypes: number[][][] | null = null

  // Compatibility property for direct array access (legacy support for tests)
  // Cached for performance - invalidated on first setBlock call
  public get blockTypes(): number[][][] {
    if (!this._cachedBlockTypes) {
      const arr: number[][][] = []
      for (let x = 0; x < this.size; x++) {
        arr[x] = []
        for (let y = 0; y < this.height; y++) {
          arr[x][y] = []
          for (let z = 0; z < this.size; z++) {
            arr[x][y][z] = this.getBlock(x, y, z)
          }
        }
      }
      this._cachedBlockTypes = arr
    }
    return this._cachedBlockTypes
  }

  constructor(
    public chunkCoord: ChunkCoordinate,
    public worldDef: WorldDefinition
  ) {
    this.seed = worldDef.meta.seed

    // Initialize 24x24 heightmap (simple 2D array is safe)
    this.heightMap = []
    for (let x = 0; x < this.size; x++) {
      this.heightMap[x] = []
      for (let z = 0; z < this.size; z++) {
        this.heightMap[x][z] = 0
      }
    }

    // NEW: Initialize climate maps
    this.temperature = []
    this.humidity = []
    for (let x = 0; x < this.size; x++) {
      this.temperature[x] = []
      this.humidity[x] = []
      for (let z = 0; z < this.size; z++) {
        this.temperature[x][z] = 0
        this.humidity[x][z] = 0
      }
    }

    // Initialize Uint8Array for block storage (guaranteed to work when bundled)
    // Pattern matches ChunkData.ts for consistency
    const length = this.size * this.height * this.size  // 24 * 256 * 24 = 147,456
    this.data = new Uint8Array(length)  // All values default to 0 (BlockType.air)

    // Debug logging disabled for performance
    // console.log(`🌍 GenerationContext initialized for chunk (${chunkCoord.x}, ${chunkCoord.z})`)
  }

  private getIndex(x: number, y: number, z: number): number {
    // Y-major ordering (matches ChunkData.ts)
    return x + z * this.size + y * this.size * this.size
  }

  // Safe block access with bounds checking
  setBlock(x: number, y: number, z: number, type: number): void {
    // Floor coordinates to integers (generators may pass floats)
    x = Math.floor(x)
    y = Math.floor(y)
    z = Math.floor(z)

    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return  // Silently skip out-of-bounds blocks
    }

    const index = this.getIndex(x, y, z)
    this.data[index] = type

    // Invalidate cache (for tests that use blockTypes property)
    this._cachedBlockTypes = null

    // Track min/max Y for compilation optimization
    if (type !== BlockType.air) {
      this.minY = Math.min(this.minY, y)
      this.maxY = Math.max(this.maxY, y)
    }
  }

  getBlock(x: number, y: number, z: number): number {
    // Floor coordinates to integers
    x = Math.floor(x)
    y = Math.floor(y)
    z = Math.floor(z)

    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return BlockType.air  // Out-of-bounds reads return air
    }

    const index = this.getIndex(x, y, z)
    return this.data[index]
  }

  // NEW: Update surface information at X,Z
  updateSurfaceAt(x: number, z: number): void {
    const originalHeight = this.heightMap[x]?.[z] ?? 0

    // Scan from top to find first solid block
    for (let y = 255; y >= 0; y--) {
      const block = this.getBlock(x, y, z)
      if (block !== BlockType.air) {
        this.surfaceMap.set(`${x},${z}`, {
          y: y,
          blockType: block,
          isCave: y < originalHeight - 5  // More than 5 blocks below = cave
        })
        return
      }
    }

    // No solid blocks found (entire column is air)
    this.surfaceMap.delete(`${x},${z}`)
  }

  // NEW: Find surface Y at X,Z
  findSurface(x: number, z: number): number | null {
    const surface = this.surfaceMap.get(`${x},${z}`)
    return surface ? surface.y : null
  }

  // NEW: Get surface block type at X,Z
  getSurfaceBlock(x: number, z: number): number {
    const surface = this.surfaceMap.get(`${x},${z}`)
    return surface ? surface.blockType : BlockType.air
  }

  // NEW: Mark block as cave
  markCave(x: number, y: number, z: number): void {
    this.caveBlocks.add(`${x},${y},${z}`)
  }

  // NEW: Check if block is in cave
  isCave(x: number, y: number, z: number): boolean {
    return this.caveBlocks.has(`${x},${y},${z}`)
  }

  // NEW: Mark feature placement
  markFeature(x: number, z: number, type: string): void {
    this.placedFeatures.add(`${type}:${x},${z}`)
  }

  // NEW: Check for nearby features (optimized with squared distance)
  hasNearbyFeature(x: number, z: number, radius: number, type: string): boolean {
    const radiusSq = radius * radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const distSq = dx*dx + dz*dz
        if (distSq <= radiusSq) {
          if (this.placedFeatures.has(`${type}:${x + dx},${z + dz}`)) {
            return true
          }
        }
      }
    }
    return false
  }

  // NEW: Biome accessors
  setBiomeAt(x: number, z: number, biome: SurfaceBiome): void {
    this.biomeMap.set(`${x},${z}`, biome)
  }

  getBiomeAt(x: number, z: number): SurfaceBiome | undefined {
    return this.biomeMap.get(`${x},${z}`)
  }

  setUndergroundBiomeAt(x: number, z: number, biome: UndergroundBiome): void {
    this.undergroundBiomeMap.set(`${x},${z}`, biome)
  }

  getUndergroundBiomeAt(x: number, z: number): UndergroundBiome | undefined {
    return this.undergroundBiomeMap.get(`${x},${z}`)
  }

  // Island config accessors for inter-island cave system
  setIslandConfigs(configs: IslandConfig[]): void {
    this.islandConfigs = configs
  }

  getIslandConfigs(): IslandConfig[] {
    return this.islandConfigs
  }
}
