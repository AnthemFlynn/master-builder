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
})
