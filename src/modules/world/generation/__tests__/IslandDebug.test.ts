import { describe, it } from 'bun:test'
import { FloatingIslandGenerator } from '../features/FloatingIslandGenerator'
import { GenerationContext } from '../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../domain/BlockType'

describe('Floating Island Debug', () => {
  it('should show what islands look like in chunk 0,0', () => {
    const worldDef = {
      meta: { name: "Test", seed: 42069, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 35 },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const config = {
      type: 'floating_island' as const,
      spacing: 350,
      noiseOffset: 80,
      radiusRange: [50, 100] as [number, number],
      heightRange: [90, 130] as [number, number],
      thickness: 18,
      material: "grass",
      supportPillars: false
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)
    const generator = new FloatingIslandGenerator()

    // Check if chunk is affected
    const affected = generator.affects(new ChunkCoordinate(0, 0), 42069, config)
    console.log(`Chunk (0,0) affected by islands: ${affected}`)

    // Generate
    generator.generate(context, config)

    // Find blocks at different Y levels
    for (let y of [0, 35, 50, 90, 100, 130, 150, 200]) {
      let count = 0
      for (let x = 0; x < 24; x++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) !== BlockType.air) {
            count++
          }
        }
      }
      if (count > 0) {
        console.log(`  Y=${y}: ${count} blocks`)
      }
    }

    // Find the actual Y range
    let minY = 256, maxY = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.getBlock(x, y, z) !== BlockType.air) {
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
          }
        }
      }
    }
    console.log(`Actual Y range: ${minY} to ${maxY}`)
  })
})
