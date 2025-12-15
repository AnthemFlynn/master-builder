import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

export class TreePass implements GenerationPass {
  readonly name = 'TreePass'

  execute(context: GenerationContext): void {
    // Get deterministic tree positions (grid-based with jitter)
    const positions = this.getTreePositions(context.chunkCoord, context.seed, 8)

    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 73 + context.chunkCoord.z * 151 + 7000)

    for (const pos of positions) {
      const biome = context.getBiomeAt(pos.x, pos.z)
      if (!biome?.allowTrees) continue

      // Biome-specific density check (forests 8%, plains 2%)
      if (rng.next() > biome.treeDensity) continue

      // Comprehensive validation
      if (!this.canPlaceTree(context, pos.x, pos.z)) continue

      const surfaceY = context.findSurface(pos.x, pos.z)
      if (surfaceY === null) continue

      this.placeTree(context, pos.x, surfaceY, pos.z, rng)
    }
  }

  private getTreePositions(coord: ChunkCoordinate, seed: number, baseSpacing: number): Array<{x: number, z: number}> {
    const positions: Array<{x: number, z: number}> = []
    const noise = createNoise2D(() => seed + 3000)

    // Grid-based with noise jitter (prevents perfect grid)
    for (let gx = -1; gx < 4; gx++) {
      for (let gz = -1; gz < 4; gz++) {
        const gridX = gx * baseSpacing
        const gridZ = gz * baseSpacing

        // Add jitter (±3 blocks)
        const jitterX = noise(gx, gz) * 3
        const jitterZ = noise(gz, gx) * 3

        const x = Math.floor(gridX + jitterX)
        const z = Math.floor(gridZ + jitterZ)

        // Only include if within chunk bounds
        if (x >= 0 && x < 24 && z >= 0 && z < 24) {
          positions.push({ x, z })
        }
      }
    }

    return positions
  }

  private canPlaceTree(context: GenerationContext, x: number, z: number): boolean {
    const surface = context.surfaceMap.get(`${x},${z}`)
    if (!surface) return false

    // Check 1: Not cave surface
    if (surface.isCave) return false

    // Check 2: Surface must be grass or dirt
    if (surface.blockType !== BlockType.grass && surface.blockType !== BlockType.dirt) {
      return false
    }

    // Check 3: Flatness check (3x3 area within 2 blocks height variance)
    const centerHeight = surface.y
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const neighbor = context.surfaceMap.get(`${x + dx},${z + dz}`)
        if (!neighbor) continue
        if (Math.abs(neighbor.y - centerHeight) > 2) {
          return false  // Too steep
        }
      }
    }

    // Check 4: No tree nearby (minimum spacing from biome)
    const biome = context.getBiomeAt(x, z)
    if (!biome) return false

    if (context.hasNearbyFeature(x, z, biome.minTreeSpacing, 'tree')) {
      return false
    }

    // Check 5: Vertical space (need at least 10 blocks of air above)
    for (let y = surface.y + 1; y < surface.y + 10; y++) {
      if (context.getBlock(x, y, z) !== BlockType.air) {
        return false  // Not enough vertical space
      }
    }

    return true
  }

  private placeTree(context: GenerationContext, x: number, baseY: number, z: number, rng: SeededRandom): void {
    // Gaussian distribution: mean=6, stdDev=1, range=2-9 blocks
    const height = Math.floor(rng.clampedGaussian(6, 1, 2, 9))

    // Trunk: single block column
    for (let y = baseY + 1; y <= baseY + height; y++) {
      context.setBlock(x, y, z, BlockType.tree)
    }

    // Canopy: Gaussian radius mean=4, stdDev=1, range=2-6
    const canopyY = baseY + height
    const canopyRadius = Math.floor(rng.clampedGaussian(4, 1, 2, 6))

    // Spherical canopy
    for (let dx = -canopyRadius; dx <= canopyRadius; dx++) {
      for (let dy = -2; dy <= canopyRadius; dy++) {  // Slightly flattened
        for (let dz = -canopyRadius; dz <= canopyRadius; dz++) {
          const dist = Math.sqrt(dx*dx + dy*dy*1.5 + dz*dz)  // Ellipsoid
          if (dist <= canopyRadius && !(dx === 0 && dy === 0 && dz === 0)) {
            // Don't replace trunk with leaves
            if (context.getBlock(x + dx, canopyY + dy, z + dz) !== BlockType.tree) {
              context.setBlock(x + dx, canopyY + dy, z + dz, BlockType.leaf)
            }
          }
        }
      }
    }

    // Mark placement to prevent nearby trees
    context.markFeature(x, z, 'tree')
  }
}
