/**
 * TestChunkData - Test utilities for creating ChunkData instances
 *
 * Provides factory functions for creating chunks with known block patterns.
 */

import { ChunkData } from '../shared/domain/ChunkData'
import { ChunkCoordinate } from '../shared/domain/ChunkCoordinate'
import { BlockType } from '../modules/world/domain/BlockType'

/**
 * Create an empty chunk (all air)
 */
export function createEmptyChunk(x: number = 0, z: number = 0): ChunkData {
  return new ChunkData(new ChunkCoordinate(x, z))
}

/**
 * Create a chunk with a flat ground at specified height
 */
export function createFlatChunk(
  x: number = 0,
  z: number = 0,
  groundHeight: number = 64,
  blockType: number = BlockType.stone
): ChunkData {
  const chunk = new ChunkData(new ChunkCoordinate(x, z))

  for (let lx = 0; lx < 24; lx++) {
    for (let lz = 0; lz < 24; lz++) {
      for (let y = 0; y < groundHeight; y++) {
        chunk.setBlockId(lx, y, lz, blockType)
      }
    }
  }

  return chunk
}

/**
 * Create a chunk with a single block at specified position
 */
export function createSingleBlockChunk(
  x: number = 0,
  z: number = 0,
  blockX: number = 12,
  blockY: number = 64,
  blockZ: number = 12,
  blockType: number = BlockType.stone
): ChunkData {
  const chunk = new ChunkData(new ChunkCoordinate(x, z))
  chunk.setBlockId(blockX, blockY, blockZ, blockType)
  return chunk
}

/**
 * Create a chunk filled with a specific block type
 */
export function createFilledChunk(
  x: number = 0,
  z: number = 0,
  blockType: number = BlockType.stone,
  maxHeight: number = 48
): ChunkData {
  const chunk = new ChunkData(new ChunkCoordinate(x, z))

  for (let lx = 0; lx < 24; lx++) {
    for (let lz = 0; lz < 24; lz++) {
      for (let y = 0; y < maxHeight; y++) {
        chunk.setBlockId(lx, y, lz, blockType)
      }
    }
  }

  return chunk
}

/**
 * Create a chunk with a realistic terrain profile (grass on top, dirt, then stone)
 */
export function createTerrainChunk(
  x: number = 0,
  z: number = 0,
  baseHeight: number = 60
): ChunkData {
  const chunk = new ChunkData(new ChunkCoordinate(x, z))

  for (let lx = 0; lx < 24; lx++) {
    for (let lz = 0; lz < 24; lz++) {
      // Simple height variation
      const height = baseHeight + Math.floor(Math.sin(lx * 0.5) * 3 + Math.cos(lz * 0.5) * 2)

      for (let y = 0; y < height; y++) {
        if (y === height - 1) {
          chunk.setBlockId(lx, y, lz, BlockType.grass)
        } else if (y > height - 5) {
          chunk.setBlockId(lx, y, lz, BlockType.dirt)
        } else {
          chunk.setBlockId(lx, y, lz, BlockType.stone)
        }
      }
    }
  }

  return chunk
}

/**
 * Create a chunk with a simple cave at specified location
 */
export function createCaveChunk(
  x: number = 0,
  z: number = 0,
  caveY: number = 30,
  caveRadius: number = 5
): ChunkData {
  const chunk = createFilledChunk(x, z, BlockType.stone, 64)

  // Carve out spherical cave
  const centerX = 12
  const centerZ = 12

  for (let lx = 0; lx < 24; lx++) {
    for (let lz = 0; lz < 24; lz++) {
      for (let y = caveY - caveRadius; y < caveY + caveRadius; y++) {
        const dx = lx - centerX
        const dy = y - caveY
        const dz = lz - centerZ
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < caveRadius) {
          chunk.setBlockId(lx, y, lz, BlockType.air)
        }
      }
    }
  }

  return chunk
}

/**
 * Create a chunk with water at specified height
 */
export function createWaterChunk(
  x: number = 0,
  z: number = 0,
  waterLevel: number = 60,
  groundLevel: number = 55
): ChunkData {
  const chunk = new ChunkData(new ChunkCoordinate(x, z))

  for (let lx = 0; lx < 24; lx++) {
    for (let lz = 0; lz < 24; lz++) {
      // Ground
      for (let y = 0; y < groundLevel; y++) {
        chunk.setBlockId(lx, y, lz, BlockType.sand)
      }
      // Water
      for (let y = groundLevel; y < waterLevel; y++) {
        chunk.setBlockId(lx, y, lz, BlockType.water)
      }
    }
  }

  return chunk
}

/**
 * Create multiple chunks forming a neighborhood (for collision/lighting tests)
 */
export function createChunkNeighborhood(
  centerX: number = 0,
  centerZ: number = 0,
  groundHeight: number = 64
): Map<string, ChunkData> {
  const chunks = new Map<string, ChunkData>()

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const cx = centerX + dx
      const cz = centerZ + dz
      const key = `${cx},${cz}`
      chunks.set(key, createFlatChunk(cx, cz, groundHeight))
    }
  }

  return chunks
}

/**
 * Helper to set lighting values on a chunk for testing
 */
export function setChunkLighting(
  chunk: ChunkData,
  skyLight: number = 15,
  blockLight: number = 0
): void {
  for (let lx = 0; lx < 24; lx++) {
    for (let lz = 0; lz < 24; lz++) {
      for (let y = 0; y < 256; y++) {
        if (chunk.getBlockId(lx, y, lz) === BlockType.air) {
          chunk.setSkyLight(lx, y, lz, skyLight)
          chunk.setBlockLight(lx, y, lz, { r: blockLight, g: blockLight, b: blockLight })
        }
      }
    }
  }
}
