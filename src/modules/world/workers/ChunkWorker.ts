import { initializeBlockRegistry } from '../../../modules/blocks'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorkerMessage, MainMessage } from './types'
import { WorldLoader } from '../application/WorldLoader'
import { GenerationOrchestrator } from '../generation/GenerationOrchestrator'
import { TerrainPass } from '../generation/passes/TerrainPass'
import { WaterPass } from '../generation/passes/WaterPass'
import { CavePass } from '../generation/passes/CavePass'
import { BiomePass } from '../generation/passes/BiomePass'
import { TreePass } from '../generation/passes/TreePass'

// Initialize blocks definitions
initializeBlockRegistry()

// Initialize world loader and orchestrator
let orchestrator: GenerationOrchestrator | null = null

async function initializeOrchestrator() {
  const loader = new WorldLoader()
  const worldDef = await loader.load('/worlds/default.json')

  // CRITICAL: Pass ordering matters!
  // 1. TerrainPass - Generate heightmap, fill terrain, climate data
  // 2. WaterPass - Fill sea level (Y=62), mark water surfaces
  // 3. CavePass - Carve caves (can create underwater caves), rebuild surface map
  // 4. BiomePass - Apply surface materials (uses post-cave surface map)
  // 5. TreePass - Place validated trees (uses biome data)
  orchestrator = new GenerationOrchestrator(worldDef, [
    new TerrainPass(),
    new WaterPass(),
    new CavePass(),
    new BiomePass(),
    new TreePass()
  ])

  console.log(`🌍 World loaded: ${worldDef.meta.name} (seed: ${worldDef.meta.seed})`)
  console.log(`🌍 Pass ordering: Terrain → Water → Caves → Biomes → Trees`)
}

// Initialize on worker start
initializeOrchestrator()

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const msg = e.data

    if (msg.type === 'GENERATE_CHUNK') {
      const startTime = performance.now()

      // Wait for orchestrator if still initializing (with timeout)
      const MAX_WAIT_MS = 5000
      const waitStart = Date.now()
      while (!orchestrator) {
        if (Date.now() - waitStart > MAX_WAIT_MS) {
          throw new Error('Orchestrator initialization timeout (5s)')
        }
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const { x, z, renderDistance } = msg
      const coord = new ChunkCoordinate(x, z)

      // Use new generation system
      const chunk = await orchestrator.generateChunk(coord)

      // Get buffer and transfer ownership
      const buffer = chunk.getRawBuffer()
      const metadata = chunk.getMetadata()

      const endTime = performance.now()
      const duration = endTime - startTime

      const response: MainMessage = {
        type: 'CHUNK_GENERATED',
        x,
        z,
        renderDistance,
        blockBuffer: buffer,
        metadata: metadata,
        timingMs: duration
      }

      self.postMessage(response, [buffer])
    }
  } catch (error) {
    console.error('[ChunkWorker] Error processing message:', error)
    self.postMessage({
      type: 'CHUNK_ERROR',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
