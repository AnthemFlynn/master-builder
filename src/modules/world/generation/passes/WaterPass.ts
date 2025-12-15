import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'

export class WaterPass implements GenerationPass {
  readonly name = 'WaterPass'
  private readonly seaLevel = 62  // Minecraft standard

  execute(context: GenerationContext): void {
    // Fill water (sea level)
    this.fillSeaLevel(context)

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
