// src/modules/lighting/domain/LightData.ts
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { LightValue } from './LightValue'

export class LightData {
  readonly coord: ChunkCoordinate
  private skyLightR: Uint8Array
  private skyLightG: Uint8Array
  private skyLightB: Uint8Array
  private blockLightR: Uint8Array
  private blockLightG: Uint8Array
  private blockLightB: Uint8Array

  readonly size: number = 24
  readonly height: number = 256

  constructor(coord: ChunkCoordinate) {
    this.coord = coord
    const arraySize = this.size * this.height * this.size

    if (!Number.isFinite(arraySize) || arraySize <= 0) {
      console.error(`❌ LightData: Invalid arraySize=${arraySize} for coord (${coord.x}, ${coord.z})`)
      throw new Error(`Invalid array size: ${arraySize}`)
    }

    // Initialize to 0 (will be calculated by lighting pipeline)
    this.skyLightR = new Uint8Array(arraySize)
    this.skyLightG = new Uint8Array(arraySize)
    this.skyLightB = new Uint8Array(arraySize)
    this.blockLightR = new Uint8Array(arraySize)
    this.blockLightG = new Uint8Array(arraySize)
    this.blockLightB = new Uint8Array(arraySize)
  }

  getLight(x: number, y: number, z: number): LightValue {
    const index = this.getIndex(x, y, z)

    return {
      sky: {
        r: this.skyLightR[index],
        g: this.skyLightG[index],
        b: this.skyLightB[index]
      },
      block: {
        r: this.blockLightR[index],
        g: this.blockLightG[index],
        b: this.blockLightB[index]
      }
    }
  }

  setLight(x: number, y: number, z: number, value: LightValue): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return
    }

    const index = this.getIndex(x, y, z)

    this.skyLightR[index] = Math.max(0, Math.min(15, value.sky.r))
    this.skyLightG[index] = Math.max(0, Math.min(15, value.sky.g))
    this.skyLightB[index] = Math.max(0, Math.min(15, value.sky.b))
    this.blockLightR[index] = Math.max(0, Math.min(15, value.block.r))
    this.blockLightG[index] = Math.max(0, Math.min(15, value.block.g))
    this.blockLightB[index] = Math.max(0, Math.min(15, value.block.b))
  }

  private getIndex(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return 0
    }
    return x + y * this.size + z * this.size * this.height
  }

  getMemoryUsage(): number {
    return (this.size * this.height * this.size) * 6  // 6 bytes per voxel
  }

  // Buffers for Worker Transfer
  getSkyBuffers(): { r: ArrayBuffer, g: ArrayBuffer, b: ArrayBuffer } {
    return {
      r: this.skyLightR.buffer,
      g: this.skyLightG.buffer,
      b: this.skyLightB.buffer
    }
  }

  getBlockBuffers(): { r: ArrayBuffer, g: ArrayBuffer, b: ArrayBuffer } {
    return {
      r: this.blockLightR.buffer,
      g: this.blockLightG.buffer,
      b: this.blockLightB.buffer
    }
  }

  // Simplified packed buffer for fewer transfers (optional, but cleaner)
  // Let's stick to simple accessors for now or a method to hydrate from buffers.
  
  setBuffers(
    sky: { r: ArrayBuffer, g: ArrayBuffer, b: ArrayBuffer }, 
    block: { r: ArrayBuffer, g: ArrayBuffer, b: ArrayBuffer }
  ) {
    this.skyLightR = new Uint8Array(sky.r)
    this.skyLightG = new Uint8Array(sky.g)
    this.skyLightB = new Uint8Array(sky.b)
    this.blockLightR = new Uint8Array(block.r)
    this.blockLightG = new Uint8Array(block.g)
    this.blockLightB = new Uint8Array(block.b)
  }
}
