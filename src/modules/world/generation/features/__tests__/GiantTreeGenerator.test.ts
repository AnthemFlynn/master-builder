import { describe, it, expect } from 'bun:test'
import { GiantTreeGenerator } from '../GiantTreeGenerator'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('GiantTreeGenerator', () => {
  const config = {
    type: 'giant_tree' as const,
    density: 1.0,  // 100% for testing
    trunkRadiusRange: [3, 3] as [number, number],
    heightRange: [40, 40] as [number, number],
    canopyRadius: 20,
    material: {
      trunk: "tree",
      leaves: "leaf"
    }
  }

  it('should generate tree trunk', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 32, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create ground
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 32
        context.setBlock(x, 32, z, BlockType.grass)
      }
    }

    const generator = new GiantTreeGenerator()
    generator.generate(context, config)

    // Should have tree blocks above ground
    let treeBlockCount = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 33; y < 80; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.tree) {
            treeBlockCount++
          }
        }
      }
    }

    expect(treeBlockCount).toBeGreaterThan(0)
  })

  it('should generate canopy of leaves', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 32, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 32
        context.setBlock(x, 32, z, BlockType.grass)
      }
    }

    const generator = new GiantTreeGenerator()
    generator.generate(context, config)

    // Should have leaves at canopy height
    let leafCount = 0
    for (let y = 60; y < 90; y++) {
      for (let x = 0; x < 24; x++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.leaf) {
            leafCount++
          }
        }
      }
    }

    expect(leafCount).toBeGreaterThan(0)
  })
})
