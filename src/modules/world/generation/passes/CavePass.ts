import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise3D } from 'simplex-noise'

/**
 * Simple CavePass - carves basic caves using 3D noise
 * No stalactites, no stalagmites, just air and glowstone
 */
export class CavePass implements GenerationPass {
  readonly name = 'CavePass'

  private readonly SEA_LEVEL = 63
  private readonly CAVE_MIN_Y = 25      // Connect to inter-island highway
  private readonly SURFACE_BUFFER = 10  // Stay below surface

  execute(context: GenerationContext): void {
    const chunkX = context.chunkCoord.x
    const chunkZ = context.chunkCoord.z

    // Sample terrain to understand this chunk
    let landPositions = 0
    let minHeight = 999
    let maxHeight = 0

    for (let x = 0; x < 24; x += 4) {
      for (let z = 0; z < 24; z += 4) {
        const h = context.heightMap[x][z]
        if (h > this.SEA_LEVEL) landPositions++
        minHeight = Math.min(minHeight, h)
        maxHeight = Math.max(maxHeight, h)
      }
    }

    // Skip ocean chunks
    if (landPositions === 0) {
      return
    }

    console.log(`🕳️ CavePass (${chunkX}, ${chunkZ}): terrain ${minHeight}-${maxHeight}, land=${landPositions}/36`)

    // Carve caves using 3D noise
    const carved = this.carveCaves(context)

    // Add simple lighting
    const lights = this.addLighting(context)

    if (carved > 0) {
      console.log(`   → carved ${carved} blocks, placed ${lights} lights`)
    }
  }

  private carveCaves(context: GenerationContext): number {
    const noise = createNoise3D(() => context.seed + 1000)
    const worldX = context.chunkCoord.x * 24
    const worldZ = context.chunkCoord.z * 24
    let carved = 0

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]

        // Only carve on land
        if (terrainHeight <= this.SEA_LEVEL) continue

        const maxY = terrainHeight - this.SURFACE_BUFFER
        const minY = this.CAVE_MIN_Y

        if (maxY <= minY) continue

        for (let y = minY; y < maxY; y++) {
          const wx = worldX + x
          const wz = worldZ + z

          // Simple 3D noise for cave shape
          const density = noise(wx * 0.03, y * 0.03, wz * 0.03)

          // Carve if density is high enough
          if (density > 0.5) {
            const current = context.getBlock(x, y, z)
            if (current !== BlockType.air && current !== BlockType.water) {
              context.setBlock(x, y, z, BlockType.air)
              context.markCave(x, y, z)
              carved++
            }
          }
        }
      }
    }

    return carved
  }

  private addLighting(context: GenerationContext): number {
    let lights = 0
    const spacing = 10

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]
        if (terrainHeight <= this.SEA_LEVEL) continue

        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // Grid-based light placement
        if (worldX % spacing !== 0 || worldZ % spacing !== 0) continue

        // Find cave floor
        for (let y = this.CAVE_MIN_Y; y < terrainHeight - this.SURFACE_BUFFER; y++) {
          if (!context.isCave(x, y, z)) continue
          if (context.getBlock(x, y, z) !== BlockType.air) continue

          // Check for solid floor
          const below = context.getBlock(x, y - 1, z)
          if (below !== BlockType.air && below !== BlockType.water) {
            context.setBlock(x, y - 1, z, BlockType.glowstone)
            lights++
            break // Only one light per column
          }
        }
      }
    }

    return lights
  }
}
