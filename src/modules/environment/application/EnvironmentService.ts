// src/modules/environment/application/EnvironmentService.ts
import * as THREE from 'three'
import { TimeCycle } from '../domain/TimeCycle'
import { ThreeSkyAdapter } from '../adapters/ThreeSkyAdapter'
import { ChunkRequest, MainMessage } from '../workers/types'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ILightingQuery } from '../../../shared/ports/ILightingQuery'
import { ILightStorage } from '../../../shared/ports/ILightStorage'
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { LightValue } from '../../../shared/domain/LightValue'
import { LightingWorkerPool } from '../infrastructure/LightingWorkerPool'
import { BlockType } from '../../world/domain/BlockType'

export class EnvironmentService implements ILightingQuery, ILightStorage {
  private timeCycle: TimeCycle
  private skyAdapter: ThreeSkyAdapter
  private lightingWorkerPool: LightingWorkerPool
  // Use ChunkData instead of LightData
  private chunkDataMap = new Map<string, ChunkData>()
  private voxelQuery: IVoxelQuery | null = null
  private camera: THREE.Camera

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    private eventBus: EventBus
  ) {
    this.camera = camera
    this.timeCycle = new TimeCycle()
    this.skyAdapter = new ThreeSkyAdapter(scene, camera, this.timeCycle)

    // Add Hemisphere Light (Sky + Ground Reflection)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444422, 0.6)
    scene.add(hemiLight)

    // Initialize Lighting Worker Pool (6 workers)
    this.lightingWorkerPool = new LightingWorkerPool(6)

    this.setupEventListeners()

    console.log('🌍 EnvironmentModule initialized (Real-time sync + Voxel Lighting)')
  }

  /**
   * Set voxel query for underwater detection
   */
  setVoxelQuery(voxelQuery: IVoxelQuery): void {
    this.voxelQuery = voxelQuery
  }

  // ILightingQuery Implementation
  getLight(worldX: number, worldY: number, worldZ: number): LightValue {
      const cx = Math.floor(worldX / 24)
      const cz = Math.floor(worldZ / 24)
      const coord = new ChunkCoordinate(cx, cz)
      const data = this.chunkDataMap.get(coord.toKey())

      // Default to DARKNESS if chunk is missing
      if (!data) return { sky: {r:0,g:0,b:0}, block: {r:0,g:0,b:0} }

      const lx = ((worldX % 24) + 24) % 24
      const lz = ((worldZ % 24) + 24) % 24

      // Use ChunkData API
      const b = data.getBlockLight(lx, worldY, lz)
      const s = data.getSkyLight(lx, worldY, lz)

      // Sky light is 4-bit intensity (white)
      return {
          sky: { r: s, g: s, b: s },
          block: b
      }
  }

  isLightingReady(coord: ChunkCoordinate): boolean {
      return this.chunkDataMap.has(coord.toKey())
  }

  // ILightStorage Implementation
  getLightData(coord: ChunkCoordinate): ChunkData | undefined {
      return this.chunkDataMap.get(coord.toKey())
  }

  private setupEventListeners(): void {
      this.eventBus.on('world', 'ChunkGeneratedEvent', (e: any) => {
          // Trigger handled by WorldService call
      })

      this.eventBus.on('world', 'BlockPlacedEvent', (e: any) => {
          this.handleBlockUpdate(e.chunkCoord)
      })
      this.eventBus.on('world', 'BlockRemovedEvent', (e: any) => {
          this.handleBlockUpdate(e.chunkCoord)
      })

      this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
          const key = e.chunkCoord.toKey()
          this.chunkDataMap.delete(key)
      })
  }
  
  private handleBlockUpdate(coord: ChunkCoordinate): void {
      // Placeholder for incremental updates
  }
  
  // Called by WorldService
  async calculateLight(
      coord: ChunkCoordinate,
      neighborVoxels: Record<string, ArrayBuffer>
  ): Promise<void> {
      const result = await this.lightingWorkerPool.calculateLight(coord, neighborVoxels)

      const { x, z, chunkBuffer } = result
      const resultCoord = new ChunkCoordinate(x, z)

      // Create ChunkData from buffer (Bit Packed)
      const chunkData = new ChunkData(resultCoord, chunkBuffer)

      this.chunkDataMap.set(resultCoord.toKey(), chunkData)

      this.eventBus.emit('lighting', {
          type: 'LightingCalculatedEvent',
          chunkCoord: resultCoord,
          lightBuffer: chunkBuffer // Pass the unified buffer back to subscribers (WorldService)
      })
  }

  getWorkerUtilization(): { busy: number; total: number } {
    return this.lightingWorkerPool.getUtilization()
  }

  update(): void {
    // Check if camera is underwater
    this.checkUnderwater()
    this.skyAdapter.update()
  }

  // Hysteresis to prevent rapid underwater state switching at water surface
  private isCurrentlyUnderwater = false
  private lastTransitionY: number | null = null
  private readonly HYSTERESIS_DISTANCE = 0.5 // Must move 0.5 blocks past transition point to switch back

  private checkUnderwater(): void {
    if (!this.voxelQuery) return

    const pos = this.camera.position

    // Check block at camera's eye position
    const blockAtCamera = this.voxelQuery.getBlockType(
      Math.floor(pos.x),
      Math.floor(pos.y),
      Math.floor(pos.z)
    )

    const cameraInWater = blockAtCamera === BlockType.water

    // Apply hysteresis: once we transition, require movement past threshold to transition back
    if (this.lastTransitionY === null) {
      // First check - just set initial state
      this.isCurrentlyUnderwater = cameraInWater
      this.lastTransitionY = pos.y
      this.skyAdapter.setUnderwater(cameraInWater)
      return
    }

    if (this.isCurrentlyUnderwater) {
      // Currently underwater - only surface if we've moved UP past hysteresis AND not in water
      if (!cameraInWater && pos.y > this.lastTransitionY + this.HYSTERESIS_DISTANCE) {
        console.log(`🌊 Surfacing at y=${pos.y.toFixed(2)}`)
        this.isCurrentlyUnderwater = false
        this.lastTransitionY = pos.y
        this.skyAdapter.setUnderwater(false)
      }
    } else {
      // Currently above water - only submerge if we've moved DOWN past hysteresis AND in water
      if (cameraInWater && pos.y < this.lastTransitionY - this.HYSTERESIS_DISTANCE) {
        console.log(`🌊 Submerging at y=${pos.y.toFixed(2)}`)
        this.isCurrentlyUnderwater = true
        this.lastTransitionY = pos.y
        this.skyAdapter.setUnderwater(true)
      }
    }
  }

  isUnderwater(): boolean {
    return this.skyAdapter.getIsUnderwater()
  }

  setHour(hour: number | null): void {
    this.timeCycle.setHour(hour)
    this.skyAdapter.updateLighting()
  }

  /**
   * Get current time of day as decimal (0-24)
   * Returns null if using real time (no override)
   */
  getTimeOfDay(): number | null {
    const time = this.timeCycle.getTime()
    // If we have an override, return it; otherwise return current hour
    return time.hour + time.minute / 60
  }

  getTimeString(): string {
    const { hour, minute } = this.timeCycle.getTime()
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
}
