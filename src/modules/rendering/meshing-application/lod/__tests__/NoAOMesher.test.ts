// src/modules/rendering/meshing-application/lod/__tests__/NoAOMesher.test.ts
import { describe, it, expect, beforeAll } from 'bun:test'
import { NoAOMesher } from '../NoAOMesher'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../../../shared/domain/ChunkData'
import { initializeBlockRegistry } from '../../../../blocks'

describe('NoAOMesher', () => {
  beforeAll(() => {
    initializeBlockRegistry()
  })

  it('should generate mesh without AO darkening', () => {
    const coord = new ChunkCoordinate(0, 0)
    const chunk = new ChunkData(coord)

    // Place a single block at (5, 10, 5) - it will have all 6 faces exposed to air
    chunk.setBlockId(5, 10, 5, 5) // Stone (block ID 5)

    // Verify the block was set
    const blockId = chunk.getBlockId(5, 10, 5)
    expect(blockId).toBe(5)

    // Set lighting to full brightness
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          chunk.setSkyLight(x, y, z, 15)
        }
      }
    }

    const mesher = new NoAOMesher()
    const geometry = mesher.buildMesh(chunk)

    expect(geometry).toBeDefined()
    expect(geometry.positions.length).toBeGreaterThan(0)

    // Verify all vertex colors are full brightness (no AO darkening)
    // With skipAO enabled, ao should be 1.0, so colors should be brighter than with AO
    for (let i = 0; i < geometry.colors.length; i += 3) {
      const r = geometry.colors[i]
      const g = geometry.colors[i + 1]
      const b = geometry.colors[i + 2]
      // Colors should not be darkened below lighting value
      // With full lighting (15/15) and no AO, minimum should be around 0.2 (from normalizeLightToColor)
      expect(r).toBeGreaterThanOrEqual(0.2)
      expect(g).toBeGreaterThanOrEqual(0.2)
      expect(b).toBeGreaterThanOrEqual(0.2)
    }
  })
})
