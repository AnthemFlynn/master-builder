import { describe, it, expect } from 'bun:test'
import { SeededRandom } from '../SeededRandom'

describe('SeededRandom', () => {
  it('should generate deterministic Gaussian values', () => {
    const rng1 = new SeededRandom(12345)
    const rng2 = new SeededRandom(12345)

    const val1 = rng1.gaussian(10, 2)
    const val2 = rng2.gaussian(10, 2)

    expect(val1).toBe(val2)  // Same seed = same value
  })

  it('should generate values centered around mean', () => {
    const rng = new SeededRandom(999)
    const samples = []

    for (let i = 0; i < 100; i++) {
      samples.push(rng.gaussian(50, 10))
    }

    const mean = samples.reduce((a, b) => a + b) / samples.length
    expect(Math.abs(mean - 50)).toBeLessThan(5)  // Should be near 50
  })

  it('should clamp Gaussian values to range', () => {
    const rng = new SeededRandom(777)

    for (let i = 0; i < 100; i++) {
      const val = rng.clampedGaussian(10, 5, 2, 18)
      expect(val).toBeGreaterThanOrEqual(2)
      expect(val).toBeLessThanOrEqual(18)
    }
  })
})
