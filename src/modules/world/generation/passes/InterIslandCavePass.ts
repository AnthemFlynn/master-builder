import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { IslandConfig } from '../OrganicIslandGenerator'
import { createNoise2D, createNoise3D } from 'simplex-noise'

/**
 * InterIslandCavePass - Creates connected cave networks between islands
 *
 * Features:
 * - One visible cave entrance per island (on slope facing center)
 * - Underground highway ring connecting all islands
 * - Maze-like branching tunnels
 * - All tunnels below seabed (Y < 40)
 */
export class InterIslandCavePass implements GenerationPass {
  readonly name = 'InterIslandCavePass'

  // Tunnel depth constants
  private readonly HIGHWAY_Y = 20        // Main tunnel depth
  private readonly ENTRANCE_Y = 50       // Where entrance meets surface
  private readonly TUNNEL_RADIUS = 4     // Main highway width
  private readonly BRANCH_RADIUS = 2.5   // Side tunnel width

  execute(context: GenerationContext): void {
    const islands = context.getIslandConfigs?.() ?? []
    if (islands.length < 2) return

    // For each chunk, check if it intersects any tunnels
    this.carveHighwayRing(context, islands)
    this.carveBranchTunnels(context, islands)
    this.carveEntranceShafts(context, islands)
  }

  /**
   * Carve the main circular highway connecting all islands
   */
  private carveHighwayRing(context: GenerationContext, islands: IslandConfig[]): void {
    const chunkWorldX = context.chunkCoord.x * 24
    const chunkWorldZ = context.chunkCoord.z * 24

    // Ring parameters - slightly inside the island ring
    const ringRadius = 100  // Islands are at 120, tunnels at 100
    const ringCenter = { x: 0, z: 0 }  // Archipelago center

    // Noise for tunnel variation
    const waveNoise = createNoise2D(() => context.seed + 8000)

    for (let lx = 0; lx < 24; lx++) {
      for (let lz = 0; lz < 24; lz++) {
        const worldX = chunkWorldX + lx
        const worldZ = chunkWorldZ + lz

        // Distance from ring center
        const dx = worldX - ringCenter.x
        const dz = worldZ - ringCenter.z
        const distFromCenter = Math.sqrt(dx * dx + dz * dz)

        // Angle-based noise for organic feel
        const angle = Math.atan2(dz, dx)
        const waveOffset = waveNoise(angle * 2, 0) * 15

        // Distance from the ring path
        const distFromRing = Math.abs(distFromCenter - (ringRadius + waveOffset))

        // Carve if close to ring path
        if (distFromRing < this.TUNNEL_RADIUS) {
          // Vertical variation
          const yOffset = waveNoise(worldX * 0.02, worldZ * 0.02) * 3
          const tunnelY = Math.floor(this.HIGHWAY_Y + yOffset)

          // Carve tunnel cross-section
          for (let y = tunnelY - 3; y <= tunnelY + 3; y++) {
            if (y < 5 || y > 40) continue // Stay in valid range

            const dy = y - tunnelY
            const vertDist = Math.abs(dy) / 3
            const effectiveRadius = this.TUNNEL_RADIUS * (1 - vertDist * 0.3)

            if (distFromRing < effectiveRadius) {
              const currentBlock = context.getBlock(lx, y, lz)
              // Only carve through solid blocks (not air)
              if (currentBlock !== BlockType.air && currentBlock !== BlockType.water) {
                context.setBlock(lx, y, lz, BlockType.air)
                context.markCave(lx, y, lz)
              }
            }
          }
        }
      }
    }
  }

  /**
   * Carve branching tunnels from ring to each island and maze connections
   */
  private carveBranchTunnels(context: GenerationContext, islands: IslandConfig[]): void {
    const chunkWorldX = context.chunkCoord.x * 24
    const chunkWorldZ = context.chunkCoord.z * 24
    const noise3D = createNoise3D(() => context.seed + 9000)

    for (const island of islands) {
      // Branch from ring (radius 100) to island entrance (radius ~50 from island center)
      const ringRadius = 100
      const entranceRadius = 40  // How far from island center the entrance is

      // Calculate branch line from ring to island
      const angle = Math.atan2(island.centerZ, island.centerX)

      // Ring point
      const ringX = Math.cos(angle) * ringRadius
      const ringZ = Math.sin(angle) * ringRadius

      // Entrance point (closer to island center)
      const entranceX = island.centerX - Math.cos(angle) * entranceRadius
      const entranceZ = island.centerZ - Math.sin(angle) * entranceRadius

      // Check if this chunk intersects the branch tunnel
      for (let lx = 0; lx < 24; lx++) {
        for (let lz = 0; lz < 24; lz++) {
          const worldX = chunkWorldX + lx
          const worldZ = chunkWorldZ + lz

          // Distance from branch line segment
          const distFromBranch = this.distanceToLineSegment(
            worldX, worldZ,
            ringX, ringZ,
            entranceX, entranceZ
          )

          // Noise-based variation
          const noiseVal = noise3D(worldX * 0.05, this.HIGHWAY_Y * 0.1, worldZ * 0.05)
          const effectiveRadius = this.BRANCH_RADIUS + noiseVal * 1.5

          if (distFromBranch < effectiveRadius) {
            // Gradual rise from ring (Y=20) toward entrance (Y=30)
            const t = this.getParameterOnLine(worldX, worldZ, ringX, ringZ, entranceX, entranceZ)
            const baseY = this.HIGHWAY_Y + t * 10  // Rise from 20 to 30
            const yOffset = noise3D(worldX * 0.03, 0, worldZ * 0.03) * 2
            const tunnelY = Math.floor(baseY + yOffset)

            // Carve tunnel
            for (let y = tunnelY - 2; y <= tunnelY + 2; y++) {
              if (y < 5 || y > 45) continue

              const dy = Math.abs(y - tunnelY)
              if (dy <= 2) {
                const currentBlock = context.getBlock(lx, y, lz)
                if (currentBlock !== BlockType.air && currentBlock !== BlockType.water) {
                  context.setBlock(lx, y, lz, BlockType.air)
                  context.markCave(lx, y, lz)
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Carve entrance shafts from surface down to branch tunnels
   */
  private carveEntranceShafts(context: GenerationContext, islands: IslandConfig[]): void {
    const chunkWorldX = context.chunkCoord.x * 24
    const chunkWorldZ = context.chunkCoord.z * 24

    for (const island of islands) {
      // Entrance location: on slope facing archipelago center
      const angle = Math.atan2(island.centerZ, island.centerX)
      const entranceRadius = 40  // Distance from island center

      const entranceX = island.centerX - Math.cos(angle) * entranceRadius
      const entranceZ = island.centerZ - Math.sin(angle) * entranceRadius

      // Check if entrance is in this chunk
      const localX = Math.floor(entranceX - chunkWorldX)
      const localZ = Math.floor(entranceZ - chunkWorldZ)

      if (localX >= -3 && localX < 27 && localZ >= -3 && localZ < 27) {
        // Find surface height at entrance location
        const surfaceY = this.findSurfaceAt(context, localX, localZ)

        if (surfaceY > 30) {  // Only if above tunnel level
          // Carve entrance shaft
          this.carveEntranceOpening(context, localX, localZ, surfaceY, angle)
        }
      }
    }
  }

  /**
   * Carve the actual entrance opening - a sloped passage into the hillside
   */
  private carveEntranceOpening(
    context: GenerationContext,
    centerX: number,
    centerZ: number,
    surfaceY: number,
    facingAngle: number
  ): void {
    const entranceWidth = 4
    const entranceHeight = 4

    // Direction into the hill (opposite of facing angle)
    const intoHillX = Math.cos(facingAngle)
    const intoHillZ = Math.sin(facingAngle)

    // Carve a sloping entrance passage
    for (let depth = 0; depth < 20; depth++) {
      const y = Math.floor(surfaceY - depth * 0.8)  // Slope down
      if (y < 30) break  // Stop when we reach tunnel level

      const x = Math.floor(centerX + intoHillX * depth)
      const z = Math.floor(centerZ + intoHillZ * depth)

      // Carve a rectangular passage
      for (let dx = -entranceWidth/2; dx <= entranceWidth/2; dx++) {
        for (let dz = -entranceWidth/2; dz <= entranceWidth/2; dz++) {
          for (let dy = 0; dy < entranceHeight; dy++) {
            const lx = x + Math.floor(dx * Math.abs(Math.sin(facingAngle)) + dz * Math.abs(Math.cos(facingAngle)))
            const lz = z + Math.floor(dx * Math.abs(Math.cos(facingAngle)) + dz * Math.abs(Math.sin(facingAngle)))
            const ly = y + dy

            if (lx >= 0 && lx < 24 && lz >= 0 && lz < 24 && ly > 5 && ly < 200) {
              const currentBlock = context.getBlock(lx, ly, lz)
              if (currentBlock !== BlockType.air && currentBlock !== BlockType.water) {
                context.setBlock(lx, ly, lz, BlockType.air)
                context.markCave(lx, ly, lz)
              }
            }
          }
        }
      }
    }

    // Continue with vertical shaft to connect to tunnel
    const shaftX = Math.floor(centerX + intoHillX * 15)
    const shaftZ = Math.floor(centerZ + intoHillZ * 15)
    const shaftTopY = Math.floor(surfaceY - 15 * 0.8)

    for (let y = shaftTopY; y >= 25; y--) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const lx = shaftX + dx
          const lz = shaftZ + dz
          if (lx >= 0 && lx < 24 && lz >= 0 && lz < 24) {
            const currentBlock = context.getBlock(lx, y, lz)
            if (currentBlock !== BlockType.air && currentBlock !== BlockType.water) {
              context.setBlock(lx, y, lz, BlockType.air)
              context.markCave(lx, y, lz)
            }
          }
        }
      }
    }
  }

  private findSurfaceAt(context: GenerationContext, lx: number, lz: number): number {
    // Clamp to valid range
    const x = Math.max(0, Math.min(23, lx))
    const z = Math.max(0, Math.min(23, lz))

    for (let y = 200; y >= 1; y--) {
      const block = context.getBlock(x, y, z)
      if (block !== BlockType.air && block !== BlockType.water) {
        return y
      }
    }
    return 63  // Sea level fallback
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(
    px: number, pz: number,
    ax: number, az: number,
    bx: number, bz: number
  ): number {
    const abx = bx - ax
    const abz = bz - az
    const apx = px - ax
    const apz = pz - az

    const ab2 = abx * abx + abz * abz
    if (ab2 === 0) return Math.sqrt(apx * apx + apz * apz)

    const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / ab2))
    const projX = ax + t * abx
    const projZ = az + t * abz

    return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2)
  }

  /**
   * Get parameter t (0-1) for closest point on line segment
   */
  private getParameterOnLine(
    px: number, pz: number,
    ax: number, az: number,
    bx: number, bz: number
  ): number {
    const abx = bx - ax
    const abz = bz - az
    const apx = px - ax
    const apz = pz - az

    const ab2 = abx * abx + abz * abz
    if (ab2 === 0) return 0

    return Math.max(0, Math.min(1, (apx * abx + apz * abz) / ab2))
  }
}
