import { BiomeDefinition } from './types'
import { PLAINS_BIOME, DESERT_BIOME, MOUNTAINS_BIOME } from './definitions'

export class BiomeRegistry {
  private biomes = new Map<string, BiomeDefinition>()
  private defaultBiome: BiomeDefinition = PLAINS_BIOME

  constructor() {
    this.register(PLAINS_BIOME)
    this.register(DESERT_BIOME)
    this.register(MOUNTAINS_BIOME)
  }

  register(biome: BiomeDefinition): void {
    this.biomes.set(biome.id, biome)
  }

  get(id: string): BiomeDefinition {
    return this.biomes.get(id) || this.defaultBiome
  }

  // Find the best matching biome for given parameters
  // Uses euclidean distance in Temp/Humidity space
  findMatch(temp: number, humidity: number): BiomeDefinition {
    let bestBiome = this.defaultBiome
    let minDistance = Infinity

    for (const biome of this.biomes.values()) {
      const dTemp = biome.temperature - temp
      const dHum = biome.humidity - humidity
      const distance = dTemp * dTemp + dHum * dHum
      
      if (distance < minDistance) {
        minDistance = distance
        bestBiome = biome
      }
    }
    return bestBiome
  }
}

export const biomeRegistry = new BiomeRegistry()
