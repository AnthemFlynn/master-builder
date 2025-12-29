import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { ChunkMesher } from '../meshing-application/ChunkMesher'
import { VertexBuilder } from '../meshing-application/VertexBuilder'
import { WorkerMessage, MainMessage } from './types'
import { ILightingQuery } from '../../../modules/environment/ports/ILightingQuery'
import { LightValue } from '../../../modules/environment/domain/voxel-lighting/LightValue'
import { ILightStorage } from '../../../modules/environment/ports/ILightStorage'
import { initializeBlockRegistry } from '../../../modules/blocks'
import { WorkerVoxelQuery } from '../../../shared/workers/WorkerVoxelQuery'

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
        if (worldY < 0) return { sky: {r:0,g:0,b:0}, block: {r:0,g:0,b:0} }
        if (worldY >= 256) return { sky: {r:15,g:15,b:15}, block: {r:0,g:0,b:0} }

        const cx = Math.floor(worldX / 24)
        const cz = Math.floor(worldZ / 24)
        const coord = new ChunkCoordinate(cx, cz)
        const data = this.storage.getLightData(coord)
        
        if (!data) return { sky: {r:0,g:0,b:0}, block: {r:0,g:0,b:0} }
        
        const lx = ((worldX % 24) + 24) % 24
        const lz = ((worldZ % 24) + 24) % 24
        
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

        const { x, z, neighborVoxels, neighborLight } = msg
        const coord = new ChunkCoordinate(x, z)

        // Hydrate Voxels (ChunkData)
        // Note: neighborLight is technically redundant if neighborVoxels are ChunkData buffers
        // But MeshingService might still be sending them separately?
        // MeshingService calls getRawBuffer().
        // If we switched to ChunkData, getRawBuffer() returns the full uint32 array.
        // So neighborVoxels contains LIGHT too.
        // We can ignore neighborLight.

        const voxelQuery = new WorkerVoxelQuery()
        for (const [key, buffer] of Object.entries(neighborVoxels)) {
            const [dx, dz] = key.split(',').map(Number)
            const c = new ChunkCoordinate(x + dx, z + dz)
            const chunk = new ChunkData(c, buffer)
            voxelQuery.addChunk(chunk)
        }

        const lightStorage = new WorkerLightStorage(voxelQuery)
        const lightingQuery = new WorkerLightingQuery(lightStorage)

        // Meshing
        const vertexBuilder = new VertexBuilder(voxelQuery, lightingQuery, x, z)
        const mesher = new ChunkMesher(voxelQuery, lightingQuery, coord)
        mesher.buildMesh(vertexBuilder)

        const { opaque, transparent } = vertexBuilder.getBuffers()

        const transferList: ArrayBuffer[] = []
        const opaqueGeometry: Record<string, any> = {}
        const transparentGeometry: Record<string, any> = {}

        // Process opaque geometry
        for (const [key, buffers] of opaque.entries()) {
            opaqueGeometry[key] = {
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

        // Process transparent geometry (water, glass, etc.)
        for (const [key, buffers] of transparent.entries()) {
            transparentGeometry[key] = {
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

        const endTime = performance.now()
        const duration = endTime - startTime

        const response: MainMessage = {
            type: 'MESH_GENERATED',
            x,
            z,
            opaqueGeometry,
            transparentGeometry,
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
