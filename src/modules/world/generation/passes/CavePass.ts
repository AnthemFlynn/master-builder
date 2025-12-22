import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise3D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

export class CavePass implements GenerationPass {
  readonly name = 'CavePass'

  // World elevation constants (must match OrganicIslandGenerator)
  private readonly SEA_LEVEL = 63

  // Cave range: from Y=20 up to near surface
  // This gives caves plenty of vertical space and connects to highway at Y=25
  private readonly CAVE_MIN_Y = 20
  private readonly CAVE_SURFACE_BUFFER = 8  // Stay this many blocks below surface

  // Lighting configuration
  private readonly LIGHT_SPACING = 12  // Place lights every N blocks along tunnels
  private readonly CAVERN_LIGHT_DENSITY = 0.03  // 3% of cavern floor gets lights

  execute(context: GenerationContext): void {
    const chunkX = context.chunkCoord.x
    const chunkZ = context.chunkCoord.z
    const worldX = chunkX * 24
    const worldZ = chunkZ * 24

    // DIAGNOSTIC: Sample heightmap to understand terrain
    const sampleHeights: number[] = []
    let landCount = 0
    let peakCount = 0
    for (let x = 0; x < 24; x += 6) {
      for (let z = 0; z < 24; z += 6) {
        const h = context.heightMap[x][z]
        sampleHeights.push(h)
        if (h > this.SEA_LEVEL) landCount++
        if (h > 100) peakCount++
      }
    }
    const minH = Math.min(...sampleHeights)
    const maxH = Math.max(...sampleHeights)

    console.log(`🔍 CavePass chunk (${chunkX}, ${chunkZ}) world(${worldX}, ${worldZ}): heights ${minH}-${maxH}, land=${landCount}/16, peaks=${peakCount}/16`)

    // Generate cheese caves (large caverns)
    const cheeseCaves = this.generateCheeseCaves(context)

    // Generate spaghetti caves (winding tunnels)
    const spaghettiCaves = this.generateSpaghettiCaves(context)

    // Create surface entrances to caves
    const entrances = this.generateCaveEntrances(context)

    // Add ambient lighting to carved caves
    const lights = this.addCaveLighting(context)

    // Rebuild surface map (caves changed what's "surface")
    this.rebuildSurfaceMap(context)

    // Summary
    if (cheeseCaves > 0 || spaghettiCaves > 0 || entrances > 0) {
      console.log(`  → Carved: cheese=${cheeseCaves}, spaghetti=${spaghettiCaves}, entrances=${entrances}, lights=${lights}`)
    }
  }

  private generateCheeseCaves(context: GenerationContext): number {
    const noise3D = createNoise3D(() => context.seed + 1000)
    let carved = 0

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]

        // Skip underwater and shallow areas
        if (terrainHeight < this.SEA_LEVEL + 5) continue

        // Cave range: from CAVE_MIN_Y up to surface buffer
        const minY = this.CAVE_MIN_Y
        const maxY = terrainHeight - this.CAVE_SURFACE_BUFFER

        if (maxY <= minY + 5) continue  // Need at least 5 blocks vertical

        for (let y = minY; y < maxY; y++) {
          const worldX = context.chunkCoord.x * 24 + x
          const worldZ = context.chunkCoord.z * 24 + z

          // Only carve through solid blocks
          const currentBlock = context.getBlock(x, y, z)
          if (currentBlock === BlockType.air || currentBlock === BlockType.water) continue

          const density = noise3D(worldX * 0.04, y * 0.04, worldZ * 0.04)

          // Threshold 0.55 for more caves
          if (density > 0.55) {
            context.setBlock(x, y, z, BlockType.air)
            context.markCave(x, y, z)
            carved++
          }
        }
      }
    }
    return carved
  }

  private generateSpaghettiCaves(context: GenerationContext): number {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 31 + context.chunkCoord.z * 17 + 2000)

    // 15% of land chunks get spaghetti caves
    if (rng.next() > 0.15) return 0

    // Find a valid land position to start
    let startX = -1, startZ = -1, terrainHeight = 0
    for (let attempts = 0; attempts < 20; attempts++) {
      const testX = rng.int(4, 19)
      const testZ = rng.int(4, 19)
      const h = context.heightMap[testX][testZ]

      if (h >= this.SEA_LEVEL + 5) {
        startX = testX
        startZ = testZ
        terrainHeight = h
        break
      }
    }

    if (startX < 0) return 0

    const maxCaveY = terrainHeight - this.CAVE_SURFACE_BUFFER
    const minCaveY = this.CAVE_MIN_Y

    if (maxCaveY <= minCaveY + 10) return 0

    // Start in middle of valid range
    const startY = rng.int(minCaveY + 5, Math.max(minCaveY + 6, maxCaveY - 5))

    const radius = rng.clampedGaussian(5, 1, 3, 7)

    return this.carveWormTunnel(context, startX, startY, startZ, {
      length: rng.int(25, 50),
      radius: radius,
      windingFactor: 0.6,
      maxY: maxCaveY
    })
  }

  /**
   * Generate surface entrances to caves.
   */
  private generateCaveEntrances(context: GenerationContext): number {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 73 + context.chunkCoord.z * 29 + 4000)

    // 25% of chunks get an entrance attempt
    if (rng.next() > 0.25) return 0

    // Find a cave position to connect to
    let caveX = -1, caveY = -1, caveZ = -1

    for (let attempts = 0; attempts < 50; attempts++) {
      const testX = rng.int(4, 19)
      const testZ = rng.int(4, 19)
      const terrainHeight = context.heightMap[testX][testZ]

      if (terrainHeight < this.SEA_LEVEL + 5) continue

      // Search from surface down
      for (let y = terrainHeight - this.CAVE_SURFACE_BUFFER; y >= this.CAVE_MIN_Y; y--) {
        if (context.isCave(testX, y, testZ) && context.getBlock(testX, y, testZ) === BlockType.air) {
          caveX = testX
          caveY = y
          caveZ = testZ
          break
        }
      }
      if (caveX >= 0) break
    }

    if (caveX < 0) return 0

    const terrainHeight = context.heightMap[caveX][caveZ]

    // Carve entrance from surface to cave
    const entranceRadius = 2
    let carved = 0
    let y = terrainHeight
    let x = caveX
    let z = caveZ

    while (y > caveY) {
      for (let dx = -entranceRadius; dx <= entranceRadius; dx++) {
        for (let dy = -entranceRadius; dy <= entranceRadius; dy++) {
          for (let dz = -entranceRadius; dz <= entranceRadius; dz++) {
            const nx = Math.floor(x) + dx
            const ny = y + dy
            const nz = Math.floor(z) + dz
            if (nx < 0 || nx >= 24 || nz < 0 || nz >= 24 || ny < this.CAVE_MIN_Y) continue

            if (dx*dx + dy*dy + dz*dz <= entranceRadius * entranceRadius) {
              const current = context.getBlock(nx, ny, nz)
              if (current !== BlockType.air && current !== BlockType.water) {
                context.setBlock(nx, ny, nz, BlockType.air)
                context.markCave(nx, ny, nz)
                carved++
              }
            }
          }
        }
      }
      y -= 1
      if (y > caveY + 3) {
        x += (caveX - x) * 0.1
        z += (caveZ - z) * 0.1
      }
    }

    // Mark entrance with jack-o-lantern
    if (caveX >= 0 && caveX < 24 && caveZ >= 0 && caveZ < 24) {
      context.setBlock(caveX, terrainHeight + 1, caveZ, BlockType.jack_o_lantern)
    }

    return carved > 0 ? 1 : 0
  }

  private carveWormTunnel(
    context: GenerationContext,
    startX: number,
    startY: number,
    startZ: number,
    config: { length: number; radius: number; windingFactor: number; maxY: number }
  ): number {
    const noise3D = createNoise3D(() => context.seed + startX + startY + startZ + 3000)
    const maxY = config.maxY
    let carved = 0

    let x = startX
    let y = startY
    let z = startZ
    let dirX = (Math.random() - 0.5) * 2
    let dirY = (Math.random() - 0.5)
    let dirZ = (Math.random() - 0.5) * 2

    for (let step = 0; step < config.length; step++) {
      carved += this.carveSphere(context, x, y, z, config.radius, maxY)

      // Place light every LIGHT_SPACING steps
      if (step % this.LIGHT_SPACING === 0) {
        const lx = Math.floor(x)
        const ly = Math.floor(y)
        const lz = Math.floor(z)
        if (lx >= 0 && lx < 24 && lz >= 0 && lz < 24 && ly >= this.CAVE_MIN_Y && ly < maxY) {
          context.setBlock(lx, ly, lz, BlockType.glowstone)
        }
      }

      // Update direction with noise
      const noiseVal = noise3D(x * 0.1, y * 0.1, z * 0.1)
      dirX += noiseVal * config.windingFactor
      dirY += noise3D(y * 0.1, z * 0.1, x * 0.1) * config.windingFactor * 0.5
      dirZ += noise3D(z * 0.1, x * 0.1, y * 0.1) * config.windingFactor

      const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ)
      if (len > 0) { dirX /= len; dirY /= len; dirZ /= len }

      x += dirX
      y += dirY
      z += dirZ

      y = Math.max(this.CAVE_MIN_Y + 3, Math.min(maxY - 3, y))

      if (x < -config.radius || x >= 24 + config.radius ||
          z < -config.radius || z >= 24 + config.radius) {
        break
      }
    }
    return carved
  }

  private carveSphere(context: GenerationContext, cx: number, cy: number, cz: number, radius: number, caveMaxY: number): number {
    const minX = Math.max(0, Math.floor(cx - radius))
    const maxX = Math.min(23, Math.ceil(cx + radius))
    const minY = Math.max(this.CAVE_MIN_Y, Math.floor(cy - radius))
    const minZ = Math.max(0, Math.floor(cz - radius))
    const maxZ = Math.min(23, Math.ceil(cz + radius))
    const maxY = Math.min(caveMaxY, Math.ceil(cy + radius))
    const radiusSq = radius * radius
    let carved = 0

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const dx = x - cx
          const dy = y - cy
          const dz = z - cz
          const distanceSq = dx*dx + dy*dy + dz*dz

          if (distanceSq <= radiusSq) {
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

  /**
   * Add ambient lighting to carved cave spaces.
   */
  private addCaveLighting(context: GenerationContext): number {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 101 + context.chunkCoord.z * 53 + 5000)
    let lightsPlaced = 0

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const terrainHeight = context.heightMap[x][z]
        if (terrainHeight < this.SEA_LEVEL + 5) continue

        for (let y = this.CAVE_MIN_Y; y < terrainHeight - this.CAVE_SURFACE_BUFFER; y++) {
          // Check if this is a cave air block
          if (!context.isCave(x, y, z)) continue
          if (context.getBlock(x, y, z) !== BlockType.air) continue

          // Check if floor below is solid (this is a floor position)
          const blockBelow = context.getBlock(x, y - 1, z)
          const isFloor = blockBelow !== BlockType.air && blockBelow !== BlockType.water

          if (isFloor) {
            // Deterministic spacing based on world coordinates
            const worldX = context.chunkCoord.x * 24 + x
            const worldZ = context.chunkCoord.z * 24 + z

            // Grid-based placement for regular spacing
            const atGridPoint = (worldX % this.LIGHT_SPACING === 0) && (worldZ % this.LIGHT_SPACING === 0)

            // Also add some random lights for organic distribution
            const randomLight = rng.next() < this.CAVERN_LIGHT_DENSITY

            if (atGridPoint || randomLight) {
              context.setBlock(x, y - 1, z, BlockType.glowstone)
              lightsPlaced++
            }
          }
        }
      }
    }
    return lightsPlaced
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
