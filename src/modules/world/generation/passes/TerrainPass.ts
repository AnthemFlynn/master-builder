import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'

export class TerrainPass implements GenerationPass {
  readonly name = 'TerrainPass'

  execute(context: GenerationContext): void {
    const { terrain } = context.worldDef

    if (terrain.generator === 'flat') {
      this.generateFlat(context, terrain.baseHeight)
    } else {
      this.generateNoise(context, terrain)
    }

    // Fill blockTypes below heightmap
    this.fillTerrain(context)
  }

  private generateFlat(context: GenerationContext, height: number): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = height
      }
    }
  }

  private generateNoise(context: GenerationContext, terrain: any): void {
    if (!terrain.noise) {
      throw new Error('Noise generator requires noise configuration')
    }

    const noise2D = createNoise2D(() => context.seed)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        let value = 0
        let amplitude = terrain.noise.amplitude
        let frequency = terrain.noise.frequency

        // Multi-octave noise
        for (let octave = 0; octave < terrain.noise.octaves; octave++) {
          value += noise2D(worldX * frequency, worldZ * frequency) * amplitude
          amplitude *= terrain.noise.persistence
          frequency *= terrain.noise.lacunarity
        }

        context.heightMap[x][z] = terrain.baseHeight + value
      }
    }
  }

  private fillTerrain(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])

        // Fill from Y=0 to height with stone
        for (let y = 0; y <= height && y < 256; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }
  }
}
