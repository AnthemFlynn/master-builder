import { describe, it, expect, beforeEach } from 'bun:test'
import { LODManager } from '../LODManager'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { PerformanceConfig } from '../../../game/infrastructure/PerformanceConfig'
import * as THREE from 'three'

// Mock localStorage for Node.js test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    clear: () => { store = {} },
    removeItem: (key: string) => { delete store[key] }
  }
})()

global.localStorage = localStorageMock as any

describe('LODManager', () => {
  let manager: LODManager
  let config: PerformanceConfig
  let camera: THREE.Camera

  beforeEach(() => {
    config = new PerformanceConfig()
    camera = new THREE.PerspectiveCamera()
    camera.position.set(0, 50, 0)

    manager = new LODManager(config)
  })

  it('should calculate LOD level based on distance', () => {
    // Chunk at distance 1.5 → Level 0
    const coord1 = new ChunkCoordinate(1, 0)
    expect(manager.calculateLODLevel(coord1, camera)).toBe(0)

    // Chunk at distance 3.5 → Level 1
    const coord2 = new ChunkCoordinate(3, 0)
    expect(manager.calculateLODLevel(coord2, camera)).toBe(1)

    // Chunk at distance 5.5 → Level 2
    const coord3 = new ChunkCoordinate(5, 0)
    expect(manager.calculateLODLevel(coord3, camera)).toBe(2)

    // Chunk at distance 7.5 → Level 3
    const coord4 = new ChunkCoordinate(7, 0)
    expect(manager.calculateLODLevel(coord4, camera)).toBe(3)
  })

  it('should apply hysteresis to prevent oscillation', () => {
    // Use chunk at (1, 1) for distance ~2.12 chunks
    const coord = new ChunkCoordinate(1, 1)

    // First call: no current level, use standard threshold
    const level1 = manager.calculateLODLevel(coord, camera)
    expect(level1).toBe(1)  // Distance 2.12 > 2.0, so Level 1

    // Mark as Level 1
    manager.setCurrentLevel(coord, 1)

    // Move camera to distance 1.6 (between hysteresis boundaries)
    // For distance ~1.6, we need sqrt(dx^2 + dz^2) = 1.6 * 24 = 38.4
    // Using (20, 50, 20): dx=-16, dz=-16, dist=sqrt(512)/24=0.94 (too close)
    // Using (8, 50, 8): dx=-28, dz=-28, dist=sqrt(1568)/24=1.65 (good)
    camera.position.set(8, 50, 8)
    const level2 = manager.calculateLODLevel(coord, camera)
    expect(level2).toBe(1)  // Still Level 1 (distance 1.65 > 1.5 hysteresis boundary)

    // Move camera closer to cross hysteresis boundary (distance < 1.5)
    camera.position.set(12, 50, 12) // Distance ~1.41 < 1.5
    const level3 = manager.calculateLODLevel(coord, camera)
    expect(level3).toBe(0)  // Now Level 0 (crossed hysteresis threshold)
  })
})
