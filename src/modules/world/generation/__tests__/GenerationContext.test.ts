import { describe, it, expect } from 'bun:test'
import { GenerationContext } from '../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'

describe('GenerationContext', () => {
  const testWorldDef = {
    meta: { name: "Test", seed: 12345, version: "0.1.0" },
    terrain: {
      generator: "flat" as const,
      baseHeight: 40,
      noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 }
    },
    features: [],
    biomes: { elevationBased: true, ranges: [] }
  }

  it('should initialize with chunk coordinate and world definition', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    expect(context.chunkCoord).toBe(coord)
    expect(context.worldDef).toBe(testWorldDef)
    expect(context.seed).toBe(12345)
  })

  it('should initialize heightMap as 24x24 array', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    expect(context.heightMap.length).toBe(24)
    expect(context.heightMap[0].length).toBe(24)
  })

  it('should initialize blockTypes as 24x256x24 array of air', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    expect(context.blockTypes.length).toBe(24)
    expect(context.blockTypes[0].length).toBe(256)
    expect(context.blockTypes[0][0].length).toBe(24)
    expect(context.blockTypes[0][0][0]).toBe(0)  // Air
  })

  it('should allow safe setBlock/getBlock at all valid coordinates', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    // Test edges and random positions
    const testPositions = [
      [0, 0, 0], [23, 255, 23], [10, 50, 10],
      [0, 100, 23], [23, 200, 0], [12, 128, 18]
    ]

    for (const [x, y, z] of testPositions) {
      context.setBlock(x, y, z, 5)  // Set to some block type
      expect(context.getBlock(x, y, z)).toBe(5)
    }
  })

  it('should handle out-of-bounds gracefully', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    // Should not throw
    context.setBlock(-1, 0, 0, 5)
    context.setBlock(24, 0, 0, 5)
    context.setBlock(0, 256, 0, 5)
    context.setBlock(0, -1, 0, 5)

    // Out-of-bounds reads return air
    expect(context.getBlock(-1, 0, 0)).toBe(0)
    expect(context.getBlock(24, 0, 0)).toBe(0)
    expect(context.getBlock(0, 256, 0)).toBe(0)
  })

  it('should initialize temperature and humidity maps', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    expect(context.temperature.length).toBe(24)
    expect(context.temperature[0].length).toBe(24)
    expect(context.humidity.length).toBe(24)
    expect(context.humidity[0].length).toBe(24)

    // Should initialize to 0
    expect(context.temperature[0][0]).toBe(0)
    expect(context.humidity[0][0]).toBe(0)
  })

  it('should track surface information', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    // Set some blocks to create surface
    context.setBlock(5, 40, 10, 14)  // BlockType.grass
    context.setBlock(5, 39, 10, 4)   // BlockType.dirt

    // Surface map should be empty initially
    expect(context.surfaceMap.size).toBe(0)

    // Update surface map
    context.updateSurfaceAt(5, 10)

    const surface = context.surfaceMap.get('5,10')
    expect(surface).toBeDefined()
    expect(surface?.y).toBe(40)
    expect(surface?.blockType).toBe(14)  // grass
    expect(surface?.isCave).toBe(false)
  })

  it('should detect cave surfaces', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    // Create terrain up to Y=50
    for (let y = 0; y <= 50; y++) {
      context.setBlock(5, y, 10, 5)  // BlockType.stone
    }
    context.heightMap[5][10] = 50

    // Carve cave (remove blocks from Y=31 to top, leaving Y=30 as ceiling)
    for (let y = 31; y <= 50; y++) {
      context.setBlock(5, y, 10, 0)  // Air
    }

    // Update surface (should find Y=30 as cave ceiling)
    context.updateSurfaceAt(5, 10)

    const surface = context.surfaceMap.get('5,10')
    expect(surface?.y).toBe(30)
    expect(surface?.isCave).toBe(true)  // 20 blocks below original height (50-30=20)
  })
})
