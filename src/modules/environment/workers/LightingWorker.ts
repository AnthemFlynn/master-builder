import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { WorkerMessage, MainMessage } from './types'
import { LightingPipeline } from '../application/voxel-lighting/LightingPipeline'
import { WorkerVoxelQuery } from './WorkerVoxelQuery'
import { WorkerLightStorage } from './WorkerLightStorage'
import { blockRegistry, initializeBlockRegistry } from '../../../modules/blocks'

// Initialize blocks definitions
initializeBlockRegistry()

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data

  if (msg.type === 'CALC_LIGHT') {
    const { x, z, neighborVoxels } = msg
    const coord = new ChunkCoordinate(x, z)

    // Reconstruct Voxel Environment using ChunkData
    const voxelQuery = new WorkerVoxelQuery()
    
    // Hydrate center and neighbors
    for (const [key, buffer] of Object.entries(neighborVoxels)) {
      const [dx, dz] = key.split(',').map(Number)
      const c = new ChunkCoordinate(x + dx, z + dz)
      // Create ChunkData from buffer. 
      // Note: neighborVoxels comes from ChunkData.getRawBuffer()
      const chunk = new ChunkData(c, buffer)
      voxelQuery.addChunk(chunk)
    }

    // Reconstruct Light Environment
    // In the Unified model, Light is IN the ChunkData.
    // So `voxelQuery` IS the LightStorage.
    // We don't need separate LightStorage anymore.
    // BUT, LightingPipeline expects ILightStorage.
// We can make WorkerVoxelQuery implement ILightStorage too, or wrap it.
    const lightStorage = new WorkerLightStorage(voxelQuery) 

    // Execute Pipeline
    // Note: LightingPipeline expects LightData. But we now use ChunkData.
    // We need to update LightingPipeline to work with ChunkData.
    // Or adapter?
    // Let's update LightingPipeline signature in next step.
    // Here we assume pipeline accepts the unified data.
    const pipeline = new LightingPipeline(voxelQuery)
    
    // Pipeline modifies the ChunkData IN PLACE.
    pipeline.execute(coord, lightStorage)

    // Extract the modified buffer (which now contains light)
    // We only need to send back the Center chunk buffer.
    const centerChunk = voxelQuery.getChunk(coord)
    if (!centerChunk) return // Should not happen

    const buffer = centerChunk.getRawBuffer()

    // Create separate buffers for legacy response format?
    // No, we are switching to Unified format.
    // Response should just be the ChunkData buffer.
    
    // Wait, if we change response format, we break EnvironmentService.
    // EnvironmentService expects { sky, block } buffers.
    // We should update EnvironmentService to expect One Buffer (ChunkData).
    
    // For now, let's keep the MainMessage structure but pass the full buffer?
    // Or update MainMessage types.
    // I will update types in next step.
    // Here I will cast.
    
    const response: any = {
      type: 'LIGHT_CALCULATED',
      x,
      z,
      // We send the FULL chunk buffer back, because light is mixed in.
      chunkBuffer: buffer
    }

    self.postMessage(response, [buffer])
  }
}
