// src/shared/workers/WorkerVoxelQuery.ts
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { ChunkData } from '../domain/ChunkData'
import { IVoxelQuery } from '../ports/IVoxelQuery'
import { blockRegistry } from '../../modules/world/blocks'
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../constants/ChunkConstants'

/**
 * WorkerVoxelQuery - IVoxelQuery implementation for use in Web Workers.
 * Maintains local chunk cache and provides voxel lookups without main thread access.
 */
export class WorkerVoxelQuery implements IVoxelQuery {
    private chunks = new Map<string, ChunkData>()

    addChunk(chunk: ChunkData): void {
        this.chunks.set(chunk.coord.toKey(), chunk)
    }

    getBlockType(worldX: number, worldY: number, worldZ: number): number {
        const cx = Math.floor(worldX / CHUNK_WIDTH)
        const cz = Math.floor(worldZ / CHUNK_DEPTH)
        const coord = new ChunkCoordinate(cx, cz)
        const chunk = this.chunks.get(coord.toKey())
        if (!chunk) return -1
        const lx = ((worldX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH
        const lz = ((worldZ % CHUNK_DEPTH) + CHUNK_DEPTH) % CHUNK_DEPTH
        return chunk.getBlockId(lx, worldY, lz)
    }

    isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
        // blockType -1 (void) or 0 (air) are not solid.
        const blockType = this.getBlockType(worldX, worldY, worldZ)
        if (blockType === -1 || blockType === 0) return false

        // Check block definition for collidable flag
        const blockDef = blockRegistry.get(blockType)
        return blockDef ? blockDef.collidable : false // Default to false (Air) if unknown
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

    /**
     * Check if a block is water (BlockType 16)
     */
    isBlockWater(worldX: number, worldY: number, worldZ: number): boolean {
        const blockType = this.getBlockType(worldX, worldY, worldZ)
        return blockType === 16
    }
}
