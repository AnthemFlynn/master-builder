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
  private readonly LIGHT_SPACING = 8     // Glowstone every N blocks

  execute(context: GenerationContext): void {
    const islands = context.getIslandConfigs?.() ?? []

    if (islands.length < 2) {
      console.log(`⏭️  InterIslandCavePass: Skipping (only ${islands.length} island(s))`)
      return
    }

    console.log(`🗺️  InterIslandCavePass: Carving network for ${islands.length} islands at chunk (${context.chunkCoord.x}, ${context.chunkCoord.z})`)

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

    let cavesCarved = 0
    let lightsPlaced = 0

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
                cavesCarved++
              }
            }
          }

          // Add wall lights every LIGHT_SPACING blocks along the ring
          // Use angle to determine position on ring for consistent spacing
          const ringPosition = Math.floor(angle * ringRadius / (Math.PI * 2) * 100)
          if (ringPosition % this.LIGHT_SPACING === 0) {
            // Place on the outer wall of the tunnel (away from center)
            const isOuterEdge = distFromRing > this.TUNNEL_RADIUS - 1.5 && distFromRing < this.TUNNEL_RADIUS
            if (isOuterEdge) {
              // Place glowstone at eye level on the wall
              const lightY = tunnelY + 1
              if (lightY > 5 && lightY < 40) {
                context.setBlock(lx, lightY, lz, BlockType.glowstone)
                lightsPlaced++
              }
            }
          }
        }
      }
    }

    if (cavesCarved > 0 || lightsPlaced > 0) {
      console.log(`🛣️  Ring highway at chunk (${context.chunkCoord.x}, ${context.chunkCoord.z}): ${cavesCarved} blocks carved, ${lightsPlaced} lights placed`)
    }
  }

  /**
   * Carve branching tunnels from ring to each island entrance
   */
  private carveBranchTunnels(context: GenerationContext, islands: IslandConfig[]): void {
    const chunkWorldX = context.chunkCoord.x * 24
    const chunkWorldZ = context.chunkCoord.z * 24
    const noise3D = createNoise3D(() => context.seed + 9000)

    let totalBranchesCarved = 0
    let totalBranchLights = 0

    for (let islandIdx = 0; islandIdx < islands.length; islandIdx++) {
      const island = islands[islandIdx]
      // Branch from ring (radius 100) to island entrance
      // Islands are at radius ~120, entrance is 15 blocks from island center toward world center
      // This puts entrance at radius ~105 (between ring at 100 and island at 120)
      const ringRadius = 100
      const entranceOffset = 15  // How far from island center toward world center

      // Calculate branch line from ring to island
      const angle = Math.atan2(island.centerZ, island.centerX)

      // Ring point (on the circular highway)
      const ringX = Math.cos(angle) * ringRadius
      const ringZ = Math.sin(angle) * ringRadius

      // Entrance point (on island slope, between ring and island center)
      // Subtract moves toward world center
      const entranceX = island.centerX - Math.cos(angle) * entranceOffset
      const entranceZ = island.centerZ - Math.sin(angle) * entranceOffset

      let branchCarvesInChunk = 0
      let branchLightsInChunk = 0

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
                  branchCarvesInChunk++
                }
              }
            }

            // Add wall lights along branch tunnels
            // Use distance along tunnel (t) to determine light placement
            const branchLength = Math.sqrt((entranceX - ringX) ** 2 + (entranceZ - ringZ) ** 2)
            const positionAlongBranch = Math.floor(t * branchLength)

            // Place lights every LIGHT_SPACING blocks, on the tunnel edge
            if (positionAlongBranch % this.LIGHT_SPACING === 0) {
              const isEdge = distFromBranch > effectiveRadius - 1 && distFromBranch < effectiveRadius
              if (isEdge) {
                const lightY = tunnelY + 1
                if (lightY > 5 && lightY < 45) {
                  context.setBlock(lx, lightY, lz, BlockType.glowstone)
                  branchLightsInChunk++
                }
              }
            }

            // Add cluster of lights at junction (where t is close to 0, near highway ring)
            if (t < 0.15 && distFromBranch < 1.5) {
              // Place extra lights at junction
              const lightY = tunnelY
              if (lightY > 5 && lightY < 45) {
                context.setBlock(lx, lightY, lz, BlockType.glowstone)
                branchLightsInChunk++
              }
            }
          }
        }
      }

      if (branchCarvesInChunk > 0 || branchLightsInChunk > 0) {
        totalBranchesCarved += branchCarvesInChunk
        totalBranchLights += branchLightsInChunk
        console.log(`🌉 Branch ${islandIdx} at chunk (${context.chunkCoord.x}, ${context.chunkCoord.z}): ${branchCarvesInChunk} blocks, ${branchLightsInChunk} lights`)
      }
    }
  }

  /**
   * Carve entrance shafts from surface down to branch tunnels
   */
  private carveEntranceShafts(context: GenerationContext, islands: IslandConfig[]): void {
    const chunkWorldX = context.chunkCoord.x * 24
    const chunkWorldZ = context.chunkCoord.z * 24

    for (let i = 0; i < islands.length; i++) {
      const island = islands[i]
      // Entrance location: on slope facing archipelago center
      // Must match the entranceOffset used in carveBranchTunnels
      const angle = Math.atan2(island.centerZ, island.centerX)
      const entranceOffset = 15  // Same as in carveBranchTunnels

      const entranceX = island.centerX - Math.cos(angle) * entranceOffset
      const entranceZ = island.centerZ - Math.sin(angle) * entranceOffset

      // Check if entrance is in this chunk
      const localX = Math.floor(entranceX - chunkWorldX)
      const localZ = Math.floor(entranceZ - chunkWorldZ)

      if (localX >= 0 && localX < 24 && localZ >= 0 && localZ < 24) {
        // Find surface height at entrance location
        const surfaceY = this.findSurfaceAt(context, localX, localZ)

        if (surfaceY > 35) {  // Only if above tunnel level
          console.log(`🚪 Cave entrance for island ${i}: world(${entranceX.toFixed(0)}, ${entranceZ.toFixed(0)}) surfaceY=${surfaceY}`)
          // Carve entrance shaft - direction is INTO the hill (toward island center)
          const intoHillAngle = angle  // Toward island center = away from world center
          this.carveEntranceOpening(context, localX, localZ, surfaceY, intoHillAngle, entranceX, entranceZ)
        }
      }
    }
  }

  /**
   * Carve the actual entrance opening - a sloped passage into the hillside
   * Places MASSIVE glowstone beacon towers at the entrance (20 blocks tall)
   */
  private carveEntranceOpening(
    context: GenerationContext,
    centerX: number,
    centerZ: number,
    surfaceY: number,
    facingAngle: number,
    worldEntranceX: number,
    worldEntranceZ: number
  ): void {
    const entranceWidth = 6
    const entranceHeight = 5

    // Direction into the hill (toward island center)
    const intoHillX = Math.cos(facingAngle)
    const intoHillZ = Math.sin(facingAngle)

    // Direction OUT of the hill (facing outward, toward world center)
    const outOfHillX = -intoHillX
    const outOfHillZ = -intoHillZ

    // Place MASSIVE glowstone beacon towers (20 blocks tall!)
    // These should be visible from anywhere on the archipelago
    const BEACON_HEIGHT = 20

    // Center beacon - right at entrance
    if (centerX >= 0 && centerX < 24 && centerZ >= 0 && centerZ < 24) {
      for (let h = 0; h < BEACON_HEIGHT; h++) {
        context.setBlock(centerX, surfaceY + h, centerZ, BlockType.glowstone)
      }
      console.log(`🔦 Placed ${BEACON_HEIGHT}-block glowstone beacon at local (${centerX}, ${centerZ}) Y=${surfaceY}`)
    }

    // Side pillars (perpendicular to entrance direction, 5 blocks apart)
    const markerOffsetX = Math.sin(facingAngle) * 5
    const markerOffsetZ = -Math.cos(facingAngle) * 5

    // Left pillar
    const leftX = Math.floor(centerX + markerOffsetX)
    const leftZ = Math.floor(centerZ + markerOffsetZ)
    if (leftX >= 0 && leftX < 24 && leftZ >= 0 && leftZ < 24) {
      for (let h = 0; h < BEACON_HEIGHT - 5; h++) {
        context.setBlock(leftX, surfaceY + h, leftZ, BlockType.glowstone)
      }
    }

    // Right pillar
    const rightX = Math.floor(centerX - markerOffsetX)
    const rightZ = Math.floor(centerZ - markerOffsetZ)
    if (rightX >= 0 && rightX < 24 && rightZ >= 0 && rightZ < 24) {
      for (let h = 0; h < BEACON_HEIGHT - 5; h++) {
        context.setBlock(rightX, surfaceY + h, rightZ, BlockType.glowstone)
      }
    }

    // Outer beacon (facing outward from island) - even more visible from sea
    const outerX = Math.floor(centerX + outOfHillX * 3)
    const outerZ = Math.floor(centerZ + outOfHillZ * 3)
    if (outerX >= 0 && outerX < 24 && outerZ >= 0 && outerZ < 24) {
      for (let h = 0; h < BEACON_HEIGHT + 5; h++) {
        context.setBlock(outerX, surfaceY + h, outerZ, BlockType.glowstone)
      }
    }

    // Carve a SLOPED PASSAGE from surface down to underground level
    // Slope of 1.5 means we drop 1.5 blocks per block of horizontal depth
    // With surfaceY ~89 and target Y ~30, we need to drop ~59 blocks
    // 59 / 1.5 = ~40 blocks of horizontal depth
    const SLOPE = 1.5
    const MAX_DEPTH = 50
    const TARGET_Y = 28  // Branch tunnels are at Y=25-30

    let lastCarvedY = surfaceY
    let lastCarvedDepth = 0

    for (let depth = -3; depth < MAX_DEPTH; depth++) {
      const y = Math.floor(surfaceY - Math.max(0, depth) * SLOPE)

      // Stop when we reach underground tunnel level
      if (y < TARGET_Y) break

      const x = Math.floor(centerX + intoHillX * depth)
      const z = Math.floor(centerZ + intoHillZ * depth)

      // Carve an arched passage
      for (let w = -entranceWidth/2; w <= entranceWidth/2; w++) {
        const perpX = Math.sin(facingAngle) * w
        const perpZ = -Math.cos(facingAngle) * w

        for (let dy = 0; dy < entranceHeight; dy++) {
          const lx = Math.floor(x + perpX)
          const lz = Math.floor(z + perpZ)
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

      // Add wall lights along the sloped passage every 6 blocks
      if (depth > 0 && depth % 6 === 0) {
        // Place glowstone on the left wall
        const wallOffset = entranceWidth / 2 + 0.5
        const leftWallX = Math.floor(x + Math.sin(facingAngle) * wallOffset)
        const leftWallZ = Math.floor(z - Math.cos(facingAngle) * wallOffset)
        if (leftWallX >= 0 && leftWallX < 24 && leftWallZ >= 0 && leftWallZ < 24) {
          context.setBlock(leftWallX, y + 2, leftWallZ, BlockType.glowstone)
        }

        // Place glowstone on the right wall
        const rightWallX = Math.floor(x - Math.sin(facingAngle) * wallOffset)
        const rightWallZ = Math.floor(z + Math.cos(facingAngle) * wallOffset)
        if (rightWallX >= 0 && rightWallX < 24 && rightWallZ >= 0 && rightWallZ < 24) {
          context.setBlock(rightWallX, y + 2, rightWallZ, BlockType.glowstone)
        }
      }

      lastCarvedY = y
      lastCarvedDepth = depth
    }

    // Vertical shaft at the END of the sloped passage to connect to highway
    // This creates a continuous path: surface → sloped passage → vertical drop → highway
    const shaftX = Math.floor(centerX + intoHillX * lastCarvedDepth)
    const shaftZ = Math.floor(centerZ + intoHillZ * lastCarvedDepth)

    // Carve vertical shaft from where sloped passage ends down to highway level
    for (let y = lastCarvedY; y >= this.HIGHWAY_Y - 2; y--) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
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

      // Add lights on the shaft walls every 4 blocks vertically
      if (y % 4 === 0) {
        // Place glowstone on all 4 walls of the shaft
        const wallPositions = [
          { dx: 3, dz: 0 },   // +X wall
          { dx: -3, dz: 0 },  // -X wall
          { dx: 0, dz: 3 },   // +Z wall
          { dx: 0, dz: -3 }   // -Z wall
        ]
        for (const pos of wallPositions) {
          const lx = shaftX + pos.dx
          const lz = shaftZ + pos.dz
          if (lx >= 0 && lx < 24 && lz >= 0 && lz < 24) {
            context.setBlock(lx, y, lz, BlockType.glowstone)
          }
        }
      }
    }

    console.log(`🚇 Carved entrance: surface Y=${surfaceY} → sloped to Y=${lastCarvedY} at depth=${lastCarvedDepth} → vertical to Y=${this.HIGHWAY_Y}`)
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
