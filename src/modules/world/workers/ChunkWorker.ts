import { initializeBlockRegistry } from '../../../modules/world/blocks'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorkerMessage, MainMessage } from './types'
import { WorldLoader } from '../application/WorldLoader'
import { GenerationOrchestrator } from '../generation/GenerationOrchestrator'
import { TerrainPass } from '../generation/passes/TerrainPass'
import { WaterPass } from '../generation/passes/WaterPass'
import { CavePass } from '../generation/passes/CavePass'
import { BiomePass } from '../generation/passes/BiomePass'
import { TreePass } from '../generation/passes/TreePass'
import { DecorationPass } from '../generation/passes/DecorationPass'
import { OrePass } from '../generation/passes/OrePass'

// Initialize blocks definitions
initializeBlockRegistry()

// Initialize world loader and orchestrator
let orchestrator: GenerationOrchestrator | null = null

async function initializeOrchestrator() {
  const loader = new WorldLoader()
  const worldDef = await loader.load('/worlds/default.json')

  // MINECRAFT-STYLE WORLD GENERATION
  // Pass ordering:
  // 1. TerrainPass - Generate heightmap with continentalness (oceans, land, mountains)
  // 2. WaterPass - Fill sea level (Y=63), beaches on gentle slopes
  // 3. CavePass - Carve cave systems
  // 4. OrePass - Place ore veins (coal, iron, gold, diamond)
  // 5. BiomePass - Apply surface materials based on climate
  // 6. TreePass - Place trees based on biome
  // 7. DecorationPass - Place grass, flowers, mushrooms, cacti
  orchestrator = new GenerationOrchestrator(worldDef, [
    new TerrainPass(),
    new WaterPass(),
    new CavePass(),
    new OrePass(),
    new BiomePass(),
    new TreePass(),
    new DecorationPass()
  ])

  console.log(`🌍 World loaded: ${worldDef.meta.name} (seed: ${worldDef.meta.seed})`)
  console.log(`🌍 Generation pipeline: Terrain → Water → Caves → Ores → Biomes → Trees → Decorations`)
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
