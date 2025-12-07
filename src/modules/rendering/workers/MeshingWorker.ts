import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { VoxelChunk } from '../../../modules/world/domain/VoxelChunk'
import { LightData } from '../../../modules/environment/domain/voxel-lighting/LightData'
import { ChunkMesher } from '../meshing-application/ChunkMesher'
import { VertexBuilder } from '../meshing-application/VertexBuilder'
import { WorkerMessage, MainMessage } from './types'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ILightingQuery } from '../../../modules/environment/ports/ILightingQuery'
import { LightValue } from '../../../modules/environment/domain/voxel-lighting/LightValue'
import { ILightStorage } from '../../../modules/environment/ports/ILightStorage'
import { blockRegistry } from '../../../blocks'

// Initialize block registry (assumes lazy loading of textures)
// We need blocks for culling properties (transparency, etc.)
// No explicit initialize call if blockRegistry is singleton and self-initializing?
// Actually, initializeBlockRegistry is a function in 'blocks/index.ts'.
// We probably need to call it.
// Let's assume we can import it.
// Wait, standard way is `import { initializeBlockRegistry } from '../../../blocks'`
// and call it.

// Mock implementation for worker
class WorkerVoxelQuery implements IVoxelQuery {
    private chunks = new Map<string, VoxelChunk>()
    
    addChunk(chunk: VoxelChunk) {
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
        return chunk.getBlockType(lx, worldY, lz)
    }
    
    isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
        return this.getBlockType(worldX, worldY, worldZ) !== -1
    }
    
    getChunk(coord: ChunkCoordinate): VoxelChunk | null {
        return this.chunks.get(coord.toKey()) || null
    }
}

class WorkerLightStorage implements ILightStorage {
    private chunks = new Map<string, LightData>()
    
    addLightData(data: LightData) {
        this.chunks.set(data.coord.toKey(), data)
    }
    
    getLightData(coord: ChunkCoordinate): LightData | undefined {
        return this.chunks.get(coord.toKey())
    }
}

class WorkerLightingQuery implements ILightingQuery {
    constructor(private storage: WorkerLightStorage) {}
    
    getLight(worldX: number, worldY: number, worldZ: number): LightValue {
        const cx = Math.floor(worldX / 24)
        const cz = Math.floor(worldZ / 24)
        const coord = new ChunkCoordinate(cx, cz)
        const data = this.storage.getLightData(coord)
        if (!data) return { sky: {r:15,g:15,b:15}, block: {r:0,g:0,b:0} }
        
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
    
    if (msg.type === 'GEN_MESH') {
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
            
            // Manual unpack
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
        const geometry: MainMessage['geometry'] = {} // Type constraint check?
        // Typescript in worker is loose unless strict.
        // Let's just build the object.
        
        const transferList: ArrayBuffer[] = []
        
        // We need to match the MainMessage structure exactly
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
}
