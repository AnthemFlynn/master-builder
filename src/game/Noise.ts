import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise'

export default class Noise {
  noise = new ImprovedNoise()
  seed = Math.random()
  gap = 22
  amp = 8

  stoneSeed = this.seed * 0.4
  stoneGap = 12
  stoneAmp = 8
  stoneThreshold = 3.5

  // For our educational game, we can simplify - no trees/coal for now
  // Just terrain height variation

  get = (x: number, y: number, z: number) => {
    return this.noise.noise(x, y, z)
  }
}
