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
})
