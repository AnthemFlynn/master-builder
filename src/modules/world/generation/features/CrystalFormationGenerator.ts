import { FeatureGenerator } from './FeatureGenerator'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { CrystalFormationFeature } from '../../domain/WorldDefinition'
import { resolveBlockType } from '../../domain/MaterialRegistry'
import { BlockType } from '../../domain/BlockType'
import { SeededRandom } from '../utils/SeededRandom'

export class CrystalFormationGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: CrystalFormationFeature): boolean {
    return true  // Density-based placement
  }

  generate(context: GenerationContext, config: CrystalFormationFeature): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 113 + context.chunkCoord.z * 229)
    const material = resolveBlockType(config.material)

    const [minDepth, maxDepth] = config.depthRange

    // Find cave surfaces (air adjacent to stone)
    for (let x = 0; x < 24; x++) {
      for (let y = minDepth; y < maxDepth && y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          if (rng.next() < config.density) {
            // Check if this is a cave surface
            if (this.isCaveSurface(context, x, y, z, config.onlyInCaves)) {
              const height = rng.range(config.heightRange[0], config.heightRange[1])
              this.growCrystal(context, x, y, z, height, material)
            }
          }
        }
      }
    }
  }

  private isCaveSurface(context: GenerationContext, x: number, y: number, z: number, requireCave: boolean): boolean {
    // Must be stone block
    if (context.getBlock(x, y, z) !== BlockType.stone) return false

    if (!requireCave) return true

    // Must have air neighbor (indicates cave surface)
    const neighbors = [
      [x+1, y, z], [x-1, y, z],
      [x, y+1, z], [x, y-1, z],
      [x, y, z+1], [x, y, z-1]
    ]

    for (const [nx, ny, nz] of neighbors) {
      if (context.getBlock(nx, ny, nz) === BlockType.air) {
        return true  // Has air neighbor = cave surface
      }
    }

    return false
  }

  private growCrystal(context: GenerationContext, x: number, y: number, z: number, height: number, material: number): void {
    // Determine growth direction (find air neighbor)
    const growthDir = this.findGrowthDirection(context, x, y, z)
    if (!growthDir) return

    // Grow crystal in that direction
    for (let h = 0; h < height; h++) {
      const cx = x + growthDir.x * h
      const cy = y + growthDir.y * h
      const cz = z + growthDir.z * h

      // Place crystal if space is air
      if (context.getBlock(cx, cy, cz) === BlockType.air) {
        context.setBlock(cx, cy, cz, material)
      }
    }
  }

  private findGrowthDirection(context: GenerationContext, x: number, y: number, z: number): { x: number, y: number, z: number } | null {
    const directions = [
      { x: 0, y: 1, z: 0 },   // Up
      { x: 0, y: -1, z: 0 },  // Down
      { x: 1, y: 0, z: 0 },   // +X
      { x: -1, y: 0, z: 0 },  // -X
      { x: 0, y: 0, z: 1 },   // +Z
      { x: 0, y: 0, z: -1 }   // -Z
    ]

    for (const dir of directions) {
      const nx = x + dir.x
      const ny = y + dir.y
      const nz = z + dir.z

      if (context.getBlock(nx, ny, nz) === BlockType.air) {
        return dir
      }
    }

    return null
  }
}
