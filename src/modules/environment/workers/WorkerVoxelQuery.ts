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

        // Use transparent property to determine light transmission
        // Glass (lightAbsorption: 0.0) lets all light through
        // Leaves (lightAbsorption: 0.2) let most light through
        // Water (lightAbsorption: 0.15) slightly absorbs light
        if (def.transparent) {
            // Convert 0.0-1.0 absorption to 0-15 scale
            // lightAbsorption: 0.0 = fully transparent (returns 0)
            // lightAbsorption: 1.0 = fully opaque (returns 15)
            const absorption = def.lightAbsorption ?? 0.1 // Default slight absorption
            return Math.floor(absorption * 15)
        }
        return 15 // Opaque blocks fully absorb light
    }
    
    getChunk(coord: ChunkCoordinate): ChunkData | null {
        return this.chunks.get(coord.toKey()) || null
    }

    clear(): void {
        this.chunks.clear()
    }
}
