import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise3D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

export class CavePass implements GenerationPass {
  readonly name = 'CavePass'

  // Maximum Y for caves - must reach INTO terrain, not below it
  // Terrain baseHeight=60, amplitude=25 means ground is roughly Y=35-85
  // Caves should carve from Y=10 up to Y=55 to be inside the terrain
  private readonly CAVE_MAX_Y = 55

  // Lighting configuration
  private readonly LIGHT_SPACING = 12  // Place lights every N blocks along tunnels
  private readonly CAVERN_LIGHT_DENSITY = 0.03  // 3% of cavern floor gets lights

  execute(context: GenerationContext): void {
    // Generate cheese caves (large caverns)
    this.generateCheeseCaves(context)

    // Generate spaghetti caves (winding tunnels)
    this.generateSpaghettiCaves(context)

    // Add ambient lighting to carved caves
    this.addCaveLighting(context)

    // Rebuild surface map (caves changed what's "surface")
    this.rebuildSurfaceMap(context)
  }

  private generateCheeseCaves(context: GenerationContext): void {
    const noise3D = createNoise3D(() => context.seed + 1000)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const minY = 10   // Don't carve too low
        const maxY = this.CAVE_MAX_Y  // Caves up to Y=55

        for (let y = minY; y < maxY; y++) {
          const worldX = context.chunkCoord.x * 24 + x
          const worldZ = context.chunkCoord.z * 24 + z

          // 3D density noise - only carve if there's solid block here
          const currentBlock = context.getBlock(x, y, z)
          if (currentBlock === BlockType.air || currentBlock === BlockType.water) continue

          const density = noise3D(worldX * 0.04, y * 0.04, worldZ * 0.04)

          // Threshold: 0.6 creates larger caves (was 0.65)
          if (density > 0.6) {
            context.setBlock(x, y, z, BlockType.air)
            context.markCave(x, y, z)
          }
        }
      }
    }
  }

  private generateSpaghettiCaves(context: GenerationContext): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 31 + context.chunkCoord.z * 17 + 2000)

    // Density: 5% of chunks get spaghetti caves (increased for more caves)
    if (rng.next() > 0.05) return

    const startX = rng.int(0, 23)
    const startZ = rng.int(0, 23)
    // Start in the middle of the cave zone (Y=20 to Y=50)
    const startY = rng.int(20, this.CAVE_MAX_Y - 5)

    // Tunnel radius 4-8 blocks
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

      // Place light every LIGHT_SPACING steps along the tunnel
      if (step % this.LIGHT_SPACING === 0) {
        const lx = Math.floor(x)
        const ly = Math.floor(y)
        const lz = Math.floor(z)
        if (lx >= 0 && lx < 24 && lz >= 0 && lz < 24 && ly >= 10 && ly < this.CAVE_MAX_Y) {
          // Place glowstone on the floor of the tunnel
          context.setBlock(lx, ly, lz, BlockType.glowstone)
        }
      }

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

      // Clamp Y to valid cave range
      y = Math.max(15, Math.min(this.CAVE_MAX_Y - 3, y))

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
    const minY = Math.max(10, Math.floor(cy - radius))  // Don't carve below Y=10
    const minZ = Math.max(0, Math.floor(cz - radius))
    const maxZ = Math.min(23, Math.ceil(cz + radius))

    // Cap at CAVE_MAX_Y to stay within terrain
    const maxY = Math.min(this.CAVE_MAX_Y, Math.ceil(cy + radius))

    // Pre-compute squared radius to avoid sqrt in hot loop
    const radiusSq = radius * radius

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const dx = x - cx
          const dy = y - cy
          const dz = z - cz
          const distanceSq = dx*dx + dy*dy + dz*dz

          if (distanceSq <= radiusSq) {
            context.setBlock(x, y, z, BlockType.air)
            context.markCave(x, y, z)
          }
        }
      }
    }
  }

  /**
   * Add ambient lighting to carved cave spaces.
   * Places glowstone on cave floors at regular intervals.
   */
  private addCaveLighting(context: GenerationContext): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 101 + context.chunkCoord.z * 53 + 5000)
    let lightsPlaced = 0
    let caveBlocksFound = 0
    let floorPositionsFound = 0

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        for (let y = 10; y < this.CAVE_MAX_Y; y++) {
          // Check if this is a cave air block
          if (!context.isCave(x, y, z)) continue
          caveBlocksFound++

          if (context.getBlock(x, y, z) !== BlockType.air) continue

          // Check if floor below is solid (this is a floor position)
          const blockBelow = context.getBlock(x, y - 1, z)
          const isFloor = blockBelow !== BlockType.air && blockBelow !== BlockType.water

          if (isFloor) {
            floorPositionsFound++
            // Deterministic spacing based on world coordinates
            const worldX = context.chunkCoord.x * 24 + x
            const worldZ = context.chunkCoord.z * 24 + z

            // Grid-based placement for regular spacing
            const atGridPoint = (worldX % this.LIGHT_SPACING === 0) && (worldZ % this.LIGHT_SPACING === 0)

            // Also add some random lights for organic distribution
            const randomLight = rng.next() < this.CAVERN_LIGHT_DENSITY

            if (atGridPoint || randomLight) {
              // Place glowstone on the solid floor (not in the air)
              context.setBlock(x, y - 1, z, BlockType.glowstone)
              lightsPlaced++
            }
          }
        }
      }
    }

    // Only log when lights are placed (reduces noise)
    if (lightsPlaced > 0) {
      console.log(`🕯️  CavePass chunk (${context.chunkCoord.x}, ${context.chunkCoord.z}): ${lightsPlaced} lights placed`)
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
