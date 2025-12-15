import { describe, it, expect } from 'bun:test'
import { GenerationOrchestrator } from '../GenerationOrchestrator'
import { TerrainPass } from '../passes/TerrainPass'
import { DramaticFeaturesPass } from '../passes/DramaticFeaturesPass'
import { BiomePass } from '../passes/BiomePass'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { WorldLoader } from '../../application/WorldLoader'
import { BlockType } from '../../domain/BlockType'

describe('Full Generation Pipeline', () => {
  it('should generate default.json world without errors', async () => {
    const loader = new WorldLoader()
    const worldDef = await loader.load('/worlds/default.json')

    const orchestrator = new GenerationOrchestrator(worldDef, [
      new TerrainPass(),
      new DramaticFeaturesPass(),
      new BiomePass()
    ])

    // Generate chunk at origin
    const chunk = await orchestrator.generateChunk(new ChunkCoordinate(0, 0))

    // Analyze what was generated
    const blockCounts = new Map<number, number>()
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          const blockType = chunk.getBlockId(x, y, z)
          if (blockType !== 0) {
            blockCounts.set(blockType, (blockCounts.get(blockType) || 0) + 1)
          }
        }
      }
    }

    console.log('Chunk (0,0) block types:')
    for (const [type, count] of blockCounts.entries()) {
      const names = ['air', 'sand', 'tree', 'leaf', 'dirt', 'stone', 'coal', 'wood', 'diamond', 'gold', 'glowstone', 'bedrock', 'glass', 'redstone_lamp', 'grass', 'obsidian']
      console.log(`  ${names[type]} (${type}): ${count} blocks`)
    }

    // Verify no glass/window blocks (Type 12)
    expect(blockCounts.get(BlockType.glass) || 0).toBe(0)

    // Should have stone from terrain
    expect(blockCounts.get(BlockType.stone) || 0).toBeGreaterThan(0)

    // Should have appropriate surface blocks
    const hasValidSurface =
      (blockCounts.get(BlockType.grass) || 0) > 0 ||
      (blockCounts.get(BlockType.sand) || 0) > 0
    expect(hasValidSurface).toBe(true)
  })
})
