import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { WorkerMessage, MainMessage } from './types'
import { LightingPipeline } from '../application/voxel-lighting/LightingPipeline'
import { WorkerVoxelQuery } from './WorkerVoxelQuery'
import { WorkerLightStorage } from './WorkerLightStorage'
import { blockRegistry, initializeBlockRegistry } from '../../../modules/blocks'

// Initialize blocks definitions
initializeBlockRegistry()

// Create reusable instances for performance
const voxelQuery = new WorkerVoxelQuery()
const lightStorage = new WorkerLightStorage(voxelQuery) 
const pipeline = new LightingPipeline(voxelQuery)

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const msg = e.data

    if (msg.type === 'CALC_LIGHT') {
    const { x, z, neighborVoxels } = msg
    const coord = new ChunkCoordinate(x, z)

    // Clear previous chunks and hydrate for this message
    voxelQuery.clear()
    
    // Hydrate center and neighbors
    for (const [key, buffer] of Object.entries(neighborVoxels)) {
      const [dx, dz] = key.split(',').map(Number)
      const c = new ChunkCoordinate(x + dx, z + dz)
      const chunk = new ChunkData(c, buffer)
      voxelQuery.addChunk(chunk)
    }

    // Pipeline modifies the ChunkData IN PLACE.
    pipeline.execute(coord, lightStorage)

    // Extract the modified buffer (which now contains light)
    const centerChunk = voxelQuery.getChunk(coord)
    if (!centerChunk) return // Should not happen

    const buffer = centerChunk.getRawBuffer()
    
    const response: any = {
      type: 'LIGHT_CALCULATED',
      x,
      z,
      chunkBuffer: buffer
    }

    self.postMessage(response, [buffer])
    }
  } catch (error) {
    console.error('[LightingWorker] Error processing message:', error)
    self.postMessage({
      type: 'LIGHT_ERROR',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
