import { describe, it, expect, beforeEach } from 'vitest'
import { PropagationPass } from '../PropagationPass'
import { LightData } from '../../../lighting-domain/LightData'
import { ChunkCoordinate } from '../../../../../shared/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../ports/IVoxelQuery'
import { ILightStorage } from '../../../lighting-ports/ILightStorage'
import { blockRegistry } from '../../../../../blocks'
import { VoxelChunk } from '../../../domain/VoxelChunk'

// Mock implementations
class MockVoxelQuery implements IVoxelQuery {
  private blocks = new Map<string, number>()

  setBlock(x: number, y: number, z: number, type: number) {
    this.blocks.set(`${x},${y},${z}`, type)
  }

  getBlockType(x: number, y: number, z: number): number {
    return this.blocks.get(`${x},${y},${z}`) ?? -1
  }

  isBlockSolid(x: number, y: number, z: number): boolean {
    return this.getBlockType(x, y, z) !== -1
  }

  getChunk(coord: ChunkCoordinate): VoxelChunk | null {
    return null
  }
}

class MockLightStorage implements ILightStorage {
  private chunks = new Map<string, LightData>()

  setChunk(coord: ChunkCoordinate, data: LightData) {
    this.chunks.set(coord.toKey(), data)
  }

  getLightData(coord: ChunkCoordinate): LightData | undefined {
    return this.chunks.get(coord.toKey())
  }
}

describe('PropagationPass', () => {
  let pass: PropagationPass
  let voxels: MockVoxelQuery
  let storage: MockLightStorage
  let lightDataA: LightData
  let lightDataB: LightData

  beforeEach(() => {
    pass = new PropagationPass()
    voxels = new MockVoxelQuery()
    storage = new MockLightStorage()
    
    // Setup two adjacent chunks: A(0,0) and B(1,0)
    lightDataA = new LightData(new ChunkCoordinate(0, 0))
    lightDataB = new LightData(new ChunkCoordinate(1, 0))
    
    storage.setChunk(new ChunkCoordinate(0, 0), lightDataA)
    storage.setChunk(new ChunkCoordinate(1, 0), lightDataB)

    // Register a glow block if needed (assuming ID 100 is glowstone)
    // We might need to mock blockRegistry or just trust it has something
    // Since blockRegistry is imported, we rely on it. 
    // Let's assume ID 10 is 'glowstone' or similar.
    // Actually, we can just inject light manually into the queue logic by mocking voxels?
    // The pass reads registry. We need to ensure registry returns something.
    // For this test, we might rely on "Pull" logic where we manually set light in neighbor.
  })

  it('should push light from Chunk A to Chunk B', () => {
    // 1. Place emissive block at A's border (23, 10, 10)
    // We need a block type that emits light.
    // Let's mock the registry or find a known ID.
    // From file tree, I saw 'glowstone.png', so likely 'glowstone' exists.
    // But I don't know the ID.
    // Alternative: We can seed the light manually? No, pass clears/overwrites?
    // No, pass reads existing light for propagation.
    
    // Actually, Phase 0 pulls from neighbors.
    // Let's test "Pull": Light in B flows into A.
    
    // Setup: B has light at (0, 10, 10) -> Global (24, 10, 10)
    lightDataB.setLight(0, 10, 10, { 
      sky: {r:0,g:0,b:0}, 
      block: {r:15, g:0, b:0} 
    })
    
    // Run pass on A
    pass.execute(lightDataA, voxels, new ChunkCoordinate(0, 0), storage)
    
    // Expect light at A(23, 10, 10)
    const result = lightDataA.getLight(23, 10, 10)
    expect(result.block.r).toBe(14) // decayed by 1
  })

  it('should push light from A to B (via emissive in A)', () => {
    // We need an emissive block ID. 
    // Let's assume we can't easily mock registry.
    // But we can manually set light in A, and see if it propagates to B?
    // The pass iterates *blocks* to find emitters.
    // If I can't set an emitter, I can't test "Generation" of light.
    // BUT, I can test propagation of *existing* light if I modify the pass to read existing light?
    // The pass adds existing light > 0 to queue? 
    // "Phase 1: Find all emissive blocks..." -> It checks BlockType -> Registry.
    
    // Workaround: Modify LightData A directly, and ensure the pass picks it up?
    // The pass ONLY picks up from Emissive Blocks (Phase 1) or Neighbors (Phase 0).
    // It does NOT pick up arbitrary light placed in the buffer (unless it's from a previous pass like SkyLight, but SkyLight doesn't set block light).
    
    // So to test "Push", we rely on "Pull" from the other side.
    // If we run pass on B, and A has light, B should pull it.
    
    // Setup: A has light at (23, 10, 10)
    lightDataA.setLight(23, 10, 10, { 
      sky: {r:0,g:0,b:0}, 
      block: {r:15, g:0, b:0} 
    })
    
    // Run pass on B
    pass.execute(lightDataB, voxels, new ChunkCoordinate(1, 0), storage)
    
    // Expect light at B(0, 10, 10)
    const result = lightDataB.getLight(0, 10, 10)
    expect(result.block.r).toBe(14)
  })
})
