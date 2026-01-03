// src/modules/meshing/workers/MeshingWorker.ts
/**
 * MeshingWorker - Generates chunk meshes in a Web Worker
 *
 * Uses SOTA packed vertex format (12 bytes per vertex, 4× reduction).
 * Outputs packed geometry for efficient GPU transfer.
 */
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { ChunkMesher } from '../application/ChunkMesher'
import { VertexBuilder } from '../application/VertexBuilder'
import { WorkerMessage, MainMessage, PackedGeometryBuffers } from './types'
import { ILightingQuery } from '../../../shared/ports/ILightingQuery'
import { LightValue } from '../../../shared/domain/LightValue'
import { ILightStorage } from '../../../shared/ports/ILightStorage'
import { initializeBlockRegistry } from '../../../modules/world/blocks'
import { WorkerVoxelQuery } from '../../../shared/workers/WorkerVoxelQuery'
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_HEIGHT } from '../../../shared/constants/ChunkConstants'

// Initialize block registry
initializeBlockRegistry()

// In unified model, VoxelQuery IS LightStorage
class WorkerLightStorage implements ILightStorage {
  constructor(private query: WorkerVoxelQuery) {}

  getLightData(coord: ChunkCoordinate): ChunkData | undefined {
    return this.query.getChunk(coord) || undefined
  }
}

class WorkerLightingQuery implements ILightingQuery {
  constructor(private storage: WorkerLightStorage) {}

  getLight(worldX: number, worldY: number, worldZ: number): LightValue {
    if (worldY < 0) return { sky: { r: 0, g: 0, b: 0 }, block: { r: 0, g: 0, b: 0 } }
    if (worldY >= CHUNK_HEIGHT) return { sky: { r: 15, g: 15, b: 15 }, block: { r: 0, g: 0, b: 0 } }

    const cx = Math.floor(worldX / CHUNK_WIDTH)
    const cz = Math.floor(worldZ / CHUNK_DEPTH)
    const coord = new ChunkCoordinate(cx, cz)
    const data = this.storage.getLightData(coord)

    if (!data) return { sky: { r: 0, g: 0, b: 0 }, block: { r: 0, g: 0, b: 0 } }

    const lx = ((worldX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
    const lz = ((worldZ % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH

    const b = data.getBlockLight(lx, worldY, lz)
    const s = data.getSkyLight(lx, worldY, lz)

    return {
      sky: { r: s, g: s, b: s },
      block: b
    }
  }

  isLightingReady(coord: ChunkCoordinate): boolean {
    return !!this.storage.getLightData(coord)
  }
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const msg = e.data

    if (msg.type === 'GEN_MESH') {
      const startTime = performance.now()

      const { x, z, neighborVoxels, textureLayerMap } = msg
      const coord = new ChunkCoordinate(x, z)

      // Hydrate Voxels (ChunkData includes light data)
      const voxelQuery = new WorkerVoxelQuery()
      for (const [key, buffer] of Object.entries(neighborVoxels)) {
        const [dx, dz] = key.split(',').map(Number)
        const c = new ChunkCoordinate(x + dx, z + dz)
        const chunk = new ChunkData(c, buffer)
        voxelQuery.addChunk(chunk)
      }

      const lightStorage = new WorkerLightStorage(voxelQuery)
      const lightingQuery = new WorkerLightingQuery(lightStorage)

      // Meshing with packed vertex format
      const vertexBuilder = new VertexBuilder(voxelQuery, lightingQuery, x, z)

      // Set texture layer lookup if provided
      if (textureLayerMap) {
        vertexBuilder.setTextureLayerLookup(name => textureLayerMap[name] ?? 0)
      }

      const mesher = new ChunkMesher(voxelQuery, lightingQuery, coord)
      mesher.buildMesh(vertexBuilder)

      // Get packed buffers (12 bytes per vertex, 4× reduction)
      const { opaque, transparent, vegetation, nonEmptySections } = vertexBuilder.getPackedBuffers()

      const transferList: ArrayBuffer[] = []
      const opaquePackedGeometry: Record<string, PackedGeometryBuffers> = {}
      const transparentPackedGeometry: Record<string, PackedGeometryBuffers> = {}

      // Process opaque geometry (packed format)
      for (const [key, buffers] of opaque.entries()) {
        opaquePackedGeometry[key] = {
          packedVertices: buffers.packedVertices.buffer,
          indices: buffers.indices.buffer
        }
        transferList.push(
          buffers.packedVertices.buffer,
          buffers.indices.buffer
        )
      }

      // Process transparent geometry (packed format)
      for (const [key, buffers] of transparent.entries()) {
        transparentPackedGeometry[key] = {
          packedVertices: buffers.packedVertices.buffer,
          indices: buffers.indices.buffer
        }
        transferList.push(
          buffers.packedVertices.buffer,
          buffers.indices.buffer
        )
      }

      // Process vegetation instances
      let vegetationInstances: ArrayBuffer | undefined
      let vegetationCount = 0
      if (vegetation.count > 0) {
        vegetationInstances = vegetation.instances.buffer
        vegetationCount = vegetation.count
        transferList.push(vegetationInstances)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      const response: MainMessage = {
        type: 'MESH_GENERATED',
        x,
        z,
        opaquePackedGeometry,
        transparentPackedGeometry,
        nonEmptySections: Array.from(nonEmptySections),
        vegetationInstances,
        vegetationCount,
        timingMs: duration
      }

      self.postMessage(response, transferList)
    }
  } catch (error) {
    console.error('[MeshingWorker] Error processing message:', error)
    self.postMessage({
      type: 'MESH_ERROR',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
