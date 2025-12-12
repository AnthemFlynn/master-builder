import { initializeBlockRegistry } from '../../../modules/blocks'
import { NoiseGenerator } from '../adapters/NoiseGenerator'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorkerMessage, MainMessage } from './types'

// Initialize blocks definitions
initializeBlockRegistry()

// Create generator instance
const generator = new NoiseGenerator()

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const msg = e.data

    if (msg.type === 'GENERATE_CHUNK') {
    const startTime = performance.now()

    const { x, z, renderDistance } = msg
    const coord = new ChunkCoordinate(x, z)
    const chunk = new ChunkData(coord)

    // Generate terrain
    generator.populate(chunk, coord)

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
      metadata: metadata, // TODO: Handle Map serialization if needed (Worker postMessage supports Map!)
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
