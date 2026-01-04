import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D, NoiseFunction2D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../../../../shared/constants/ChunkConstants'

export class TreePass implements GenerationPass {
  readonly name = 'TreePass'

  // Cached noise function (created once, reused for all chunks)
  private noise: NoiseFunction2D | null = null
  private cachedSeed: number | null = null

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

  private getTreePositions(coord: { x: number, z: number }, seed: number, baseSpacing: number): Array<{x: number, z: number}> {
    const positions: Array<{x: number, z: number}> = []

    // Use cached noise (or create if seed changed)
    if (!this.noise || this.cachedSeed !== seed) {
      this.noise = createNoise2D(() => seed + 3000)
      this.cachedSeed = seed
    }
    const noise = this.noise

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
        if (x >= 0 && x < CHUNK_WIDTH && z >= 0 && z < CHUNK_DEPTH) {
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

    // Check 5: Vertical space (need at least 8 blocks of air above for normal trees)
    for (let y = surface.y + 1; y < surface.y + 8; y++) {
      if (context.getBlock(x, y, z) !== BlockType.air) {
        return false  // Not enough vertical space
      }
    }

    return true
  }

  private placeTree(context: GenerationContext, x: number, baseY: number, z: number, rng: SeededRandom): void {
    // Select tree variant (4 types for variety)
    const variant = Math.floor(rng.next() * 4)

    switch (variant) {
      case 0:
        this.placeStandardTree(context, x, baseY, z, rng)
        break
      case 1:
        this.placeTallTree(context, x, baseY, z, rng)
        break
      case 2:
        this.placeBushyTree(context, x, baseY, z, rng)
        break
      case 3:
        this.placeSparseTree(context, x, baseY, z, rng)
        break
    }

    // Mark placement to prevent nearby trees
    context.markFeature(x, z, 'tree')
  }

  // Standard tree: medium height, spherical canopy
  private placeStandardTree(context: GenerationContext, x: number, baseY: number, z: number, rng: SeededRandom): void {
    const height = Math.floor(rng.clampedGaussian(5.5, 1.5, 4, 7))

    // Trunk
    for (let y = baseY + 1; y <= baseY + height; y++) {
      context.setBlock(x, y, z, BlockType.tree)
    }

    // Spherical canopy
    const canopyStartY = baseY + height - 2
    const canopyRadius = rng.next() > 0.5 ? 2 : 3

    for (let dy = 0; dy <= 3; dy++) {
      const y = canopyStartY + dy
      const layerRadius = dy === 3 ? 1 : (dy === 0 ? canopyRadius - 1 : canopyRadius)

      for (let dx = -layerRadius; dx <= layerRadius; dx++) {
        for (let dz = -layerRadius; dz <= layerRadius; dz++) {
          if (Math.abs(dx) === layerRadius && Math.abs(dz) === layerRadius) continue
          const px = x + dx
          const pz = z + dz
          if (context.getBlock(px, y, pz) === BlockType.air) {
            context.setBlock(px, y, pz, BlockType.leaf)
          }
        }
      }
    }
  }

  // Tall tree: taller trunk, smaller canopy (like birch)
  private placeTallTree(context: GenerationContext, x: number, baseY: number, z: number, rng: SeededRandom): void {
    const height = Math.floor(rng.clampedGaussian(8, 1.5, 6, 10))

    // Tall trunk
    for (let y = baseY + 1; y <= baseY + height; y++) {
      context.setBlock(x, y, z, BlockType.tree)
    }

    // Narrow canopy (radius 1-2)
    const canopyStartY = baseY + height - 3
    for (let dy = 0; dy <= 4; dy++) {
      const y = canopyStartY + dy
      const layerRadius = dy <= 1 ? 2 : 1

      for (let dx = -layerRadius; dx <= layerRadius; dx++) {
        for (let dz = -layerRadius; dz <= layerRadius; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue
          const px = x + dx
          const pz = z + dz
          if (context.getBlock(px, y, pz) === BlockType.air) {
            context.setBlock(px, y, pz, BlockType.leaf)
          }
        }
      }
    }
  }

  // Bushy tree: short trunk, wide canopy
  private placeBushyTree(context: GenerationContext, x: number, baseY: number, z: number, rng: SeededRandom): void {
    const height = Math.floor(rng.clampedGaussian(4, 0.5, 3, 5))

    // Short trunk
    for (let y = baseY + 1; y <= baseY + height; y++) {
      context.setBlock(x, y, z, BlockType.tree)
    }

    // Wide canopy (radius 3-4)
    const canopyStartY = baseY + height - 1
    for (let dy = 0; dy <= 3; dy++) {
      const y = canopyStartY + dy
      const layerRadius = dy === 3 ? 2 : (dy === 0 ? 3 : 4)

      for (let dx = -layerRadius; dx <= layerRadius; dx++) {
        for (let dz = -layerRadius; dz <= layerRadius; dz++) {
          // Round corners more aggressively
          const dist = Math.abs(dx) + Math.abs(dz)
          if (dist > layerRadius + 1) continue
          const px = x + dx
          const pz = z + dz
          if (context.getBlock(px, y, pz) === BlockType.air) {
            context.setBlock(px, y, pz, BlockType.leaf)
          }
        }
      }
    }
  }

  // Sparse tree: random leaf placement for a scraggly look
  private placeSparseTree(context: GenerationContext, x: number, baseY: number, z: number, rng: SeededRandom): void {
    const height = Math.floor(rng.clampedGaussian(6, 1, 5, 8))

    // Trunk
    for (let y = baseY + 1; y <= baseY + height; y++) {
      context.setBlock(x, y, z, BlockType.tree)
    }

    // Sparse canopy with random gaps
    const canopyStartY = baseY + height - 3
    const canopyRadius = 2

    for (let dy = 0; dy <= 4; dy++) {
      const y = canopyStartY + dy
      const layerRadius = dy >= 3 ? 1 : canopyRadius

      for (let dx = -layerRadius; dx <= layerRadius; dx++) {
        for (let dz = -layerRadius; dz <= layerRadius; dz++) {
          if (Math.abs(dx) === layerRadius && Math.abs(dz) === layerRadius) continue
          // 30% chance to skip leaf placement for sparse look
          if (rng.next() < 0.3) continue
          const px = x + dx
          const pz = z + dz
          if (context.getBlock(px, y, pz) === BlockType.air) {
            context.setBlock(px, y, pz, BlockType.leaf)
          }
        }
      }
    }
  }
}
