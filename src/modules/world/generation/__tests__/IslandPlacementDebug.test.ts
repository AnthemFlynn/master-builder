import { describe, it } from 'bun:test'
import { GenerationOrchestrator } from '../GenerationOrchestrator'
import { TerrainPass } from '../passes/TerrainPass'
import { WaterPass } from '../passes/WaterPass'
import { IslandPass } from '../passes/IslandPass'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { WorldLoader } from '../../application/WorldLoader'
import { BlockType } from '../../domain/BlockType'

describe('Island Placement Debug', () => {
  it('should show where islands are and if they are visible from spawn', async () => {
    const loader = new WorldLoader()
    const worldDef = await loader.load('/worlds/default.json')

    console.log('\n=== Island Placement Analysis ===')
    console.log('Spawn at (12, 120, 12)')
    console.log('Render distance 5 = chunks from (-5,-5) to (5,5)')
    console.log('World coordinates: X=-120 to 143, Z=-120 to 143\n')

    // Check multiple chunks to find islands
    const testChunks = [
      [0, 0], [1, 0], [0, 1], [-1, 0], [0, -1],
      [2, 2], [-2, -2], [3, 0], [0, 3]
    ]

    for (const [cx, cz] of testChunks) {
      const orchestrator = new GenerationOrchestrator(worldDef, [
        new TerrainPass(),
        new WaterPass(),
        new IslandPass()
      ])

      const chunk = await orchestrator.generateChunk(new ChunkCoordinate(cx, cz))

      // Check for island stone above Y=70
      let islandBlocksAbove70 = 0
      for (let x = 0; x < 24; x++) {
        for (let y = 70; y < 120; y++) {
          for (let z = 0; z < 24; z++) {
            const block = chunk.getBlockId(x, y, z)
            if (block !== 0 && block !== 12) {  // Not air or water
              islandBlocksAbove70++
            }
          }
        }
      }

      if (islandBlocksAbove70 > 0) {
        console.log(`Chunk (${cx}, ${cz}): ${islandBlocksAbove70} island blocks above Y=70`)
      }
    }
  })
})
