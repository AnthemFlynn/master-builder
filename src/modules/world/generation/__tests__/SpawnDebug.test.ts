import { describe, it } from 'bun:test'
import { GenerationOrchestrator } from '../GenerationOrchestrator'
import { TerrainPass } from '../passes/TerrainPass'
import { DramaticFeaturesPass } from '../passes/DramaticFeaturesPass'
import { BiomePass } from '../passes/BiomePass'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { WorldLoader } from '../../application/WorldLoader'

describe('Spawn Point Debug', () => {
  it('should show terrain height at player spawn (12, 80, 12)', async () => {
    const loader = new WorldLoader()
    const worldDef = await loader.load('/worlds/default.json')

    const orchestrator = new GenerationOrchestrator(worldDef, [
      new TerrainPass(),
      new DramaticFeaturesPass(),
      new BiomePass()
    ])

    // Spawn is at world position (12, 80, 12)
    // That's chunk (0, 0) local position (12, 80, 12)
    const chunk = await orchestrator.generateChunk(new ChunkCoordinate(0, 0))

    // Check terrain height at spawn X,Z
    console.log('\nTerrain at spawn point X=12, Z=12:')
    for (let y = 0; y < 256; y++) {
      const block = chunk.getBlockId(12, y, 12)
      if (block !== 0) {
        console.log(`  Y=${y}: BlockType ${block}`)
        if (y > 100) break // Stop after finding top
      }
    }

    // Find surface height
    let surfaceY = 0
    for (let y = 255; y >= 0; y--) {
      if (chunk.getBlockId(12, y, 12) !== 0) {
        surfaceY = y
        break
      }
    }

    console.log(`\nSurface height at spawn: Y=${surfaceY}`)
    console.log(`Camera spawns at: Y=80`)
    console.log(`Player is ${surfaceY > 80 ? 'STUCK INSIDE TERRAIN!' : 'spawning above ground correctly'}`)
  })
})
