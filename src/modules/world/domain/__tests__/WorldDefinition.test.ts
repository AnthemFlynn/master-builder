import { describe, it, expect } from 'bun:test'
import { WorldDefinitionSchema } from '../WorldDefinition'

describe('WorldDefinitionSchema', () => {
  it('should validate correct world definition', () => {
    const validWorld = {
      meta: {
        name: "Test World",
        seed: 12345,
        version: "0.1.0"
      },
      terrain: {
        generator: "noise",
        baseHeight: 40,
        noise: {
          type: "simplex",
          octaves: 4,
          frequency: 0.01,
          amplitude: 20,
          lacunarity: 2.0,
          persistence: 0.5
        }
      },
      features: [],
      biomes: {
        elevationBased: true,
        ranges: []
      }
    }

    const result = WorldDefinitionSchema.safeParse(validWorld)
    expect(result.success).toBe(true)
  })

  it('should reject invalid seed type', () => {
    const invalidWorld = {
      meta: { name: "Test", seed: "not a number", version: "0.1.0" }
    }

    const result = WorldDefinitionSchema.safeParse(invalidWorld)
    expect(result.success).toBe(false)
  })

  it('should reject invalid generator type', () => {
    const invalidWorld = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "invalid", baseHeight: 40 }
    }

    const result = WorldDefinitionSchema.safeParse(invalidWorld)
    expect(result.success).toBe(false)
  })

  it('should validate floating island feature', () => {
    const world = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: {
        generator: "flat",
        baseHeight: 40,
        noise: {
          type: "simplex",
          octaves: 4,
          frequency: 0.01,
          amplitude: 20,
          lacunarity: 2.0,
          persistence: 0.5
        }
      },
      features: [
        {
          type: "floating_island",
          spacing: 400,
          radiusRange: [50, 100],
          heightRange: [80, 120],
          thickness: 15,
          material: "grass"
        }
      ],
      biomes: { elevationBased: true, ranges: [] }
    }

    const result = WorldDefinitionSchema.safeParse(world)
    expect(result.success).toBe(true)
  })

  it('should validate cave system feature', () => {
    const world = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: {
        generator: "flat",
        baseHeight: 40,
        noise: {
          type: "simplex",
          octaves: 4,
          frequency: 0.01,
          amplitude: 20,
          lacunarity: 2.0,
          persistence: 0.5
        }
      },
      features: [
        {
          type: "cave_system",
          density: 0.02,
          radiusRange: [5, 15],
          depthRange: [10, 80],
          windingFactor: 0.7
        }
      ],
      biomes: { elevationBased: true, ranges: [] }
    }

    const result = WorldDefinitionSchema.safeParse(world)
    expect(result.success).toBe(true)
  })

  it('should reject invalid feature type', () => {
    const world = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: {
        generator: "flat",
        baseHeight: 40,
        noise: {
          type: "simplex",
          octaves: 4,
          frequency: 0.01,
          amplitude: 20,
          lacunarity: 2.0,
          persistence: 0.5
        }
      },
      features: [
        { type: "invalid_feature" }
      ],
      biomes: { elevationBased: true, ranges: [] }
    }

    const result = WorldDefinitionSchema.safeParse(world)
    expect(result.success).toBe(false)
  })
})
