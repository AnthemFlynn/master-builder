import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

export default class Noise {
  noise = new ImprovedNoise()
  seed = Math.random()
  gap = 22
  amp = 8

  stoneSeed = this.seed * 0.4
  stoneGap = 12
  stoneAmp = 8
  stoneThreshold = 3.5

  // Tree properties (needed by Control even if not used in generation)
  treeSeed = this.seed * 0.7
  treeHeight = 10
  treeGap = 2
  treeAmp = 6
  treeThreshold = 4

  // Leaf properties
  leafSeed = this.seed * 0.8
  leafGap = 2
  leafAmp = 5
  leafThreshold = -0.03

  // Coal properties
  coalSeed = this.seed * 0.5
  coalGap = 3
  coalAmp = 8
  coalThreshold = 3

  get = (x: number, y: number, z: number) => {
    return this.noise.noise(x, y, z)
  }
}
