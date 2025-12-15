import { describe, it, expect } from 'bun:test'
import { BiomePass } from '../BiomePass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'
import { SurfaceBiomeType } from '../../biomes/BiomeTypes'

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
        context.setBlock(x, 40, z, BlockType.stone)
      }
    }

    const pass = new BiomePass()
    pass.execute(context)

    // Surface at Y=40 should be grass (30-60 range)
    expect(context.getBlock(0, 40, 0)).toBe(BlockType.grass)

    // Subsurface (Y=39, 38, 37) should be dirt
    expect(context.getBlock(0, 39, 0)).toBe(BlockType.dirt)
    expect(context.getBlock(0, 38, 0)).toBe(BlockType.dirt)
    expect(context.getBlock(0, 37, 0)).toBe(BlockType.dirt)
  })

  it('should skip if elevationBased is false', () => {
    const worldDef = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: false, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)
    context.setBlock(0, 40, 0, BlockType.stone)

    const pass = new BiomePass()
    pass.execute(context)

    // Should remain stone (not modified)
    expect(context.getBlock(0, 40, 0)).toBe(BlockType.stone)
  })

  it('should determine biomes from climate data', () => {
    const worldDef = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40 },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Set climate and terrain
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        // Hot and dry = desert
        context.temperature[x][z] = 0.8
        context.humidity[x][z] = -0.5
        context.heightMap[x][z] = 40
        context.setBlock(x, 40, z, BlockType.stone)
        context.surfaceMap.set(`${x},${z}`, {
          y: 40,
          blockType: BlockType.stone,
          isCave: false
        })
      }
    }

    const pass = new BiomePass()
    pass.execute(context)

    // Desert biome should have sand surface
    expect(context.getBlock(0, 40, 0)).toBe(BlockType.sand)

    // Should store biome type
    const biome = context.getBiomeAt(0, 0)
    expect(biome?.type).toBe(SurfaceBiomeType.DESERT)
  })

  it('should skip cave surfaces when applying biomes', () => {
    const worldDef = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 50 },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create terrain with cave
    for (let y = 1; y <= 50; y++) {
      context.setBlock(5, y, 10, BlockType.stone)
    }
    context.heightMap[5][10] = 50
    context.temperature[5][10] = 0.5
    context.humidity[5][10] = 0.5

    // Mark as cave surface (underground)
    context.surfaceMap.set('5,10', {
      y: 30,  // Cave ceiling
      blockType: BlockType.stone,
      isCave: true
    })

    const pass = new BiomePass()
    pass.execute(context)

    // Cave ceiling should remain stone (not grass)
    expect(context.getBlock(5, 30, 10)).toBe(BlockType.stone)
  })
})
