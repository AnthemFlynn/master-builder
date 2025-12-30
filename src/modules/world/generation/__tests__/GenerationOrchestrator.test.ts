import { describe, it, expect } from 'bun:test'
import { GenerationOrchestrator } from '../GenerationOrchestrator'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { GenerationPass } from '../passes/GenerationPass'

class MockPass implements GenerationPass {
  name = 'MockPass'
  executed = false

  execute(context: GenerationContext): void {
    this.executed = true
    context.heightMap[0][0] = 99  // Mark as executed
  }
}

describe('GenerationOrchestrator', () => {
  const testWorldDef = {
    meta: { name: "Test", seed: 123, version: "0.1.0" },
    terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
    features: [],
    biomes: { elevationBased: true, ranges: [] }
  }

  it('should execute all registered passes in order', async () => {
    const pass1 = new MockPass()
    const pass2 = new MockPass()

    const orchestrator = new GenerationOrchestrator(testWorldDef, [pass1, pass2])
    const chunk = await orchestrator.generateChunk(new ChunkCoordinate(0, 0))

    expect(pass1.executed).toBe(true)
    expect(pass2.executed).toBe(true)
    expect(chunk).toBeDefined()
  })

  it('should compile blockTypes to ChunkData', async () => {
    const orchestrator = new GenerationOrchestrator(testWorldDef, [])
    const chunk = await orchestrator.generateChunk(new ChunkCoordinate(5, 10))

    expect(chunk.coord.x).toBe(5)
    expect(chunk.coord.z).toBe(10)
  })
})
