import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { blockRegistry } from '../../../modules/blocks'

// Mock implementation for worker
export class WorkerVoxelQuery implements IVoxelQuery {
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
        if (type === -1 || type === 0) return 0 // Air or Void

        const def = blockRegistry.get(type)
        if (!def) return 15 // Unknown = Opaque

        // Use collidable flag: non-collidable blocks (glass, leaves) let light through
        if (!def.collidable) {
            return def.lightAbsorption ? Math.floor(def.lightAbsorption * 15) : 1
        }
        return 15
    }
    
    getChunk(coord: ChunkCoordinate): ChunkData | null {
        return this.chunks.get(coord.toKey()) || null
    }

    clear(): void {
        this.chunks.clear()
    }
}
