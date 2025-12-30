import { describe, it, expect, beforeEach } from 'bun:test'
import { LODManager } from '../LODManager'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { PerformanceConfig } from '../../../core/infrastructure/PerformanceConfig'
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

  it('should start transition when LOD level changes', () => {
    // Use a chunk far enough to be at Level 1
    const coord = new ChunkCoordinate(3, 0)
    const oldMesh = new THREE.Mesh(new THREE.BufferGeometry())
    const oldMaterial = new THREE.MeshStandardMaterial()
    oldMesh.material = oldMaterial

    // Start at Level 0
    manager.setCurrentLevel(coord, 0)

    // Camera at origin, chunk at (3,0) is distance 3.5 -> should be Level 1
    const needsTransition = manager.checkForLODChange(coord, camera, oldMesh)
    expect(needsTransition).toBe(true)

    const transition = manager.getActiveTransition(coord)
    expect(transition).toBeDefined()
    expect(transition!.fromLevel).toBe(0)
    expect(transition!.toLevel).toBe(1)
  })

  it('should update transition progress over time', () => {
    const coord = new ChunkCoordinate(0, 0)
    const oldMesh = new THREE.Mesh(new THREE.BufferGeometry())
    oldMesh.material = new THREE.MeshStandardMaterial()

    manager.startTransition(coord, 0, 1, oldMesh, null, oldMesh.material as THREE.Material, null)

    // Initially progress should be 0
    let transition = manager.getActiveTransition(coord)
    expect(transition!.progress).toBe(0)

    // After 150ms (half of 300ms), progress should be ~0.5
    manager.updateTransitions(150)
    transition = manager.getActiveTransition(coord)
    expect(transition!.progress).toBeGreaterThan(0.4)
    expect(transition!.progress).toBeLessThan(0.6)
  })

  it('should complete transition and cleanup after duration', () => {
    const coord = new ChunkCoordinate(0, 0)
    const oldMesh = new THREE.Mesh(new THREE.BufferGeometry())
    const newMesh = new THREE.Mesh(new THREE.BufferGeometry())
    oldMesh.material = new THREE.MeshStandardMaterial()
    newMesh.material = new THREE.MeshStandardMaterial()

    manager.startTransition(
      coord, 0, 1, oldMesh, newMesh,
      oldMesh.material as THREE.Material,
      newMesh.material as THREE.Material
    )

    // Update past completion time
    manager.updateTransitions(350)

    // Transition should be removed
    expect(manager.getActiveTransition(coord)).toBeNull()
  })

  it('should check cache before requesting new mesh', () => {
    const coord = new ChunkCoordinate(0, 0)
    const cachedMesh = new THREE.Mesh(new THREE.BufferGeometry())

    // Store mesh in cache
    manager.getCache().store(coord, 1, cachedMesh, cachedMesh.geometry)

    // Request Level 1 mesh (should hit cache)
    const result = manager.requestMeshForLevel(coord, 1)

    expect(result.fromCache).toBe(true)
    expect(result.mesh).toBe(cachedMesh)
  })

  it('should request from MeshingService on cache miss', () => {
    const coord = new ChunkCoordinate(0, 0)

    // Cache is empty
    const result = manager.requestMeshForLevel(coord, 1)

    expect(result.fromCache).toBe(false)
    expect(result.mesh).toBeNull()
    // In full implementation, would trigger MeshingService request
  })

  it('should cache old mesh when completing transition', () => {
    const coord = new ChunkCoordinate(0, 0)
    const oldMesh = new THREE.Mesh(new THREE.BufferGeometry())
    const newMesh = new THREE.Mesh(new THREE.BufferGeometry())
    oldMesh.material = new THREE.MeshStandardMaterial()
    newMesh.material = new THREE.MeshStandardMaterial()

    manager.startTransition(coord, 0, 1, oldMesh, newMesh, oldMesh.material as THREE.Material, newMesh.material as THREE.Material)

    // Complete transition (should cache Level 0 mesh)
    manager.updateTransitions(350)

    // Level 0 mesh should be in cache
    const cached = manager.getCache().retrieve(coord, 0)
    expect(cached).toBe(oldMesh)
  })
})
