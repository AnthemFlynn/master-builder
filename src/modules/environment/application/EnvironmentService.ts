// src/modules/environment/application/EnvironmentService.ts
import * as THREE from 'three'
import { TimeCycle } from '../domain/TimeCycle'
import { ThreeSkyAdapter } from '../adapters/ThreeSkyAdapter'
import { ChunkRequest, MainMessage } from '../workers/types'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../game/infrastructure/EventBus'
import { ILightingQuery } from '../ports/ILightingQuery'
import { ILightStorage } from '../ports/ILightStorage'
import { ChunkData } from '../../../shared/domain/ChunkData'
import { LightValue } from '../domain/voxel-lighting/LightValue'

export class EnvironmentService implements ILightingQuery, ILightStorage {
  private timeCycle: TimeCycle
  private skyAdapter: ThreeSkyAdapter
  private worker: Worker
  // Use ChunkData instead of LightData
  private chunkDataMap = new Map<string, ChunkData>()

  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera,
    private eventBus: EventBus
  ) {
    this.timeCycle = new TimeCycle()
    this.skyAdapter = new ThreeSkyAdapter(scene, camera, this.timeCycle)
    
    // Add Hemisphere Light (Sky + Ground Reflection)
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444422, 0.6)
    scene.add(hemiLight)

    // Initialize Lighting Worker
    this.worker = new Worker("/assets/LightingWorker.js")
    this.worker.onmessage = this.handleWorkerMessage.bind(this)

    this.setupEventListeners()

    console.log('🌍 EnvironmentModule initialized (Real-time sync + Voxel Lighting)')
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
          const { x, z, chunkBuffer } = msg
          const coord = new ChunkCoordinate(x, z)
          
          // Create ChunkData from buffer (Bit Packed)
          const chunkData = new ChunkData(coord, chunkBuffer)
          
          this.chunkDataMap.set(coord.toKey(), chunkData)

          this.eventBus.emit('lighting', {
                  type: 'LightingCalculatedEvent',
                  chunkCoord: coord,
                  lightBuffer: chunkBuffer // Pass the unified buffer back to subscribers (WorldService)
              })
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
