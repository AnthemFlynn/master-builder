import * as SimplexNoise from 'simplex-noise'
import { BiomeDefinition } from './types'
import { biomeRegistry } from './BiomeRegistry'

export class BiomeGenerator {
  private tempNoise: (x: number, y: number) => number
  private humidityNoise: (x: number, y: number) => number
  
  constructor(seed: string) {
    // Create seeded noise functions
    // We use different seeds for temp and humidity so they don't overlap perfectly
    // Simplex noise returns -1 to 1. We map to 0 to 1.
    const tempSeed = seed + '_temp'
    const humSeed = seed + '_humidity'
    
    // Fallback if createNoise2D doesn't support string seed directly (it usually takes PRNG).
    // I will use a simple hash to number.
    const hash = (s: string) => {
        let h = 0xdeadbeef
        for(let i=0; i<s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761)
        return () => (h = Math.imul(h ^ h >>> 16, 2246822507), h >>> 0) / 4294967296
    }
    
    // Handle ESM/CJS interop by checking default export or named export
    const createNoise = (SimplexNoise as any).createNoise2D || SimplexNoise.createNoise2D
    
    this.tempNoise = createNoise(hash(tempSeed))
    this.humidityNoise = createNoise(hash(humSeed))
  }

  getBiomeAt(x: number, z: number): BiomeDefinition {
    // Biome scale is large (e.g. scale 0.001)
    const scale = 0.002 
    
    const tRaw = this.tempNoise(x * scale, z * scale)
    const hRaw = this.humidityNoise(x * scale, z * scale)
    
    // Map -1..1 to 0..1
    const temperature = (tRaw + 1) / 2
    const humidity = (hRaw + 1) / 2
    
    return biomeRegistry.findMatch(temperature, humidity)
  }
}
