export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  // Linear Congruential Generator
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296
    return this.state / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  // NEW: Box-Muller transform for Gaussian distribution
  gaussian(mean: number, stdDev: number): number {
    const u1 = this.next()
    const u2 = this.next()
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
    return mean + stdDev * z0
  }

  // NEW: Clamped Gaussian to prevent extreme outliers
  clampedGaussian(mean: number, stdDev: number, min: number, max: number): number {
    let value = this.gaussian(mean, stdDev)
    return Math.max(min, Math.min(max, value))
  }
}
