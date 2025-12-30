import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'

interface CachedMesh {
  coord: ChunkCoordinate
  lodLevel: number
  mesh: THREE.Mesh
  geometry: THREE.BufferGeometry
  material: THREE.Material
  lastUsedTime: number
  memorySize: number
}

export class LODMeshCache {
  private cache = new Map<string, CachedMesh>()
  private hits = 0
  private misses = 0

  constructor(private maxCacheSize: number = 30) {}

  private getCacheKey(coord: ChunkCoordinate, level: number): string {
    return `${coord.toKey()}:${level}`
  }

  store(
    coord: ChunkCoordinate,
    level: number,
    mesh: THREE.Mesh,
    geometry: THREE.BufferGeometry
  ): void {
    const key = this.getCacheKey(coord, level)

    this.cache.set(key, {
      coord,
      lodLevel: level,
      mesh,
      geometry,
      material: mesh.material as THREE.Material,
      lastUsedTime: performance.now(),
      memorySize: this.estimateMemory(geometry)
    })

    // LRU eviction if over size
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldest()
    }
  }

  retrieve(coord: ChunkCoordinate, level: number): THREE.Mesh | null {
    const key = this.getCacheKey(coord, level)
    const cached = this.cache.get(key)

    if (cached) {
      this.hits++
      // Update LRU timestamp (move to end)
      cached.lastUsedTime = performance.now()
      this.cache.delete(key)
      this.cache.set(key, cached)
      return cached.mesh
    }

    this.misses++
    return null
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, cached] of this.cache) {
      if (cached.lastUsedTime < oldestTime) {
        oldestTime = cached.lastUsedTime
        oldestKey = key
      }
    }

    if (oldestKey) {
      const cached = this.cache.get(oldestKey)!
      cached.geometry.dispose()
      cached.material.dispose()
      this.cache.delete(oldestKey)
    }
  }

  private estimateMemory(geometry: THREE.BufferGeometry): number {
    let size = 0
    const attributes = geometry.attributes
    for (const key in attributes) {
      const attr = attributes[key]
      size += attr.array.byteLength
    }
    if (geometry.index) {
      size += geometry.index.array.byteLength
    }
    return size / 1024 // Return KB
  }

  getStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size
    }
  }

  clear(): void {
    for (const cached of this.cache.values()) {
      cached.geometry.dispose()
      cached.material.dispose()
    }
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }
}
