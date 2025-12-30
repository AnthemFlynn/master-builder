import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { SeededRandom } from '../utils/SeededRandom'

interface OreConfig {
  blockType: BlockType
  minY: number           // Minimum spawn height
  maxY: number           // Maximum spawn height
  veinSize: number       // Average blocks per vein
  veinsPerChunk: number  // Average veins per chunk
  rarity: number         // 0-1, lower = rarer
}

/**
 * OrePass - Places ore veins underground
 * Uses Minecraft-style distribution (coal high, diamonds low)
 */
export class OrePass implements GenerationPass {
  readonly name = 'OrePass'

  // Ore configurations (Minecraft-style distribution)
  private readonly ORES: OreConfig[] = [
    // Coal: Y 0-128, common at all heights, large veins
    {
      blockType: BlockType.coal_ore,
      minY: 0,
      maxY: 128,
      veinSize: 17,
      veinsPerChunk: 20,
      rarity: 1.0
    },
    // Iron: Y 0-64, most common at Y 16, medium veins
    {
      blockType: BlockType.iron_ore,
      minY: 0,
      maxY: 64,
      veinSize: 9,
      veinsPerChunk: 20,
      rarity: 0.9
    },
    // Gold: Y 0-32, rare, small veins
    {
      blockType: BlockType.gold_ore,
      minY: 0,
      maxY: 32,
      veinSize: 9,
      veinsPerChunk: 2,
      rarity: 0.5
    },
    // Diamond: Y 0-16, very rare, small veins
    {
      blockType: BlockType.diamond_ore,
      minY: 0,
      maxY: 16,
      veinSize: 8,
      veinsPerChunk: 1,
      rarity: 0.25
    }
  ]

  execute(context: GenerationContext): void {
    const rng = new SeededRandom(
      context.seed + context.chunkCoord.x * 97 + context.chunkCoord.z * 179 + 5000
    )

    for (const ore of this.ORES) {
      this.generateOreVeins(context, ore, rng)
    }
  }

  private generateOreVeins(context: GenerationContext, ore: OreConfig, rng: SeededRandom): void {
    // Calculate number of veins to attempt
    const veinAttempts = Math.floor(ore.veinsPerChunk * ore.rarity)

    for (let i = 0; i < veinAttempts; i++) {
      // Random starting position within chunk
      const startX = Math.floor(rng.next() * 24)
      const startZ = Math.floor(rng.next() * 24)
      const startY = Math.floor(ore.minY + rng.next() * (ore.maxY - ore.minY))

      // Check if starting position is in stone (underground)
      if (context.getBlock(startX, startY, startZ) !== BlockType.stone) {
        continue
      }

      // Generate vein using blob/sphere approach
      this.generateVein(context, ore.blockType, startX, startY, startZ, ore.veinSize, rng)
    }
  }

  private generateVein(
    context: GenerationContext,
    oreType: BlockType,
    startX: number,
    startY: number,
    startZ: number,
    maxSize: number,
    rng: SeededRandom
  ): void {
    // Use a modified flood-fill approach to create natural-looking veins
    const placed = new Set<string>()
    const queue: Array<{x: number, y: number, z: number, distance: number}> = []

    queue.push({ x: startX, y: startY, z: startZ, distance: 0 })

    // Calculate vein "radius" from size
    const radius = Math.cbrt(maxSize / 4.2) // Approximate spherical vein

    while (queue.length > 0 && placed.size < maxSize) {
      const current = queue.shift()!
      const key = `${current.x},${current.y},${current.z}`

      if (placed.has(key)) continue
      if (current.x < 0 || current.x >= 24) continue
      if (current.z < 0 || current.z >= 24) continue
      if (current.y < 1 || current.y >= 255) continue

      // Check distance from center (creates roughly spherical veins)
      const dx = current.x - startX
      const dy = current.y - startY
      const dz = current.z - startZ
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)

      // Probability of placement decreases with distance
      const placeProbability = Math.max(0, 1 - (dist / (radius * 1.5)))
      if (rng.next() > placeProbability) continue

      // Only replace stone
      if (context.getBlock(current.x, current.y, current.z) !== BlockType.stone) {
        continue
      }

      // Place ore
      context.setBlock(current.x, current.y, current.z, oreType)
      placed.add(key)

      // Add neighbors to queue (6-connected)
      if (placed.size < maxSize) {
        const offsets = [
          [1, 0, 0], [-1, 0, 0],
          [0, 1, 0], [0, -1, 0],
          [0, 0, 1], [0, 0, -1]
        ]

        // Shuffle offsets for more natural patterns
        for (let i = offsets.length - 1; i > 0; i--) {
          const j = Math.floor(rng.next() * (i + 1))
          ;[offsets[i], offsets[j]] = [offsets[j], offsets[i]]
        }

        for (const [ox, oy, oz] of offsets) {
          const nx = current.x + ox
          const ny = current.y + oy
          const nz = current.z + oz
          const nkey = `${nx},${ny},${nz}`

          if (!placed.has(nkey)) {
            queue.push({
              x: nx,
              y: ny,
              z: nz,
              distance: current.distance + 1
            })
          }
        }
      }
    }
  }
}
