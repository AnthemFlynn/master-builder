import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise3D } from 'simplex-noise'

/**
 * CavePass - Underground cave networks with walkable entrances
 *
 * WORLD GEOMETRY:
 *   Y=100+ : Volcanic peaks
 *   Y=63   : SEA_LEVEL (water surface)
 *   Y=45   : OCEAN_FLOOR
 *   Y=10-40: CAVE ZONE (below ocean floor)
 *   Y=0    : Bedrock
 */
export class CavePass implements GenerationPass {
  readonly name = 'CavePass'

  // ========== MASTER TOGGLE ==========
  private readonly ENABLED = false  // Set to true to enable caves
  // ===================================

  private readonly SEA_LEVEL = 63
  private readonly OCEAN_FLOOR = 45
  private readonly CAVE_CEILING = 40
  private readonly CAVE_FLOOR = 10

  execute(context: GenerationContext): void {
    if (!this.ENABLED) {
      return  // Caves disabled
    }
    const chunkX = context.chunkCoord.x
    const chunkZ = context.chunkCoord.z
    const worldX = chunkX * 24
    const worldZ = chunkZ * 24

    // 3D noise for caves
    const noise = createNoise3D(() => context.seed + 1000)
    let carved = 0

    // 1. Carve underground cave network (Y=10-40)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const wx = worldX + x
        const wz = worldZ + z

        for (let y = this.CAVE_FLOOR; y <= this.CAVE_CEILING; y++) {
          const density = noise(wx * 0.04, y * 0.05, wz * 0.04)

          if (density > 0.3) {
            const current = context.getBlock(x, y, z)
            if (current !== BlockType.air) {
              context.setBlock(x, y, z, BlockType.air)
              context.markCave(x, y, z)
              carved++
            }
          }
        }
      }
    }

    // 2. Create sloped entrances from coastline down to caves
    const entrances = this.createSlopedEntrances(context, worldX, worldZ, noise)

    // 3. Add lighting
    const lights = this.addCaveLighting(context)

    if (carved > 0 || entrances > 0) {
      console.log(`🕳️ CavePass chunk(${chunkX},${chunkZ}): carved=${carved}, entrances=${entrances}, lights=${lights}`)
    }
  }

  /**
   * Create walkable sloped tunnels from coastline areas down to cave network
   */
  private createSlopedEntrances(
    context: GenerationContext,
    worldX: number,
    worldZ: number,
    noise: (x: number, y: number, z: number) => number
  ): number {
    let entranceCount = 0

    // Look for coastline positions (terrain just above sea level)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const wx = worldX + x
        const wz = worldZ + z

        // Only create entrances at grid positions (every 32 blocks)
        if (wx % 32 !== 0 || wz % 32 !== 0) continue

        const terrainHeight = context.heightMap[x][z]

        // Find coastline: terrain between sea level and sea level + 10
        if (terrainHeight <= this.SEA_LEVEL || terrainHeight > this.SEA_LEVEL + 10) continue

        // Check there's a cave below
        let hasCaveBelow = false
        for (let y = this.CAVE_FLOOR; y <= this.CAVE_CEILING; y++) {
          if (context.isCave(x, y, z)) {
            hasCaveBelow = true
            break
          }
        }
        if (!hasCaveBelow) continue

        // Determine tunnel direction (toward island center using noise)
        const dirNoise = noise(wx * 0.1, 0, wz * 0.1)
        const dirIndex = Math.floor((dirNoise + 1) * 2) % 4
        const directions = [
          { dx: 1, dz: 0 },
          { dx: -1, dz: 0 },
          { dx: 0, dz: 1 },
          { dx: 0, dz: -1 }
        ]
        const dir = directions[dirIndex]

        // Carve sloped tunnel: 3 wide, descending 1 block every 2 horizontal
        // From surface (terrainHeight) down to cave ceiling (40)
        const tunnelLength = (terrainHeight - this.CAVE_CEILING) * 2
        let currentY = terrainHeight

        for (let step = 0; step < tunnelLength && currentY >= this.CAVE_CEILING; step++) {
          const tx = x + dir.dx * step
          const tz = z + dir.dz * step

          // Stay in chunk bounds
          if (tx < 0 || tx >= 24 || tz < 0 || tz >= 24) break

          // Descend every 2 steps
          if (step > 0 && step % 2 === 0) {
            currentY--
          }

          // Carve 3x3 tunnel cross-section (perpendicular to direction)
          for (let h = 0; h < 3; h++) {  // Height
            for (let w = -1; w <= 1; w++) {  // Width
              const perpX = dir.dz !== 0 ? tx + w : tx
              const perpZ = dir.dx !== 0 ? tz + w : tz

              if (perpX < 0 || perpX >= 24 || perpZ < 0 || perpZ >= 24) continue

              const carveY = currentY + h
              if (carveY >= this.OCEAN_FLOOR) {
                // Above ocean floor - only carve if inside terrain
                if (carveY <= context.heightMap[perpX][perpZ]) {
                  context.setBlock(perpX, carveY, perpZ, BlockType.air)
                }
              } else {
                // Below ocean floor - safe to carve
                context.setBlock(perpX, carveY, perpZ, BlockType.air)
              }
            }
          }
        }

        // Mark entrance with jack-o-lantern
        context.setBlock(x, terrainHeight + 1, z, BlockType.jack_o_lantern)
        entranceCount++
      }
    }

    return entranceCount
  }

  /**
   * Add glowstone lighting on cave floors
   */
  private addCaveLighting(context: GenerationContext): number {
    let lightCount = 0

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        // Lights every 6 blocks
        if ((x + z) % 6 !== 0) continue

        for (let y = this.CAVE_FLOOR; y <= this.CAVE_CEILING; y++) {
          if (context.isCave(x, y, z)) {
            const below = context.getBlock(x, y - 1, z)
            if (below !== BlockType.air) {
              context.setBlock(x, y, z, BlockType.glowstone)
              lightCount++
              break
            }
          }
        }
      }
    }

    return lightCount
  }
}
