import { describe, it, expect } from 'bun:test'
import { WormCaveGenerator } from '../WormCaveGenerator'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('WormCaveGenerator', () => {
  const config = {
    type: 'cave_system' as const,
    density: 0.1,  // High density for testing
    radiusRange: [5, 5] as [number, number],
    depthRange: [10, 80] as [number, number],
    windingFactor: 0.5
  }

  it('should carve tunnels through solid terrain', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Fill with stone
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const generator = new WormCaveGenerator()
    generator.generate(context, config)

    // Should have carved some air pockets
    let airCount = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 10; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.air) {
            airCount++
          }
        }
      }
    }

    expect(airCount).toBeGreaterThan(0)
  })

  it('should generate deterministic caves', () => {
    const worldDef = {
      meta: { name: "Test", seed: 999, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context1 = new GenerationContext(new ChunkCoordinate(5, 5), worldDef)
    const context2 = new GenerationContext(new ChunkCoordinate(5, 5), worldDef)

    // Fill both with stone
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context1.setBlock(x, y, z, BlockType.stone)
          context2.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const generator = new WormCaveGenerator()
    generator.generate(context1, config)
    generator.generate(context2, config)

    // Same seed + coord = same caves (compare via getBlock)
    let matches = true
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          if (context1.getBlock(x, y, z) !== context2.getBlock(x, y, z)) {
            matches = false
          }
        }
      }
    }

    expect(matches).toBe(true)
  })
})
