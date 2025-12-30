import { describe, it, expect, beforeEach } from 'bun:test'
import { LODMeshCache } from '../LODMeshCache'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import * as THREE from 'three'

describe('LODMeshCache', () => {
  let cache: LODMeshCache

  beforeEach(() => {
    cache = new LODMeshCache(5) // Small size for testing
  })

  it('should store and retrieve mesh', () => {
    const coord = new ChunkCoordinate(0, 0)
    const mesh = new THREE.Mesh()
    const geometry = new THREE.BufferGeometry()
    mesh.geometry = geometry

    cache.store(coord, 0, mesh, geometry)
    const retrieved = cache.retrieve(coord, 0)

    expect(retrieved).toBe(mesh)
  })

  it('should return null for cache miss', () => {
    const coord = new ChunkCoordinate(1, 1)
    const retrieved = cache.retrieve(coord, 0)

    expect(retrieved).toBeNull()
  })

  it('should evict oldest when cache full', () => {
    // Fill cache to capacity
    for (let i = 0; i < 5; i++) {
      const coord = new ChunkCoordinate(i, 0)
      const mesh = new THREE.Mesh(new THREE.BufferGeometry())
      cache.store(coord, 0, mesh, mesh.geometry)
    }

    // Add 6th item, should evict first
    const coord6 = new ChunkCoordinate(5, 0)
    const mesh6 = new THREE.Mesh(new THREE.BufferGeometry())
    cache.store(coord6, 0, mesh6, mesh6.geometry)

    // First item should be evicted
    const retrieved = cache.retrieve(new ChunkCoordinate(0, 0), 0)
    expect(retrieved).toBeNull()

    // 6th item should be present
    const retrieved6 = cache.retrieve(coord6, 0)
    expect(retrieved6).toBe(mesh6)
  })

  it('should update LRU on retrieval', () => {
    // Add 5 items
    for (let i = 0; i < 5; i++) {
      const coord = new ChunkCoordinate(i, 0)
      cache.store(coord, 0, new THREE.Mesh(new THREE.BufferGeometry()), new THREE.BufferGeometry())
    }

    // Retrieve item 0 (makes it most recent)
    cache.retrieve(new ChunkCoordinate(0, 0), 0)

    // Add 6th item (should evict item 1, not 0)
    cache.store(new ChunkCoordinate(5, 0), 0, new THREE.Mesh(new THREE.BufferGeometry()), new THREE.BufferGeometry())

    expect(cache.retrieve(new ChunkCoordinate(0, 0), 0)).not.toBeNull()
    expect(cache.retrieve(new ChunkCoordinate(1, 0), 0)).toBeNull()
  })

  it('should track cache stats', () => {
    const coord = new ChunkCoordinate(0, 0)
    cache.store(coord, 0, new THREE.Mesh(new THREE.BufferGeometry()), new THREE.BufferGeometry())

    cache.retrieve(coord, 0)  // Hit
    cache.retrieve(new ChunkCoordinate(1, 1), 0)  // Miss

    const stats = cache.getStats()
    expect(stats.hits).toBe(1)
    expect(stats.misses).toBe(1)
    expect(stats.hitRate).toBe(0.5)
  })
})
