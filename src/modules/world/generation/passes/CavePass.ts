import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise3D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

export class CavePass implements GenerationPass {
  readonly name = 'CavePass'

  // Cave Y range - must be BELOW ocean floor (45) but above bedrock
  // Sea level = 63, Ocean floor = 45
  // Caves should carve from Y=10 up to Y=42 (safely below ocean floor)
  private readonly CAVE_MAX_Y = 42

  // Lighting configuration
  private readonly LIGHT_SPACING = 12  // Place lights every N blocks along tunnels
  private readonly CAVERN_LIGHT_DENSITY = 0.03  // 3% of cavern floor gets lights

  execute(context: GenerationContext): void {
    // Generate cheese caves (large caverns)
    this.generateCheeseCaves(context)

    // Generate spaghetti caves (winding tunnels)
    this.generateSpaghettiCaves(context)

    // Create surface entrances to caves
    this.generateCaveEntrances(context)

    // Add ambient lighting to carved caves
    this.addCaveLighting(context)

    // Rebuild surface map (caves changed what's "surface")
    this.rebuildSurfaceMap(context)
  }

  private generateCheeseCaves(context: GenerationContext): void {
    const noise3D = createNoise3D(() => context.seed + 1000)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        // Get terrain surface height at this position
        const terrainHeight = context.heightMap[x][z]

        // Caves go from Y=10 up to 20 blocks below surface (but not into water)
        const minY = 10
        const maxY = Math.min(terrainHeight - 8, this.CAVE_MAX_Y)  // Stay 8 blocks below surface

        if (maxY <= minY) continue  // No room for caves here

        for (let y = minY; y < maxY; y++) {
          const worldX = context.chunkCoord.x * 24 + x
          const worldZ = context.chunkCoord.z * 24 + z

          // 3D density noise - only carve if there's solid block here
          const currentBlock = context.getBlock(x, y, z)
          if (currentBlock === BlockType.air || currentBlock === BlockType.water) continue

          const density = noise3D(worldX * 0.04, y * 0.04, worldZ * 0.04)

          // Threshold: 0.6 creates larger caves
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

    // Density: 5% of chunks get spaghetti caves
    if (rng.next() > 0.05) return

    const startX = rng.int(0, 23)
    const startZ = rng.int(0, 23)

    // Get terrain height at start point
    const terrainHeight = context.heightMap[startX][startZ]
    const maxCaveY = Math.min(terrainHeight - 8, this.CAVE_MAX_Y)

    if (maxCaveY < 20) return  // Not enough room for caves

    // Start between Y=15 and maxCaveY
    const startY = rng.int(15, maxCaveY - 5)

    // Tunnel radius 4-8 blocks
    const radius = rng.clampedGaussian(6, 1, 4, 8)

    this.carveWormTunnel(context, startX, startY, startZ, {
      length: rng.int(30, 60),
      radius: radius,
      windingFactor: 0.75,
      maxY: maxCaveY
    })
  }

  /**
   * Generate surface entrances to caves.
   * Scans for cave air blocks and creates sloped tunnels from surface.
   */
  private generateCaveEntrances(context: GenerationContext): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 73 + context.chunkCoord.z * 29 + 4000)

    // ~15% of chunks get a cave entrance
    if (rng.next() > 0.15) return

    // Find a cave position to connect to
    let caveX = -1, caveY = -1, caveZ = -1

    // Search for a cave air block
    for (let attempts = 0; attempts < 50; attempts++) {
      const testX = rng.int(4, 19)  // Stay away from edges
      const testZ = rng.int(4, 19)
      const terrainHeight = context.heightMap[testX][testZ]

      // Look for cave air below terrain
      for (let y = Math.min(terrainHeight - 10, this.CAVE_MAX_Y - 5); y >= 15; y--) {
        if (context.isCave(testX, y, testZ) && context.getBlock(testX, y, testZ) === BlockType.air) {
          caveX = testX
          caveY = y
          caveZ = testZ
          break
        }
      }
      if (caveX >= 0) break
    }

    // No cave found in this chunk
    if (caveX < 0) return

    const terrainHeight = context.heightMap[caveX][caveZ]

    // Carve a sloped entrance from surface down to cave
    const entranceRadius = 2
    let y = terrainHeight
    let x = caveX
    let z = caveZ

    // Carve downward at an angle until we reach the cave
    while (y > caveY) {
      // Carve a small sphere at current position
      for (let dx = -entranceRadius; dx <= entranceRadius; dx++) {
        for (let dy = -entranceRadius; dy <= entranceRadius; dy++) {
          for (let dz = -entranceRadius; dz <= entranceRadius; dz++) {
            const nx = x + dx
            const ny = y + dy
            const nz = z + dz
            if (nx < 0 || nx >= 24 || nz < 0 || nz >= 24 || ny < 10) continue

            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
            if (dist <= entranceRadius) {
              context.setBlock(nx, ny, nz, BlockType.air)
              context.markCave(nx, ny, nz)
            }
          }
        }
      }

      // Move down and slightly toward cave center
      y -= 1
      // Slight horizontal drift toward cave position
      if (y > caveY + 3) {
        x += (caveX - x) * 0.1
        z += (caveZ - z) * 0.1
      }
    }

    // Place jack-o-lantern at entrance for visibility
    const entranceY = terrainHeight + 1
    if (caveX >= 0 && caveX < 24 && caveZ >= 0 && caveZ < 24) {
      context.setBlock(caveX, entranceY, caveZ, BlockType.jack_o_lantern)
    }
  }

  private carveWormTunnel(
    context: GenerationContext,
    startX: number,
    startY: number,
    startZ: number,
    config: { length: number; radius: number; windingFactor: number; maxY?: number }
  ): void {
    const noise3D = createNoise3D(() => context.seed + startX + startY + startZ + 3000)
    const maxY = config.maxY ?? this.CAVE_MAX_Y

    let x = startX
    let y = startY
    let z = startZ
    let dirX = (Math.random() - 0.5) * 2
    let dirY = (Math.random() - 0.5)
    let dirZ = (Math.random() - 0.5) * 2

    for (let step = 0; step < config.length; step++) {
      // Carve sphere at current position
      this.carveSphere(context, x, y, z, config.radius, maxY)

      // Place light every LIGHT_SPACING steps along the tunnel
      if (step % this.LIGHT_SPACING === 0) {
        const lx = Math.floor(x)
        const ly = Math.floor(y)
        const lz = Math.floor(z)
        if (lx >= 0 && lx < 24 && lz >= 0 && lz < 24 && ly >= 10 && ly < maxY) {
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
      y = Math.max(15, Math.min(maxY - 3, y))

      // Stop if worm leaves chunk
      if (x < -config.radius || x >= 24 + config.radius ||
          z < -config.radius || z >= 24 + config.radius) {
        break
      }
    }
  }

  private carveSphere(context: GenerationContext, cx: number, cy: number, cz: number, radius: number, caveMaxY?: number): void {
    const minX = Math.max(0, Math.floor(cx - radius))
    const maxX = Math.min(23, Math.ceil(cx + radius))
    const minY = Math.max(10, Math.floor(cy - radius))  // Don't carve below Y=10
    const minZ = Math.max(0, Math.floor(cz - radius))
    const maxZ = Math.min(23, Math.ceil(cz + radius))

    // Cap at provided maxY or default CAVE_MAX_Y
    const limitY = caveMaxY ?? this.CAVE_MAX_Y
    const maxY = Math.min(limitY, Math.ceil(cy + radius))

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
