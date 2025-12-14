// src/modules/rendering/meshing-application/lod/__tests__/OuterShellMesher.test.ts
import { describe, it, expect } from 'bun:test'
import { OuterShellMesher } from '../OuterShellMesher'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../../../shared/domain/ChunkData'

describe('OuterShellMesher', () => {
  it('should render only exposed faces', () => {
    const coord = new ChunkCoordinate(0, 0)
    const chunk = new ChunkData(coord)

    // Create 3×3×3 solid cube
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
          chunk.setBlockId(x, y, z, 1)
        }
      }
    }

    const mesher = new OuterShellMesher()
    const geometry = mesher.buildMesh(chunk, {}, {})

    expect(geometry.positions.length).toBeGreaterThan(0)

    // Only outer shell should have faces
    // Center block (1,1,1) has no exposed faces, should not generate quads
    // Outer blocks should generate quads
    // With 3×3×3 cube, surface area = 6 sides × 9 quads = 54 quads = 216 vertices
    const vertexCount = geometry.positions.length / 3
    expect(vertexCount).toBe(216)
  })

  it('should not render internal blocks', () => {
    const coord = new ChunkCoordinate(0, 0)
    const chunk = new ChunkData(coord)

    // Create 5×5×5 solid cube
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        for (let z = 0; z < 5; z++) {
          chunk.setBlockId(x, y, z, 1)
        }
      }
    }

    const mesher = new OuterShellMesher()
    const geometry = mesher.buildMesh(chunk, {}, {})

    // Only surface blocks (3×3×6 faces), internal 3×3×3 = 27 blocks not rendered
    // Surface quads = 6 sides × 25 quads = 150 quads = 600 vertices
    const vertexCount = geometry.positions.length / 3
    expect(vertexCount).toBe(600)
  })
})
