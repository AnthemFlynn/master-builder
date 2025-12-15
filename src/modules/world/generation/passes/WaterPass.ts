import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'

export class WaterPass implements GenerationPass {
  readonly name = 'WaterPass'
  private readonly seaLevel = 62  // Minecraft standard

  execute(context: GenerationContext): void {
    // Fill water (sea level)
    this.fillSeaLevel(context)

    // Create beaches (sand transition near water)
    this.createBeaches(context)

    // Update surface map for water surfaces
    this.updateWaterSurfaces(context)
  }

  private fillSeaLevel(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]

        // Fill air below sea level with water
        for (let y = terrainHeight + 1; y <= this.seaLevel; y++) {
          if (context.getBlock(x, y, z) === BlockType.air) {
            context.setBlock(x, y, z, BlockType.glass)  // Water = glass for now
          }
        }
      }
    }
  }

  private createBeaches(context: GenerationContext): void {
    // Convert terrain near sea level to sand (beaches)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]

        // Beach zone: Y=58 to Y=66 (±4 blocks from sea level)
        const isBeachZone = terrainHeight >= this.seaLevel - 4 &&
                           terrainHeight <= this.seaLevel + 4

        if (isBeachZone) {
          // Convert surface and subsurface to sand
          const surfaceY = Math.min(terrainHeight, this.seaLevel)

          // Surface layer
          if (context.getBlock(x, surfaceY, z) === BlockType.stone) {
            context.setBlock(x, surfaceY, z, BlockType.sand)
          }

          // Subsurface layers (3 blocks)
          for (let depth = 1; depth <= 3; depth++) {
            const y = surfaceY - depth
            if (y > 0 && context.getBlock(x, y, z) === BlockType.stone) {
              context.setBlock(x, y, z, BlockType.sand)
            }
          }
        }
      }
    }
  }

  private updateWaterSurfaces(context: GenerationContext): void {
    // Update surface map to reflect water surfaces
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]

        // If terrain is below sea level, surface is water at sea level
        if (terrainHeight < this.seaLevel) {
          context.surfaceMap.set(`${x},${z}`, {
            y: this.seaLevel,
            blockType: BlockType.glass,  // Water surface
            isCave: false
          })
        }
      }
    }
  }
}
