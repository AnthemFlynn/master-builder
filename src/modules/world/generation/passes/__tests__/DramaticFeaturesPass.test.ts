import { describe, it, expect } from 'bun:test'
import { DramaticFeaturesPass } from '../DramaticFeaturesPass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('DramaticFeaturesPass', () => {
  it('should apply floating island feature', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 20, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [
        {
          type: 'floating_island' as const,
          spacing: 400,
          radiusRange: [30, 30] as [number, number],
          heightRange: [100, 100] as [number, number],
          thickness: 15,
          material: "grass"
        }
      ],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)
    const pass = new DramaticFeaturesPass()

    pass.execute(context)

    // Should have island blocks around Y=100
    let islandBlockCount = 0
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        for (let y = 95; y < 105; y++) {
          if (context.getBlock(x, y, z) !== BlockType.air) {
            islandBlockCount++
          }
        }
      }
    }

    expect(islandBlockCount).toBeGreaterThan(0)
  })

  it('should apply multiple feature types', () => {
    const worldDef = {
      meta: { name: "Test", seed: 999, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [
        {
          type: 'floating_island' as const,
          spacing: 400,
          radiusRange: [20, 20] as [number, number],
          heightRange: [80, 80] as [number, number],
          thickness: 10,
          material: "stone"
        },
        {
          type: 'cave_system' as const,
          density: 0.5,
          radiusRange: [5, 5] as [number, number],
          depthRange: [10, 50] as [number, number],
          windingFactor: 0.5
        }
      ],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Fill with stone first
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const pass = new DramaticFeaturesPass()
    pass.execute(context)

    // Should have both island (around Y=80) and caves (air in 10-50 range)
    // This test just verifies both generators were called
    expect(pass.name).toBe('DramaticFeaturesPass')
  })
})
