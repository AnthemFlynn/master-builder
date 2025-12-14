import { describe, it, expect } from 'bun:test'
import { CrystalFormationGenerator } from '../CrystalFormationGenerator'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('CrystalFormationGenerator', () => {
  const config = {
    type: 'crystal_formation' as const,
    density: 1.0,  // 100% for testing
    heightRange: [10, 10] as [number, number],  // Fixed height
    material: "glowstone",
    depthRange: [20, 80] as [number, number],
    onlyInCaves: true
  }

  it('should only place crystals in caves (air adjacent to stone)', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create a cave (air pocket in stone)
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context.blockTypes[x][y][z] = BlockType.stone
        }
      }
    }

    // Carve air pocket at Y=40
    for (let x = 10; x < 14; x++) {
      for (let z = 10; z < 14; z++) {
        context.blockTypes[x][40][z] = BlockType.air
      }
    }

    const generator = new CrystalFormationGenerator()
    generator.generate(context, config)

    // Should have placed crystals near cave ceiling/walls
    let hasCrystals = false
    for (let x = 0; x < 24; x++) {
      for (let y = 30; y < 50; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.blockTypes[x][y][z] === BlockType.glowstone) {
            hasCrystals = true
          }
        }
      }
    }

    expect(hasCrystals).toBe(true)
  })

  it('should use specified material', () => {
    const obsidianConfig = {
      ...config,
      material: "obsidian"
    }

    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create cave
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context.blockTypes[x][y][z] = BlockType.stone
        }
      }
    }

    for (let x = 10; x < 14; x++) {
      for (let z = 10; z < 14; z++) {
        context.blockTypes[x][40][z] = BlockType.air
      }
    }

    const generator = new CrystalFormationGenerator()
    generator.generate(context, obsidianConfig)

    // Should have obsidian crystals
    let hasObsidian = false
    for (let x = 0; x < 24; x++) {
      for (let y = 30; y < 50; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.blockTypes[x][y][z] === BlockType.obsidian) {
            hasObsidian = true
          }
        }
      }
    }

    expect(hasObsidian).toBe(true)
  })
})
