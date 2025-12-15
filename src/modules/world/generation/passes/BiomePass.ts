import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { resolveBlockType } from '../../domain/MaterialRegistry'
import { getSurfaceBiome } from '../biomes/SurfaceBiomes'
import { getUndergroundBiome } from '../biomes/UndergroundBiomes'
import { BlockType } from '../../domain/BlockType'

export class BiomePass implements GenerationPass {
  readonly name = 'BiomePass'

  execute(context: GenerationContext): void {
    const { biomes } = context.worldDef

    // Support legacy elevation-based system
    if (biomes.elevationBased && biomes.ranges && biomes.ranges.length > 0) {
      this.executeLegacy(context)
      return
    }

    // New climate-based system
    this.executeClimateBased(context)
  }

  private executeClimateBased(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const surface = context.surfaceMap.get(`${x},${z}`)
        if (!surface) continue

        // Skip cave surfaces (underground ceilings)
        if (surface.isCave) continue

        // Get climate data
        const temp = context.temperature[x][z]
        const humidity = context.humidity[x][z]

        // Determine surface biome from climate
        const surfaceBiome = getSurfaceBiome(temp, humidity, surface.y)
        context.setBiomeAt(x, z, surfaceBiome)

        // Apply surface materials
        this.applySurfaceLayers(context, x, z, surface.y, surfaceBiome)

        // Determine and apply underground biome
        const undergroundBiome = getUndergroundBiome(temp, humidity)
        context.setUndergroundBiomeAt(x, z, undergroundBiome)
        this.applyCaveBiomeBlocks(context, x, z, undergroundBiome)
      }
    }
  }

  private applySurfaceLayers(context: GenerationContext, x: number, z: number, surfaceY: number, biome: any): void {
    // Apply surface block
    context.setBlock(x, surfaceY, z, biome.surfaceBlock)

    // Apply subsurface layers
    for (let depth = 1; depth <= biome.subsurfaceDepth; depth++) {
      const y = surfaceY - depth
      if (y > 0 && context.getBlock(x, y, z) === BlockType.stone) {
        context.setBlock(x, y, z, biome.subsurfaceBlock)
      }
    }
  }

  private applyCaveBiomeBlocks(context: GenerationContext, x: number, z: number, caveBiome: any): void {
    // Apply cave floor blocks where caves exist
    for (let y = 5; y < 100; y++) {
      if (context.getBlock(x, y, z) !== BlockType.air) continue
      if (!context.isCave(x, y, z)) continue

      // Cave floor
      const below = context.getBlock(x, y - 1, z)
      if (below === BlockType.stone) {
        context.setBlock(x, y - 1, z, caveBiome.floorBlock)
      }
    }
  }

  private executeLegacy(context: GenerationContext): void {
    const { biomes } = context.worldDef

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])

        // Find matching biome range
        const biomeRange = biomes.ranges.find(range =>
          height >= range.elevationRange[0] && height < range.elevationRange[1]
        )

        if (!biomeRange) continue

        // Apply surface block
        context.setBlock(x, height, z, resolveBlockType(biomeRange.surface))

        // Apply subsurface blocks (3 blocks deep)
        const subsurfaceBlockType = resolveBlockType(biomeRange.subsurface)
        for (let depth = 1; depth <= 3; depth++) {
          const y = height - depth
          context.setBlock(x, y, z, subsurfaceBlockType)
        }
      }
    }
  }
}
