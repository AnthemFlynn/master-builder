import { describe, it, expect } from 'bun:test'
import { CavePass } from '../CavePass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('CavePass', () => {
  const testWorldDef = {
    meta: { name: "Test", seed: 12345, version: "0.1.0" },
    terrain: { generator: "flat" as const, baseHeight: 60 },
    features: [],
    biomes: { elevationBased: true, ranges: [] }
  }

  it('should carve cheese caves using 3D density noise', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)

    // Fill terrain first
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 60
        for (let y = 1; y <= 60; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const pass = new CavePass()
    pass.execute(context)

    // Should have carved some caves (converted stone to air)
    let airBlocksUnderground = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 10; y < 50; y++) {  // Underground only
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.air) {
            airBlocksUnderground++
          }
        }
      }
    }

    expect(airBlocksUnderground).toBeGreaterThan(0)
  })

  it('should mark carved blocks as caves', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)

    // Fill terrain
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 60
        for (let y = 1; y <= 60; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const pass = new CavePass()
    pass.execute(context)

    // Count air blocks and cave-marked blocks
    let airBlocks = 0
    let caveMarkedBlocks = 0

    for (let x = 0; x < 24; x++) {
      for (let y = 5; y < 50; y++) {  // Valid cave range
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.air) {
            airBlocks++
          }
          if (context.isCave(x, y, z)) {
            caveMarkedBlocks++
          }
        }
      }
    }

    console.log(`Air blocks: ${airBlocks}, Cave-marked blocks: ${caveMarkedBlocks}`)

    // Air blocks and cave-marked blocks should match
    expect(caveMarkedBlocks).toBe(airBlocks)
    expect(caveMarkedBlocks).toBeGreaterThan(0)
  })

  it('should not carve near surface', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)

    // Fill terrain
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 60
        for (let y = 1; y <= 60; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const pass = new CavePass()
    pass.execute(context)

    // Check that blocks near surface (Y=51-60) are still stone
    let allSolidNearSurface = true
    for (let x = 0; x < 24; x++) {
      for (let y = 51; y <= 60; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.air) {
            allSolidNearSurface = false
          }
        }
      }
    }

    expect(allSolidNearSurface).toBe(true)
  })

  it('should generate spaghetti caves (worm tunnels)', () => {
    // Use seed that spawns tunnels (2% chance, so test with deterministic seed)
    const worldDef = {
      meta: { name: "Test", seed: 55555, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 80 },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Fill terrain
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 80
        for (let y = 1; y <= 80; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }
      }
    }

    const pass = new CavePass()
    pass.execute(context)

    // With both cheese and spaghetti, should have caves
    let totalCaveBlocks = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 5; y < 70; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) === BlockType.air) {
            totalCaveBlocks++
          }
        }
      }
    }

    expect(totalCaveBlocks).toBeGreaterThan(0)
  })
})
