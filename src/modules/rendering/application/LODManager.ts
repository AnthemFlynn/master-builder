import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { PerformanceConfig } from '../../game/infrastructure/PerformanceConfig'
import { LODMeshCache } from '../infrastructure/LODMeshCache'

interface LODTransition {
  coord: ChunkCoordinate
  fromLevel: 0 | 1 | 2 | 3
  toLevel: 0 | 1 | 2 | 3
  oldMesh: THREE.Mesh
  newMesh: THREE.Mesh | null
  oldMaterial: THREE.Material
  newMaterial: THREE.Material | null
  startTime: number
  duration: number
  progress: number
}

export class LODManager {
  private currentLODLevels = new Map<string, 0 | 1 | 2 | 3>()
  private transitions = new Map<string, LODTransition>()
  private cache: LODMeshCache
  private clonedMaterials = new Set<THREE.Material>()

  constructor(private config: PerformanceConfig) {
    this.cache = new LODMeshCache(config.lodCacheSize)
  }

  calculateLODLevel(coord: ChunkCoordinate, camera: THREE.Camera): 0 | 1 | 2 | 3 {
    const distance = this.getChunkDistance(coord, camera)
    const currentLevel = this.currentLODLevels.get(coord.toKey())

    // Apply hysteresis if chunk has current level
    if (currentLevel !== undefined) {
      const h = this.config.lodHysteresis

      // Check if we should change levels
      // Going to higher detail (lower LOD number) - require crossing threshold - hysteresis
      if (distance < this.config.lodLevel0Max - h && currentLevel > 0) return 0
      if (distance < this.config.lodLevel1Max - h && currentLevel > 1) return 1
      if (distance < this.config.lodLevel2Max - h && currentLevel > 2) return 2

      // Going to lower detail (higher LOD number) - require crossing threshold + hysteresis
      if (distance > this.config.lodLevel0Max + h && currentLevel === 0) {
        // Continue checking higher levels
      } else if (distance > this.config.lodLevel1Max + h && currentLevel === 1) {
        // Continue checking higher levels
      } else if (distance > this.config.lodLevel2Max + h && currentLevel === 2) {
        return 3
      } else {
        // In hysteresis zone, keep current level
        return currentLevel
      }
    }

    // Standard thresholds for new chunks or when crossing hysteresis boundaries
    if (distance <= this.config.lodLevel0Max) return 0
    if (distance <= this.config.lodLevel1Max) return 1
    if (distance <= this.config.lodLevel2Max) return 2
    return 3
  }

  setCurrentLevel(coord: ChunkCoordinate, level: 0 | 1 | 2 | 3): void {
    this.currentLODLevels.set(coord.toKey(), level)
  }

  requestMeshForLevel(
    coord: ChunkCoordinate,
    level: 0 | 1 | 2 | 3
  ): { fromCache: boolean; mesh: THREE.Mesh | null } {
    // Check cache first
    const cached = this.cache.retrieve(coord, level)
    if (cached) {
      return { fromCache: true, mesh: cached }
    }

    // Cache miss - caller will request from MeshingService
    return { fromCache: false, mesh: null }
  }

  getCache(): LODMeshCache {
    return this.cache
  }

  checkForLODChange(
    coord: ChunkCoordinate,
    camera: THREE.Camera,
    currentMesh: THREE.Mesh
  ): boolean {
    const currentLevel = this.currentLODLevels.get(coord.toKey())
    const targetLevel = this.calculateLODLevel(coord, camera)

    if (currentLevel !== undefined && currentLevel !== targetLevel) {
      // Level change needed
      this.startTransition(
        coord,
        currentLevel,
        targetLevel,
        currentMesh,
        null, // New mesh will be generated
        currentMesh.material as THREE.Material,
        null
      )
      return true
    }

    return false
  }

  startTransition(
    coord: ChunkCoordinate,
    fromLevel: 0 | 1 | 2 | 3,
    toLevel: 0 | 1 | 2 | 3,
    oldMesh: THREE.Mesh,
    newMesh: THREE.Mesh | null,
    oldMaterial: THREE.Material,
    newMaterial: THREE.Material | null
  ): void {
    // Clone old material to avoid modifying shared material during transition
    const clonedOldMaterial = oldMaterial.clone()
    this.clonedMaterials.add(clonedOldMaterial)
    oldMesh.material = clonedOldMaterial

    // Track cloned new material if provided
    if (newMaterial) {
      this.clonedMaterials.add(newMaterial)
    }

    this.transitions.set(coord.toKey(), {
      coord,
      fromLevel,
      toLevel,
      oldMesh,
      newMesh,
      oldMaterial: clonedOldMaterial,
      newMaterial,
      startTime: performance.now(),
      duration: this.config.lodTransitionMs,
      progress: 0
    })
  }

  updateTransitions(deltaTimeMs?: number): void {
    // If deltaTimeMs is provided (testing), use it to advance time
    // Otherwise use real elapsed time (production)
    const useTestTime = deltaTimeMs !== undefined

    for (const [key, transition] of this.transitions) {
      // Calculate progress (0.0 to 1.0)
      let elapsed: number
      if (useTestTime) {
        // For testing: add deltaTimeMs to existing progress
        elapsed = transition.progress * transition.duration + deltaTimeMs!
      } else {
        // For production: use real time
        elapsed = performance.now() - transition.startTime
      }

      transition.progress = Math.min(1.0, elapsed / transition.duration)

      // Update material opacity if both meshes exist
      if (transition.newMesh && transition.newMaterial) {
        transition.oldMaterial.opacity = 1.0 - transition.progress
        transition.oldMaterial.transparent = transition.oldMaterial.opacity < 1.0
        transition.oldMaterial.needsUpdate = true

        transition.newMaterial.opacity = transition.progress
        transition.newMaterial.transparent = transition.newMaterial.opacity < 1.0
        transition.newMaterial.needsUpdate = true
      }

      // Complete transition
      if (transition.progress >= 1.0) {
        this.completeTransition(key, transition)
      }
    }
  }

  private completeTransition(key: string, transition: LODTransition): void {
    // Update current level
    this.currentLODLevels.set(key, transition.toLevel)

    // Dispose cloned materials
    if (this.clonedMaterials.has(transition.oldMaterial)) {
      transition.oldMaterial.dispose()
      this.clonedMaterials.delete(transition.oldMaterial)
    }
    if (transition.newMaterial && this.clonedMaterials.has(transition.newMaterial)) {
      this.clonedMaterials.delete(transition.newMaterial)
      // Don't dispose new material - it's still in use by the mesh
    }

    // Cache old mesh for potential reuse (before disposing it)
    this.cache.store(
      transition.coord,
      transition.fromLevel,
      transition.oldMesh,
      transition.oldMesh.geometry as THREE.BufferGeometry
    )

    // Remove from active transitions
    this.transitions.delete(key)
  }

  getActiveTransition(coord: ChunkCoordinate): LODTransition | null {
    return this.transitions.get(coord.toKey()) ?? null
  }

  getActiveTransitionCount(): number {
    return this.transitions.size
  }

  private getChunkDistance(coord: ChunkCoordinate, camera: THREE.Camera): number {
    const chunkSize = 24
    const chunkCenterX = coord.x * chunkSize + chunkSize / 2
    const chunkCenterZ = coord.z * chunkSize + chunkSize / 2

    const dx = camera.position.x - chunkCenterX
    const dz = camera.position.z - chunkCenterZ

    return Math.sqrt(dx * dx + dz * dz) / chunkSize
  }

  dispose(): void {
    // Dispose all cloned materials to prevent GPU memory leaks
    for (const material of this.clonedMaterials) {
      material.dispose()
    }
    this.clonedMaterials.clear()

    // Clear cache (disposes cached geometries and materials)
    this.cache.clear()

    // Clear state
    this.transitions.clear()
    this.currentLODLevels.clear()
  }
}
