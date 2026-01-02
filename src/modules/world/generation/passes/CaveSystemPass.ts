import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise3D, NoiseFunction3D } from 'simplex-noise'

/**
 * CaveSystemPass - Minecraft 1.18-style noise caves (optimized)
 *
 * Uses spaghetti cave algorithm: abs(n1) + abs(n2) < threshold
 * Creates tunnel-like shapes where two noise fields cross zero.
 *
 * Three Layers (all below ocean floor Y=45):
 * - Upper (Y=35-45): Obsidian accents
 * - Middle (Y=20-35): Crystal grottos with glowstone
 * - Lower (Y=10-20): Water pools
 *
 * Performance: ~2 noise calls per block (vs old CavePass's 1)
 * but creates much better connected tunnels.
 */
export class CaveSystemPass implements GenerationPass {
  readonly name = 'CaveSystemPass'

  // Y ranges (below ocean floor at Y=45)
  private readonly CAVE_MIN = 10
  private readonly CAVE_MAX = 45
  private readonly MIDDLE_Y = 28  // Transition point for decorations

  // Cached noise (created once per worker)
  private noise1: NoiseFunction3D | null = null
  private noise2: NoiseFunction3D | null = null
  private cachedSeed: number | null = null

  // Spaghetti parameters
  private readonly FREQ = 0.035           // Noise frequency
  private readonly THRESHOLD = 0.12       // Cave threshold (lower = more caves)
  private readonly Y_STRETCH = 1.3        // Stretch Y for horizontal tunnels

  execute(context: GenerationContext): void {
    const chunkX = context.chunkCoord.x
    const chunkZ = context.chunkCoord.z
    const worldX = chunkX * 24
    const worldZ = chunkZ * 24

    // Initialize noise (once per seed)
    if (this.cachedSeed !== context.seed) {
      this.noise1 = createNoise3D(() => context.seed + 10001)
      this.noise2 = createNoise3D(() => context.seed + 10002)
      this.cachedSeed = context.seed
    }

    const noise1 = this.noise1!
    const noise2 = this.noise2!

    // Carve caves
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const wx = worldX + x
        const wz = worldZ + z
        const terrainHeight = context.heightMap[x][z]

        // Only carve below terrain and below ocean floor
        const maxY = Math.min(this.CAVE_MAX, terrainHeight - 3)

        for (let y = this.CAVE_MIN; y <= maxY; y++) {
          // Spaghetti cave check: 2 noise evaluations
          const n1 = noise1(
            wx * this.FREQ,
            y * this.FREQ * this.Y_STRETCH,
            wz * this.FREQ
          )
          const n2 = noise2(
            wx * this.FREQ,
            y * this.FREQ * this.Y_STRETCH,
            wz * this.FREQ
          )

          const caveValue = Math.abs(n1) + Math.abs(n2)

          if (caveValue < this.THRESHOLD) {
            const current = context.getBlock(x, y, z)

            // Don't carve air, water, or bedrock
            if (current !== BlockType.air &&
                current !== BlockType.water &&
                current !== BlockType.bedrock) {
              context.setBlock(x, y, z, BlockType.air)
              context.markCave(x, y, z)
            }
          }
        }
      }
    }

    // Add sparse decorations (every 6 blocks, much cheaper)
    this.addDecorations(context, worldX, worldZ)
  }

  /**
   * Add decorations to carved caves (sparse check for performance)
   */
  private addDecorations(
    context: GenerationContext,
    worldX: number,
    worldZ: number
  ): void {
    // Only check every 6th position for decorations
    for (let x = 0; x < 24; x += 2) {
      for (let z = 0; z < 24; z += 2) {
        // Use position-based pseudo-random for decoration placement
        const wx = worldX + x
        const wz = worldZ + z
        const hash = ((wx * 73856093) ^ (wz * 19349663)) >>> 0

        // Only decorate ~25% of checked positions
        if ((hash % 4) !== 0) continue

        for (let y = this.CAVE_MIN; y <= this.CAVE_MAX; y++) {
          if (!context.isCave(x, y, z)) continue

          const below = y > 0 ? context.getBlock(x, y - 1, z) : BlockType.bedrock

          // Only decorate on floors
          if (below === BlockType.air || below === BlockType.water) continue

          // Layer-based decoration
          if (y < 18) {
            // Lower layer: water pools
            if ((hash % 8) === 0) {
              context.setBlock(x, y, z, BlockType.water)
            }
          } else if (y < this.MIDDLE_Y) {
            // Middle layer: glowstone crystals
            context.setBlock(x, y, z, BlockType.glowstone)
          } else {
            // Upper layer: obsidian
            if ((hash % 3) === 0) {
              context.setBlock(x, y - 1, z, BlockType.obsidian)
            }
          }
          break // Only one decoration per column
        }
      }
    }
  }
}
