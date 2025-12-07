import { initializeBlockRegistry } from '../../../blocks'
import { NoiseGenerator } from '../adapters/NoiseGenerator'
import { VoxelChunk } from '../domain/VoxelChunk'
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { WorkerMessage, MainMessage } from './types'
import { LightingPipeline } from '../lighting-application/LightingPipeline'
import { WorkerVoxelQuery } from './WorkerVoxelQuery'
import { WorkerLightStorage } from './WorkerLightStorage'
import { LightData } from '../lighting-domain/LightData'
import { ChunkMesher } from '../../rendering/meshing-application/ChunkMesher'
import { VertexBuilder } from '../../rendering/meshing-application/VertexBuilder'
import { ILightingQuery } from '../lighting-ports/ILightingQuery'
import { LightValue } from '../lighting-domain/LightValue'

// Initialize blocks definitions
initializeBlockRegistry()

// Create generator instance
const generator = new NoiseGenerator()

// Light Query Adapter for Meshing
class WorkerLightingQuery implements ILightingQuery {
    constructor(private storage: WorkerLightStorage) {}
    
    getLight(worldX: number, worldY: number, worldZ: number): LightValue {
        const cx = Math.floor(worldX / 24)
        const cz = Math.floor(worldZ / 24)
        const coord = new ChunkCoordinate(cx, cz)
        const data = this.storage.getLightData(coord)
        
        if (!data) return { sky: {r:15,g:15,b:15}, block: {r:0,g:0,b:0} } // Default bright? Or dark?
        
        const lx = ((worldX % 24) + 24) % 24
        const lz = ((worldZ % 24) + 24) % 24
        return data.getLight(lx, worldY, lz)
    }
    
    isLightingReady(coord: ChunkCoordinate): boolean {
        return !!this.storage.getLightData(coord)
    }
}

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
  else if (msg.type === 'CALC_LIGHT') {
    const { x, z, neighborVoxels, neighborLight } = msg
    const coord = new ChunkCoordinate(x, z)

    // Reconstruct Voxel Environment
    const voxelQuery = new WorkerVoxelQuery()
    
    for (const [key, buffer] of Object.entries(neighborVoxels)) {
      const [dx, dz] = key.split(',').map(Number)
      const c = new ChunkCoordinate(x + dx, z + dz)
      const chunk = VoxelChunk.fromBuffer(c, buffer)
      voxelQuery.addChunk(chunk)
    }

    // Reconstruct Light Environment (for propagation FROM neighbors)
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
  else if (msg.type === 'GEN_MESH') {
      const { x, z, neighborVoxels, neighborLight } = msg
      const coord = new ChunkCoordinate(x, z)
      
      // Hydrate Voxels
      const voxelQuery = new WorkerVoxelQuery()
      for (const [key, buffer] of Object.entries(neighborVoxels)) {
          const [dx, dz] = key.split(',').map(Number)
          const c = new ChunkCoordinate(x + dx, z + dz)
          const chunk = VoxelChunk.fromBuffer(c, buffer)
          voxelQuery.addChunk(chunk)
      }
      
      // Hydrate Lights
      const lightStorage = new WorkerLightStorage()
      for (const [key, buffers] of Object.entries(neighborLight)) {
          const [dx, dz] = key.split(',').map(Number)
          const c = new ChunkCoordinate(x + dx, z + dz)
          const ld = new LightData(c)
          
          // Manual unpack (Duplicated logic, should refactor)
          const size = 24 * 256 * 24
          const skyArr = new Uint8Array(buffers.sky)
          const blockArr = new Uint8Array(buffers.block)
          const raw = ld as any
          raw.skyLightR = skyArr.slice(0, size)
          raw.skyLightG = skyArr.slice(size, size * 2)
          raw.skyLightB = skyArr.slice(size * 2, size * 3)
          raw.blockLightR = blockArr.slice(0, size)
          raw.blockLightG = blockArr.slice(size, size * 2)
          raw.blockLightB = blockArr.slice(size * 2, size * 3)
          
          lightStorage.addLightData(ld)
      }
      
      const lightingQuery = new WorkerLightingQuery(lightStorage)
      
      // Meshing
      const vertexBuilder = new VertexBuilder(voxelQuery, lightingQuery, x, z)
      const mesher = new ChunkMesher(voxelQuery, lightingQuery, coord)
      mesher.buildMesh(vertexBuilder)
      
      const buffersMap = vertexBuilder.getBuffers()
      const geometry: ChunkResponse['geometry'] = {}
      const transferList: ArrayBuffer[] = []
      
      for (const [key, buffers] of buffersMap.entries()) {
          geometry[key] = {
              positions: buffers.positions.buffer,
              colors: buffers.colors.buffer,
              uvs: buffers.uvs.buffer,
              indices: buffers.indices.buffer
          }
          transferList.push(
              buffers.positions.buffer, 
              buffers.colors.buffer, 
              buffers.uvs.buffer, 
              buffers.indices.buffer
          )
      }
      
      const response: MainMessage = {
          type: 'MESH_GENERATED',
          x,
          z,
          geometry
      }
      
      self.postMessage(response, transferList)
  }
}
