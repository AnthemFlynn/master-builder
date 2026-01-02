import { initializeBlockRegistry } from '../../../modules/world/blocks'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorkerMessage, MainMessage } from './types'
import { WorldLoader } from '../application/WorldLoader'
import { GenerationOrchestrator } from '../generation/GenerationOrchestrator'
import { TerrainPass } from '../generation/passes/TerrainPass'
import { WaterPass } from '../generation/passes/WaterPass'
import { CaveSystemPass } from '../generation/passes/CaveSystemPass'
import { BiomePass } from '../generation/passes/BiomePass'
import { TreePass } from '../generation/passes/TreePass'
import { DecorationPass } from '../generation/passes/DecorationPass'
import { OrePass } from '../generation/passes/OrePass'

// Initialize blocks definitions
initializeBlockRegistry()

// Initialize world loader and orchestrator using promise for proper async handling
let orchestratorPromise: Promise<GenerationOrchestrator> | null = null

function getOrchestrator(): Promise<GenerationOrchestrator> {
  if (!orchestratorPromise) {
    orchestratorPromise = initializeOrchestrator()
  }
  return orchestratorPromise
}

async function initializeOrchestrator(): Promise<GenerationOrchestrator> {
  const startTime = performance.now()

  const loader = new WorldLoader()
  const worldDef = await loader.load('/worlds/default.json')

  // WORLD GENERATION PIPELINE
  // Pass ordering (caves LAST to punch through surface features):
  // 1. TerrainPass - Generate heightmap with islands and volcanoes
  // 2. WaterPass - Fill sea level (Y=63), beaches on gentle slopes
  // 3. OrePass - Place ore veins (coal, iron, gold, diamond)
  // 4. BiomePass - Apply surface materials based on climate
  // 5. TreePass - Place trees based on biome
  // 6. DecorationPass - Place grass, flowers, mushrooms, cacti
  // 7. CaveSystemPass - Carve volcanic lava tube networks (LAST)

  // Create passes - pre-warm expensive generators
  const terrainPass = new TerrainPass()

  // Pre-initialize OrganicIslandGenerator (expensive: ~10-20ms)
  // Do this once per worker instead of lazily on first chunk
  const warmupStart = performance.now()
  terrainPass.warmup(worldDef.meta.seed)
  const warmupEnd = performance.now()

  const orchestrator = new GenerationOrchestrator(worldDef, [
    terrainPass,
    new WaterPass(),
    new OrePass(),
    new BiomePass(),
    new TreePass(),
    new DecorationPass(),
    new CaveSystemPass()  // Caves run LAST to carve through everything
  ])

  const endTime = performance.now()
  console.log(`🌍 Worker initialized in ${(endTime - startTime).toFixed(1)}ms (warmup: ${(warmupEnd - warmupStart).toFixed(1)}ms)`)
  console.log(`🌍 World: ${worldDef.meta.name} (seed: ${worldDef.meta.seed})`)
  console.log(`🌍 Pipeline: Terrain → Water → Ores → Biomes → Trees → Decorations → CaveSystem`)

  return orchestrator
}

// Start initialization immediately
getOrchestrator()

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const msg = e.data

    if (msg.type === 'GENERATE_CHUNK') {
      const startTime = performance.now()

      // Wait for orchestrator initialization (proper promise-based, no polling)
      const orchestrator = await getOrchestrator()

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
    // Enhanced error logging to debug issues
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { raw: String(error) }
    console.error('[ChunkWorker] Error processing message:', errorDetails.message || errorDetails.raw)
    console.error('[ChunkWorker] Stack trace:', errorDetails.stack || 'N/A')
    self.postMessage({
      type: 'CHUNK_ERROR',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
