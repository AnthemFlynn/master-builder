// src/modules/environment/application/EnvironmentService.ts
/**
 * EnvironmentService - Environment coordination and sky rendering
 *
 * Refactored to delegate lighting to VoxelLightingService and camera effects
 * to CameraEffectsController. Focuses on sky/time coordination.
 */
import * as THREE from 'three'
import { TimeCycle } from '../domain/TimeCycle'
import { ThreeSkyAdapter } from '../adapters/ThreeSkyAdapter'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ILightingQuery } from '../../../shared/ports/ILightingQuery'
import { ILightStorage } from '../../../shared/ports/ILightStorage'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { LightValue } from '../../../shared/domain/LightValue'

// Extracted classes
import { VoxelLightingService } from './VoxelLightingService'
import { CameraEffectsController } from './CameraEffectsController'

export class EnvironmentService implements ILightingQuery, ILightStorage {
  // Time and sky
  private timeCycle: TimeCycle
  private skyAdapter: ThreeSkyAdapter

  // Extracted components
  private lightingService: VoxelLightingService
  private cameraEffects: CameraEffectsController

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    private eventBus: EventBus
  ) {
    // Initialize time and sky
    this.timeCycle = new TimeCycle()
    this.skyAdapter = new ThreeSkyAdapter(scene, camera, this.timeCycle)

    // Add Hemisphere Light (Sky + Ground Reflection)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444422, 0.6)
    scene.add(hemiLight)

    // Create extracted components
    this.lightingService = new VoxelLightingService({
      eventBus: this.eventBus
    })

    this.cameraEffects = new CameraEffectsController({
      camera,
      onUnderwaterChange: (underwater) => {
        this.skyAdapter.setUnderwater(underwater)
      }
    })

    console.log('🌍 EnvironmentModule initialized (Real-time sync + Voxel Lighting)')
  }

  /**
   * Set voxel query for underwater detection
   */
  setVoxelQuery(voxelQuery: IVoxelQuery): void {
    this.cameraEffects.setVoxelQuery(voxelQuery)
  }

  // === Delegation to VoxelLightingService ===

  getLight(worldX: number, worldY: number, worldZ: number): LightValue {
    return this.lightingService.getLight(worldX, worldY, worldZ)
  }

  isLightingReady(coord: ChunkCoordinate): boolean {
    return this.lightingService.isLightingReady(coord)
  }

  getLightData(coord: ChunkCoordinate): ChunkData | undefined {
    return this.lightingService.getLightData(coord)
  }

  async calculateLight(
    coord: ChunkCoordinate,
    neighborVoxels: Record<string, ArrayBuffer>
  ): Promise<void> {
    return this.lightingService.calculateLight(coord, neighborVoxels)
  }

  getWorkerUtilization(): { busy: number; total: number } {
    return this.lightingService.getWorkerUtilization()
  }

  // === Update Loop ===

  update(): void {
    this.cameraEffects.update()
    this.skyAdapter.update()
  }

  // === Underwater State ===

  isUnderwater(): boolean {
    return this.skyAdapter.getIsUnderwater()
  }

  // === Time Control ===

  setHour(hour: number | null): void {
    this.timeCycle.setHour(hour)
    this.skyAdapter.updateLighting()
  }

  /**
   * Get current time of day as decimal (0-24)
   */
  getTimeOfDay(): number | null {
    const time = this.timeCycle.getTime()
    return time.hour + time.minute / 60
  }

  getTimeString(): string {
    const { hour, minute } = this.timeCycle.getTime()
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
}
