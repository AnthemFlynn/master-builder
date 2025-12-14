import { describe, it, expect } from 'bun:test'
import { BiomePass } from '../BiomePass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('BiomePass', () => {
  it('should assign surface materials based on elevation', () => {
    const worldDef = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: {
        elevationBased: true,
        ranges: [
          { elevationRange: [0, 30], surface: "sand", subsurface: "sand" },
          { elevationRange: [30, 60], surface: "grass", subsurface: "dirt" },
          { elevationRange: [60, 100], surface: "stone", subsurface: "stone" }
        ]
      }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create terrain at Y=40 (stone)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 40
        context.blockTypes[x][40][z] = BlockType.stone
      }
    }

    const pass = new BiomePass()
    pass.execute(context)

    // Surface at Y=40 should be grass (30-60 range)
    expect(context.blockTypes[0][40][0]).toBe(BlockType.grass)

    // Subsurface (Y=39, 38, 37) should be dirt
    expect(context.blockTypes[0][39][0]).toBe(BlockType.dirt)
    expect(context.blockTypes[0][38][0]).toBe(BlockType.dirt)
    expect(context.blockTypes[0][37][0]).toBe(BlockType.dirt)
  })

  it('should skip if elevationBased is false', () => {
    const worldDef = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: false, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)
    context.blockTypes[0][40][0] = BlockType.stone

    const pass = new BiomePass()
    pass.execute(context)

    // Should remain stone (not modified)
    expect(context.blockTypes[0][40][0]).toBe(BlockType.stone)
  })
})
