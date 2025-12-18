import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise3D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

export class CavePass implements GenerationPass {
  readonly name = 'CavePass'

  execute(context: GenerationContext): void {
    // Generate cheese caves (large caverns)
    this.generateCheeseCaves(context)

    // Generate spaghetti caves (winding tunnels)
    this.generateSpaghettiCaves(context)

    // Rebuild surface map (caves changed what's "surface")
    this.rebuildSurfaceMap(context)
  }

  // Maximum Y for caves - well below ocean floor (35) to ensure caves are truly underground
  private readonly CAVE_MAX_Y = 25

  private generateCheeseCaves(context: GenerationContext): void {
    const noise3D = createNoise3D(() => context.seed + 1000)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const minY = 5   // Don't carve near bedrock
        const maxY = this.CAVE_MAX_Y  // Hard cap - caves stay deep underground

        for (let y = minY; y < maxY; y++) {
          const worldX = context.chunkCoord.x * 24 + x
          const worldZ = context.chunkCoord.z * 24 + z

          // 3D density noise
          const density = noise3D(worldX * 0.04, y * 0.04, worldZ * 0.04)

          // Threshold: 0.65 creates ~35% caves (balanced)
          if (density > 0.65) {
            context.setBlock(x, y, z, BlockType.air)
            context.markCave(x, y, z)
          }
        }
      }
    }
  }

  private generateSpaghettiCaves(context: GenerationContext): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 31 + context.chunkCoord.z * 17 + 2000)

    // Original density: 0.02 (2% of chunks)
    if (rng.next() > 0.02) return

    const startX = rng.int(0, 23)
    const startZ = rng.int(0, 23)
    // Start deep underground - between Y=10 and CAVE_MAX_Y
    const startY = rng.int(10, this.CAVE_MAX_Y - 5)

    // Smaller radius to fit in deep cave zone (radius 4-8)
    const radius = rng.clampedGaussian(6, 1, 4, 8)

    this.carveWormTunnel(context, startX, startY, startZ, {
      length: rng.int(30, 60),
      radius: radius,
      windingFactor: 0.75
    })
  }

  private carveWormTunnel(
    context: GenerationContext,
    startX: number,
    startY: number,
    startZ: number,
    config: { length: number; radius: number; windingFactor: number }
  ): void {
    const noise3D = createNoise3D(() => context.seed + startX + startY + startZ + 3000)

    let x = startX
    let y = startY
    let z = startZ
    let dirX = (Math.random() - 0.5) * 2
    let dirY = (Math.random() - 0.5)
    let dirZ = (Math.random() - 0.5) * 2

    for (let step = 0; step < config.length; step++) {
      // Carve sphere at current position
      this.carveSphere(context, x, y, z, config.radius)

      // Update direction with 3D noise (winding)
      const noiseVal = noise3D(x * 0.1, y * 0.1, z * 0.1)
      dirX += noiseVal * config.windingFactor
      dirY += noise3D(y * 0.1, z * 0.1, x * 0.1) * config.windingFactor * 0.5
      dirZ += noise3D(z * 0.1, x * 0.1, y * 0.1) * config.windingFactor

      // Normalize direction
      const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ)
      if (len > 0) {
        dirX /= len
        dirY /= len
        dirZ /= len
      }

      // Move worm
      x += dirX
      y += dirY
      z += dirZ

      // Clamp Y to valid cave range - hard cap at CAVE_MAX_Y (no surface checks needed)
      y = Math.max(8, Math.min(this.CAVE_MAX_Y - 3, y))

      // Stop if worm leaves chunk
      if (x < -config.radius || x >= 24 + config.radius ||
          z < -config.radius || z >= 24 + config.radius) {
        break
      }
    }
  }

  private carveSphere(context: GenerationContext, cx: number, cy: number, cz: number, radius: number): void {
    const minX = Math.max(0, Math.floor(cx - radius))
    const maxX = Math.min(23, Math.ceil(cx + radius))
    const minY = Math.max(5, Math.floor(cy - radius))  // Don't carve below Y=5
    const minZ = Math.max(0, Math.floor(cz - radius))
    const maxZ = Math.min(23, Math.ceil(cz + radius))

    // Hard cap at CAVE_MAX_Y - no expensive surface height checks needed
    // Caves are constrained to deep underground (below ocean floor)
    const maxY = Math.min(this.CAVE_MAX_Y, Math.ceil(cy + radius))

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const dx = x - cx
          const dy = y - cy
          const dz = z - cz
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)

          if (distance <= radius) {
            context.setBlock(x, y, z, BlockType.air)
            context.markCave(x, y, z)
          }
        }
      }
    }
  }

  private rebuildSurfaceMap(context: GenerationContext): void {
    // After carving caves, find real surface at each X,Z
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.updateSurfaceAt(x, z)
      }
    }
  }
}
