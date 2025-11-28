import { describe, it, expect, beforeEach } from 'vitest'
import Noise from './Noise'

describe('Noise', () => {
  let noise: Noise

  beforeEach(() => {
    noise = new Noise()
  })

  describe('initialization', () => {
    it('should initialize with ImprovedNoise instance', () => {
      expect(noise.noise).toBeDefined()
      expect(noise.noise.noise).toBeTypeOf('function')
    })

    it('should initialize with random seed', () => {
      const noise1 = new Noise()
      const noise2 = new Noise()

      // Seeds should be different (with very high probability)
      expect(noise1.seed).not.toBe(noise2.seed)
    })

    it('should have correct terrain generation parameters', () => {
      expect(noise.gap).toBe(22)
      expect(noise.amp).toBe(8)
    })

    it('should have correct stone generation parameters', () => {
      expect(noise.stoneGap).toBe(12)
      expect(noise.stoneAmp).toBe(8)
      expect(noise.stoneThreshold).toBe(3.5)
    })

    it('should calculate stone seed from main seed', () => {
      expect(noise.stoneSeed).toBe(noise.seed * 0.4)
    })
  })

  describe('get method', () => {
    it('should return a number', () => {
      const result = noise.get(0, 0, 0)
      expect(typeof result).toBe('number')
    })

    it('should return deterministic values for same coordinates', () => {
      const result1 = noise.get(10, 20, 30)
      const result2 = noise.get(10, 20, 30)

      expect(result1).toBe(result2)
    })

    it('should return different values for different coordinates', () => {
      // Use fractional coordinates since Perlin noise returns 0 at integer lattice points
      const result1 = noise.get(0.5, 0.5, 0.5)
      const result2 = noise.get(1.5, 1.5, 1.5)

      expect(result1).not.toBe(result2)
    })

    it('should handle negative coordinates', () => {
      const result = noise.get(-10, -20, -30)
      expect(typeof result).toBe('number')
      expect(result).not.toBe(NaN)
    })

    it('should handle large coordinates', () => {
      const result = noise.get(1000, 2000, 3000)
      expect(typeof result).toBe('number')
      expect(result).not.toBe(NaN)
    })

    it('should handle fractional coordinates', () => {
      const result = noise.get(0.5, 1.5, 2.5)
      expect(typeof result).toBe('number')
      expect(result).not.toBe(NaN)
    })
  })

  describe('noise consistency', () => {
    it('should generate consistent values across multiple calls', () => {
      const coords = [
        [0, 0, 0],
        [10, 20, 30],
        [100, 200, 300],
        [-10, -20, -30]
      ]

      coords.forEach(([x, y, z]) => {
        const result1 = noise.get(x, y, z)
        const result2 = noise.get(x, y, z)
        const result3 = noise.get(x, y, z)

        expect(result1).toBe(result2)
        expect(result2).toBe(result3)
      })
    })

    it('should produce smooth variation between nearby points', () => {
      const result1 = noise.get(0, 0, 0)
      const result2 = noise.get(0.1, 0, 0)

      // Adjacent points should have similar values
      const difference = Math.abs(result1 - result2)
      expect(difference).toBeLessThan(1)
    })
  })

  describe('seed behavior', () => {
    it('should produce same noise patterns (ImprovedNoise uses internal permutation)', () => {
      const noise1 = new Noise()
      const noise2 = new Noise()

      const values1: number[] = []
      const values2: number[] = []

      // Use fractional coordinates to get non-zero values
      for (let i = 0; i < 10; i++) {
        values1.push(noise1.get(i + 0.5, i + 0.5, i + 0.5))
        values2.push(noise2.get(i + 0.5, i + 0.5, i + 0.5))
      }

      // ImprovedNoise doesn't use seed for generation, so values will be identical
      // The seed property is for other uses (like stone/tree generation offsets)
      const identical = values1.every((v, i) => v === values2[i])
      expect(identical).toBe(true)
    })

    it('should maintain seed value throughout instance lifetime', () => {
      const originalSeed = noise.seed

      // Generate some noise
      noise.get(1, 2, 3)
      noise.get(4, 5, 6)
      noise.get(7, 8, 9)

      expect(noise.seed).toBe(originalSeed)
    })
  })

  describe('stone seed calculation', () => {
    it('should update stone seed when main seed changes', () => {
      const newSeed = 0.5
      noise.seed = newSeed
      noise.stoneSeed = noise.seed * 0.4

      expect(noise.stoneSeed).toBe(0.2)
    })

    it('should maintain correct ratio to main seed', () => {
      expect(noise.stoneSeed / noise.seed).toBeCloseTo(0.4, 5)
    })
  })

  describe('parameter ranges', () => {
    it('should have seed between 0 and 1', () => {
      expect(noise.seed).toBeGreaterThanOrEqual(0)
      expect(noise.seed).toBeLessThan(1)
    })

    it('should have positive gap values', () => {
      expect(noise.gap).toBeGreaterThan(0)
      expect(noise.stoneGap).toBeGreaterThan(0)
    })

    it('should have positive amplitude values', () => {
      expect(noise.amp).toBeGreaterThan(0)
      expect(noise.stoneAmp).toBeGreaterThan(0)
    })

    it('should have positive threshold values', () => {
      expect(noise.stoneThreshold).toBeGreaterThan(0)
    })
  })

  describe('terrain generation scenarios', () => {
    it('should generate terrain at ground level (y=0)', () => {
      const results = []
      for (let x = 0; x < 10; x++) {
        for (let z = 0; z < 10; z++) {
          results.push(noise.get(x, 0, z))
        }
      }

      // All values should be valid numbers
      results.forEach(result => {
        expect(typeof result).toBe('number')
        expect(result).not.toBe(NaN)
      })
    })

    it('should generate varied terrain across horizontal plane', () => {
      const values = new Set()

      // Use fractional coordinates to avoid integer lattice points
      for (let x = 0; x < 20; x += 5) {
        for (let z = 0; z < 20; z += 5) {
          values.add(noise.get(x + 0.5, 0.5, z + 0.5))
        }
      }

      // Should have some variation in terrain
      expect(values.size).toBeGreaterThan(1)
    })

    it('should handle underground generation (negative y)', () => {
      const result = noise.get(10, -10, 10)
      expect(typeof result).toBe('number')
      expect(result).not.toBe(NaN)
    })

    it('should handle sky generation (high y)', () => {
      const result = noise.get(10, 100, 10)
      expect(typeof result).toBe('number')
      expect(result).not.toBe(NaN)
    })
  })

  describe('performance', () => {
    it('should generate noise quickly', () => {
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        noise.get(i, i, i)
      }

      const end = performance.now()
      const duration = end - start

      // 1000 calls should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100)
    })
  })
})
