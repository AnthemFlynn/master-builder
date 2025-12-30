import { describe, it } from 'bun:test'
import { GenerationOrchestrator } from '../GenerationOrchestrator'
import { GenerationContext } from '../GenerationContext'
import { TerrainPass } from '../passes/TerrainPass'
import { CavePass } from '../passes/CavePass'
import { BiomePass } from '../passes/BiomePass'
import { TreePass } from '../passes/TreePass'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { WorldLoader } from '../../application/WorldLoader'
import { BlockType } from '../../domain/BlockType'

describe('Actual Generation Debug', () => {
  it('should show what chunk (0,0) actually generates', async () => {
    const loader = new WorldLoader()
    const worldDef = await loader.load('/worlds/default.json')

    const orchestrator = new GenerationOrchestrator(worldDef, [
      new TerrainPass(),
      new CavePass(),
      new BiomePass(),
      new TreePass()
    ])

    const chunk = await orchestrator.generateChunk(new ChunkCoordinate(0, 0))

    // Analyze block types
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

    const names = ['air', 'sand', 'tree', 'leaf', 'dirt', 'stone', 'coal', 'wood', 'diamond', 'gold', 'glowstone', 'bedrock', 'glass', 'redstone_lamp', 'grass', 'obsidian']
    console.log('\n=== Chunk (0,0) Block Analysis ===')
    for (const [type, count] of blockCounts.entries()) {
      console.log(`  ${names[type]} (${type}): ${count} blocks`)
    }

    // Check for trees
    const treeBlocks = blockCounts.get(BlockType.tree) || 0
    const leafBlocks = blockCounts.get(BlockType.leaf) || 0
    console.log(`\nTrees: ${treeBlocks > 0 ? 'PRESENT' : 'MISSING'} (${treeBlocks} trunk + ${leafBlocks} leaves)`)

    // Check for caves
    let caveAirBlocks = 0
    for (let x = 0; x < 24; x++) {
      for (let y = 10; y < 50; y++) {  // Underground range
        for (let z = 0; z < 24; z++) {
          if (chunk.getBlockId(x, y, z) === BlockType.air) {
            caveAirBlocks++
          }
        }
      }
    }
    console.log(`Caves: ${caveAirBlocks > 0 ? 'PRESENT' : 'MISSING'} (${caveAirBlocks} air blocks underground)`)

    // Check surface types
    const grassBlocks = blockCounts.get(BlockType.grass) || 0
    const sandBlocks = blockCounts.get(BlockType.sand) || 0
    const stoneBlocks = blockCounts.get(BlockType.stone) || 0
    console.log(`\nSurface: grass=${grassBlocks}, sand=${sandBlocks}, stone=${stoneBlocks}`)
  })

  it('should show why trees are missing at chunk (0,0)', async () => {
    const loader = new WorldLoader()
    const worldDef = await loader.load('/worlds/default.json')

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Run passes
    const terrainPass = new TerrainPass()
    const cavePass = new CavePass()
    const biomePass = new BiomePass()

    terrainPass.execute(context)
    cavePass.execute(context)
    biomePass.execute(context)

    // Check biome at center
    const centerBiome = context.getBiomeAt(12, 12)
    console.log(`\nBiome at center (12,12): ${centerBiome?.type || 'NONE'}`)
    console.log(`  Allows trees: ${centerBiome?.allowTrees}`)
    console.log(`  Tree density: ${centerBiome?.treeDensity}`)

    // Check surface
    const surface = context.surfaceMap.get('12,12')
    console.log(`\nSurface at (12,12): Y=${surface?.y}, blockType=${surface?.blockType}, isCave=${surface?.isCave}`)

    // Check climate
    console.log(`Climate: temp=${context.temperature[12][12].toFixed(2)}, humidity=${context.humidity[12][12].toFixed(2)}`)
  })
})
