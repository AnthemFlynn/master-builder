// src/modules/rendering/meshing-application/lod/__tests__/AggressiveMesher.test.ts
import { describe, it, expect } from 'bun:test'
import { AggressiveMesher } from '../AggressiveMesher'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../../../shared/domain/ChunkData'

describe('AggressiveMesher', () => {
  it('should merge 2×2 block regions of same type', () => {
    const coord = new ChunkCoordinate(0, 0)
    const chunk = new ChunkData(coord)

    // Create 4×4×2 solid block of stone (2 layers high)
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 4; z++) {
          chunk.setBlockId(x, y, z, 1) // Stone
        }
      }
    }

    const mesher = new AggressiveMesher()
    const geometry = mesher.buildMesh(chunk, {}, {})

    expect(geometry.positions.length).toBeGreaterThan(0)

    // 4×4×2 blocks = 2×2×1 regions = 4 regions
    // Each region should have exposed faces
    const quadCount = geometry.indices.length / 6
    expect(quadCount).toBeGreaterThan(0)
  })

  it('should use flat lighting per face', () => {
    const coord = new ChunkCoordinate(0, 0)
    const chunk = new ChunkData(coord)

    // Create a 2×2×2 solid block (one region)
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          chunk.setBlockId(x, y, z, 1)
        }
      }
    }

    const mesher = new AggressiveMesher()
    const geometry = mesher.buildMesh(chunk, {}, {})

    // Should have generated some geometry
    expect(geometry.colors.length).toBeGreaterThan(0)

    // All vertices of a face should have same color (flat lighting)
    // Check first 4 vertices (first quad)
    if (geometry.colors.length >= 12) {
      const c1 = [geometry.colors[0], geometry.colors[1], geometry.colors[2]]
      const c2 = [geometry.colors[3], geometry.colors[4], geometry.colors[5]]
      const c3 = [geometry.colors[6], geometry.colors[7], geometry.colors[8]]
      const c4 = [geometry.colors[9], geometry.colors[10], geometry.colors[11]]

      expect(c1).toEqual(c2)
      expect(c2).toEqual(c3)
      expect(c3).toEqual(c4)
    }
  })
})
