import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { resolveBlockType } from '../../domain/MaterialRegistry'

export class BiomePass implements GenerationPass {
  readonly name = 'BiomePass'

  execute(context: GenerationContext): void {
    const { biomes } = context.worldDef

    if (!biomes.elevationBased) return

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])

        // Find matching biome range
        const biomeRange = biomes.ranges.find(range =>
          height >= range.elevationRange[0] && height < range.elevationRange[1]
        )

        if (!biomeRange) continue

        // Apply surface block
        if (height >= 0 && height < 256) {
          context.blockTypes[x][height][z] = resolveBlockType(biomeRange.surface)
        }

        // Apply subsurface blocks (3 blocks deep)
        const subsurfaceBlockType = resolveBlockType(biomeRange.subsurface)
        for (let depth = 1; depth <= 3; depth++) {
          const y = height - depth
          if (y >= 0 && y < 256) {
            context.blockTypes[x][y][z] = subsurfaceBlockType
          }
        }
      }
    }
  }
}
