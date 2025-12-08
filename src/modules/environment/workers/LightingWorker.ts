import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { VoxelChunk } from '../../../modules/world/domain/VoxelChunk'
import { WorkerMessage, MainMessage } from './types'
import { LightingPipeline } from '../application/voxel-lighting/LightingPipeline'
import { WorkerVoxelQuery } from './WorkerVoxelQuery'
import { WorkerLightStorage } from './WorkerLightStorage'
import { blockRegistry } from '../../../modules/blocks'

// Initialize blocks definitions (needed for lighting properties)
// Note: initializeBlockRegistry creates a TextureLoader which crashes in worker.
// We must assume the Registry is already patched to be lazy-loading textures.
// OR we just use the registry for properties.
// In a previous step, we patched BlockRegistry to be safe.

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data

  if (msg.type === 'CALC_LIGHT') {
    const { x, z, neighborVoxels, neighborLight } = msg
    const coord = new ChunkCoordinate(x, z)

    // Reconstruct Voxel Environment
    const voxelQuery = new WorkerVoxelQuery()
    
    // Hydrate center and neighbors
    for (const [key, buffer] of Object.entries(neighborVoxels)) {
      const [dx, dz] = key.split(',').map(Number)
      const c = new ChunkCoordinate(x + dx, z + dz)
      const chunk = VoxelChunk.fromBuffer(c, buffer)
      voxelQuery.addChunk(chunk)
    }

    // Reconstruct Light Environment
    const lightStorage = new WorkerLightStorage()
    // TODO: Hydrate neighbor lights if provided

    // Execute Pipeline
    const pipeline = new LightingPipeline(voxelQuery)
    const lightData = pipeline.execute(coord, lightStorage)

    // Extract Buffers
    const size = 24 * 256 * 24
    const skyBuffer = new Uint8Array(size * 3)
    const blockBuffer = new Uint8Array(size * 3)
    
    const sky = lightData.getSkyBuffers()
    const block = lightData.getBlockBuffers()
    
    skyBuffer.set(new Uint8Array(sky.r), 0)
    skyBuffer.set(new Uint8Array(sky.g), size)
    skyBuffer.set(new Uint8Array(sky.b), size * 2)

    blockBuffer.set(new Uint8Array(block.r), 0)
    blockBuffer.set(new Uint8Array(block.g), size)
    blockBuffer.set(new Uint8Array(block.b), size * 2)

    const response: MainMessage = {
      type: 'LIGHT_CALCULATED',
      x,
      z,
      lightBuffer: {
        sky: skyBuffer.buffer,
        block: blockBuffer.buffer
      }
    }

    self.postMessage(response, [skyBuffer.buffer, blockBuffer.buffer])
  }
}
