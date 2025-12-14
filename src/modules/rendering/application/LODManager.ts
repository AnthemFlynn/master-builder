import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { PerformanceConfig } from '../../game/infrastructure/PerformanceConfig'

export class LODManager {
  private currentLODLevels = new Map<string, 0 | 1 | 2 | 3>()

  constructor(private config: PerformanceConfig) {}

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

  private getChunkDistance(coord: ChunkCoordinate, camera: THREE.Camera): number {
    const chunkSize = 24
    const chunkCenterX = coord.x * chunkSize + chunkSize / 2
    const chunkCenterZ = coord.z * chunkSize + chunkSize / 2

    const dx = camera.position.x - chunkCenterX
    const dz = camera.position.z - chunkCenterZ

    return Math.sqrt(dx * dx + dz * dz) / chunkSize
  }
}
