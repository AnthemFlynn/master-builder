import { describe, it, expect } from 'bun:test'
import { TerrainPass } from '../TerrainPass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'

describe('TerrainPass', () => {
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

  it('should generate flat heightmap for flat generator', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)
    const pass = new TerrainPass()

    pass.execute(context)

    // All heights should be baseHeight
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        expect(context.heightMap[x][z]).toBe(40)
      }
    }
  })

  it('should fill blocks below heightmap', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)
    const pass = new TerrainPass()

    pass.execute(context)

    // Block at Y=39 should be stone (below heightmap)
    expect(context.blockTypes[0][39][0]).toBeGreaterThan(0)

    // Block at Y=41 should be air (above heightmap)
    expect(context.blockTypes[0][41][0]).toBe(0)
  })

  it('should generate deterministic noise heightmap', () => {
    const noiseDef = {
      ...testWorldDef,
      terrain: { ...testWorldDef.terrain, generator: "noise" as const }
    }

    const context1 = new GenerationContext(new ChunkCoordinate(0, 0), noiseDef)
    const context2 = new GenerationContext(new ChunkCoordinate(0, 0), noiseDef)

    const pass = new TerrainPass()
    pass.execute(context1)
    pass.execute(context2)

    // Same seed + coord = same heightmap
    expect(context1.heightMap).toEqual(context2.heightMap)
  })
})
