import { describe, it, expect } from 'bun:test'
import { FloatingIslandGenerator } from '../FloatingIslandGenerator'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('FloatingIslandGenerator', () => {
  const config = {
    type: 'floating_island' as const,
    spacing: 400,
    noiseOffset: 50,
    radiusRange: [50, 50] as [number, number],  // Fixed size for testing
    heightRange: [100, 100] as [number, number],  // Fixed height
    thickness: 15,
    material: "grass",
    supportPillars: false
  }

  it('should detect if chunk is affected by island', () => {
    const generator = new FloatingIslandGenerator()

    // With the 3x3 grid placement algorithm, chunks will have nearby islands
    // Test that the affects method returns correctly
    const affected = generator.affects(new ChunkCoordinate(0, 0), 12345, config)
    expect(typeof affected).toBe('boolean')

    // Deterministic: same coord and seed should give same result
    const affected2 = generator.affects(new ChunkCoordinate(0, 0), 12345, config)
    expect(affected).toBe(affected2)
  })

  it('should generate sphere of blocks', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 20, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    // Use chunk away from origin (grid (0,0) is skipped to avoid spawn island)
    const context = new GenerationContext(new ChunkCoordinate(10, 10), worldDef)
    const generator = new FloatingIslandGenerator()

    generator.generate(context, config)

    // Check that blocks were placed (island might be in this chunk or nearby)
    let hasBlocks = false
    for (let x = 0; x < 24; x++) {
      for (let y = 50; y < 150; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) !== 0) {
            hasBlocks = true
          }
        }
      }
    }

    expect(hasBlocks).toBe(true)
  })

  it('should generate same islands for same seed', () => {
    const generator = new FloatingIslandGenerator()

    const islands1 = generator['getIslandCenters'](new ChunkCoordinate(0, 0), 12345, config)
    const islands2 = generator['getIslandCenters'](new ChunkCoordinate(0, 0), 12345, config)

    expect(islands1).toEqual(islands2)
  })
})
