import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { VoxelChunk } from '../../../modules/world/domain/VoxelChunk'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'

import { blockRegistry } from '../../../modules/blocks'

// Mock implementation for worker
export class WorkerVoxelQuery implements IVoxelQuery {
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

    getLightAbsorption(worldX: number, worldY: number, worldZ: number): number {
        const type = this.getBlockType(worldX, worldY, worldZ)
        if (type === -1) return 0 // Air
        
        const def = blockRegistry.get(type)
        if (!def) return 15 // Unknown = Opaque
        
        // Definition uses 0-1 float? Or is it undefined?
        // Default to 15 (solid) if not specified or opaque
        if (def.transparent) {
            return def.lightAbsorption ? Math.floor(def.lightAbsorption * 15) : 1
        }
        return 15
    }
    
    getChunk(coord: ChunkCoordinate): VoxelChunk | null {
        return this.chunks.get(coord.toKey()) || null
    }
}
