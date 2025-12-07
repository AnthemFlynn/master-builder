// src/modules/environment/application/EnvironmentService.ts
import * as THREE from 'three'
import { TimeCycle } from '../domain/TimeCycle'
import { ThreeSkyAdapter } from '../adapters/ThreeSkyAdapter'
import LightingWorker from '../workers/LightingWorker?worker'
import { ChunkRequest, MainMessage } from '../workers/types'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../game/infrastructure/EventBus'
import { ILightingQuery } from '../ports/ILightingQuery'
import { ILightStorage } from '../ports/ILightStorage'
import { LightData } from '../domain/voxel-lighting/LightData'
import { LightValue } from '../domain/voxel-lighting/LightValue'

export class EnvironmentService implements ILightingQuery, ILightStorage {
  private timeCycle: TimeCycle
  private skyAdapter: ThreeSkyAdapter
  private worker: Worker
  private lightDataMap = new Map<string, LightData>()

  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera,
    private eventBus?: EventBus
  ) {
    this.timeCycle = new TimeCycle()
    this.skyAdapter = new ThreeSkyAdapter(scene, camera, this.timeCycle)
    
    // Initialize Lighting Worker
    this.worker = new LightingWorker()
    this.worker.onmessage = this.handleWorkerMessage.bind(this)

    if (this.eventBus) {
        this.setupEventListeners()
    }

    console.log('🌍 EnvironmentModule initialized (Real-time sync + Voxel Lighting)')
  }

  // ILightingQuery Implementation
  getLight(worldX: number, worldY: number, worldZ: number): LightValue {
      const cx = Math.floor(worldX / 24)
      const cz = Math.floor(worldZ / 24)
      const coord = new ChunkCoordinate(cx, cz)
      const data = this.lightDataMap.get(coord.toKey())
      
      if (!data) return { sky: {r:15,g:15,b:15}, block: {r:0,g:0,b:0} }
      
      const lx = ((worldX % 24) + 24) % 24
      const lz = ((worldZ % 24) + 24) % 24
      // LightData uses local Y (0-255)
      return data.getLight(lx, worldY, lz)
  }

  isLightingReady(coord: ChunkCoordinate): boolean {
      return this.lightDataMap.has(coord.toKey())
  }

  // ILightStorage Implementation
  getLightData(coord: ChunkCoordinate): LightData | undefined {
      return this.lightDataMap.get(coord.toKey())
  }

  private setupEventListeners(): void {
      // Listen for chunk generation -> Trigger lighting
      // This is now handled by WorldService delegating to calculateLight()
  }
  
  // Called by WorldService
  calculateLight(
      coord: ChunkCoordinate, 
      neighborVoxels: Record<string, ArrayBuffer>
  ): void {
      const request: ChunkRequest = {
          type: 'CALC_LIGHT',
          x: coord.x,
          z: coord.z,
          neighborVoxels
      }
      this.worker.postMessage(request)
  }

  private handleWorkerMessage(e: MessageEvent<MainMessage>) {
      const msg = e.data
      if (msg.type === 'LIGHT_CALCULATED') {
          const { x, z, lightBuffer } = msg
          const coord = new ChunkCoordinate(x, z)
          
          // Hydrate LightData
          const lightData = new LightData(coord)
          const size = 24 * 256 * 24
          const skyArr = new Uint8Array(lightBuffer.sky)
          const blockArr = new Uint8Array(lightBuffer.block)
          
          // Manual unpack (TODO: Refactor LightData to have setBuffers)
          const raw = lightData as any
          raw.skyLightR = skyArr.slice(0, size)
          raw.skyLightG = skyArr.slice(size, size * 2)
          raw.skyLightB = skyArr.slice(size * 2, size * 3)
          raw.blockLightR = blockArr.slice(0, size)
          raw.blockLightG = blockArr.slice(size, size * 2)
          raw.blockLightB = blockArr.slice(size * 2, size * 3)
          
          this.lightDataMap.set(coord.toKey(), lightData)

          if (this.eventBus) {
              this.eventBus.emit('lighting', {
                  type: 'LightingCalculatedEvent',
                  chunkCoord: coord,
                  lightBuffer
              })
          }
      }
  }

  update(): void {
    this.skyAdapter.update()
  }

  setHour(hour: number | null): void {
    this.timeCycle.setHour(hour)
    this.skyAdapter.updateLighting()
  }
  
  getTimeString(): string {
    const { hour, minute } = this.timeCycle.getTime()
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }
}
