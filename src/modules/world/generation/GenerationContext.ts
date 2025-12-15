import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorldDefinition } from '../domain/WorldDefinition'
import { BlockType } from '../domain/BlockType'

/**
 * GenerationContext - State container for chunk generation pipeline
 *
 * ARCHITECTURE NOTE: Follows ChunkData pattern with Uint8Array for reliable bundling
 * Nested JavaScript arrays are fragile during minification/bundling
 */
export class GenerationContext {
  public seed: number
  public heightMap: number[][]
  public temperature: number[][]  // NEW
  public humidity: number[][]     // NEW
  public minY: number = 256
  public maxY: number = 0

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

    console.log(`🌍 GenerationContext initialized for chunk (${chunkCoord.x}, ${chunkCoord.z})`)
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
}
