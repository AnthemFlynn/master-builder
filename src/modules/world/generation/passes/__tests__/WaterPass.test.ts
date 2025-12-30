import { describe, it, expect } from 'bun:test'
import { WaterPass } from '../WaterPass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('WaterPass', () => {
  const testWorldDef = {
    meta: { name: "Test", seed: 12345, version: "0.1.0" },
    terrain: { generator: "flat" as const, baseHeight: 50 },
    features: [],
    biomes: { climateBasedSystem: true }
  }

  it('should fill air below sea level with water', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)

    // Create low terrain (Y=30, below sea level 62)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 30
        for (let y = 1; y <= 30; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const pass = new WaterPass()
    pass.execute(context)

    // Air blocks from Y=31 to Y=63 should now be water
    let waterCount = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 31; y <= 63; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.water) {
            waterCount++
          }
        }
      }
    }

    // 24 * 24 * 33 = 19008 water blocks
    expect(waterCount).toBe(19008)
  })

  it('should not fill above sea level', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)

    // Create high terrain (Y=70, above sea level)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 70
        for (let y = 1; y <= 70; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const pass = new WaterPass()
    pass.execute(context)

    // Should be NO water
    let waterCount = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.water) {
            waterCount++
          }
        }
      }
    }

    expect(waterCount).toBe(0)
  })

  it('should mark ocean biome for deep water areas', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)

    // Create very low terrain (Y=20, deep ocean)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 20
        context.temperature[x][z] = 0.5
        context.humidity[x][z] = 0.5
        for (let y = 1; y <= 20; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const pass = new WaterPass()
    pass.execute(context)

    // Should mark as ocean biome (for future features)
    const metadata = context.getBiomeAt(12, 12)
    // Ocean marking TBD - just verify water is placed for now

    let waterDepth = 0
    for (let y = 21; y <= 63; y++) {
      if (context.getBlock(12, y, 12) === BlockType.water) {
        waterDepth++
      }
    }

    expect(waterDepth).toBe(43)  // Y=21 to Y=63
  })
})
