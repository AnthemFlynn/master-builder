import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { ChunkMesher } from '../meshing-application/ChunkMesher'
import { VertexBuilder } from '../meshing-application/VertexBuilder'
import { WorkerMessage, MainMessage } from './types'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../../modules/environment/ports/ILightingQuery'
import { LightValue } from '../../../modules/environment/domain/voxel-lighting/LightValue'
import { ILightStorage } from '../../../modules/environment/ports/ILightStorage'
import { initializeBlockRegistry, blockRegistry } from '../../../modules/blocks'

// Initialize block registry
initializeBlockRegistry()

// Mock implementation for worker
class WorkerVoxelQuery implements IVoxelQuery {
    private chunks = new Map<string, ChunkData>()
    
    addChunk(chunk: ChunkData) {
        this.chunks.set(chunk.coord.toKey(), chunk)
    }
    
    getBlockType(worldX: number, worldY: number, worldZ: number): number {
        const cx = Math.floor(worldX / 24)
        const cz = Math.floor(worldZ / 24)
        const coord = new ChunkCoordinate(cx, cz)
        const chunk = this.chunks.get(coord.toKey())
        if (!chunk) return -1
        const lx = ((worldX % 24) + 24) % 24
        const lz = ((worldZ % 24) + 24) % 24
        return chunk.getBlockId(lx, worldY, lz)
    }
    
    isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
        return this.getBlockType(worldX, worldY, worldZ) !== -1
    }

    getLightAbsorption(worldX: number, worldY: number, worldZ: number): number {
        const type = this.getBlockType(worldX, worldY, worldZ)
        if (type === -1 || type === 0) return 0
        
        const def = blockRegistry.get(type)
        if (!def) return 15
        
        if (def.transparent) {
            return def.lightAbsorption ? Math.floor(def.lightAbsorption * 15) : 1
        }
        return 15
    }
    
    getChunk(coord: ChunkCoordinate): ChunkData | null {
        return this.chunks.get(coord.toKey()) || null
    }
}

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
        
        const buffersMap = vertexBuilder.getBuffers()
        
        const transferList: ArrayBuffer[] = []
        const outputGeometry: Record<string, any> = {}
        
        for (const [key, buffers] of buffersMap.entries()) {
            outputGeometry[key] = {
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
            geometry: outputGeometry
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
