import { initializeBlockRegistry } from '../../../modules/blocks'
import { NoiseGenerator } from '../adapters/NoiseGenerator'
import { VoxelChunk } from '../domain/VoxelChunk'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorkerMessage, MainMessage } from './types'

// Initialize blocks definitions
initializeBlockRegistry()

// Create generator instance
const generator = new NoiseGenerator()

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data

  if (msg.type === 'GENERATE_CHUNK') {
    const { x, z, renderDistance } = msg
    const coord = new ChunkCoordinate(x, z)
    const chunk = new VoxelChunk(coord)
    
    // Generate terrain
    generator.populate(chunk, coord)
    
    // Get buffer and transfer ownership
    const buffer = chunk.getRawBuffer()
    
    const response: MainMessage = {
      type: 'CHUNK_GENERATED',
      x,
      z,
      renderDistance,
      blockBuffer: buffer
    }

    self.postMessage(response, [buffer])
  }
}
