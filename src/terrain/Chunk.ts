/**
 * Chunk - 24×256×24 section of terrain with light data
 */
export class Chunk {
  x: number  // Chunk X coordinate
  z: number  // Chunk Z coordinate
  size: number = 24  // Blocks per side
  height: number = 256  // Max height

  // Light data storage
  // 6 arrays: sky RGB + block RGB
  // Each array: size × height × size = 24 × 256 × 24 = 147,456 bytes
  skyLightR: Uint8Array
  skyLightG: Uint8Array
  skyLightB: Uint8Array
  blockLightR: Uint8Array
  blockLightG: Uint8Array
  blockLightB: Uint8Array

  dirty: boolean = false  // Needs GPU texture update

  constructor(x: number, z: number) {
    this.x = x
    this.z = z

    const arraySize = this.size * this.height * this.size

    // Initialize with defaults
    // Sky light = 15 (full daylight)
    this.skyLightR = new Uint8Array(arraySize).fill(15)
    this.skyLightG = new Uint8Array(arraySize).fill(15)
    this.skyLightB = new Uint8Array(arraySize).fill(15)

    // Block light = 0 (no emission)
    this.blockLightR = new Uint8Array(arraySize)
    this.blockLightG = new Uint8Array(arraySize)
    this.blockLightB = new Uint8Array(arraySize)

    console.log(`📦 Chunk created at (${x}, ${z}) - ${(arraySize * 6 / 1024).toFixed(0)}KB`)
  }

  /**
   * Get light at local chunk coordinates
   */
  getLight(x: number, y: number, z: number): {
    sky: { r: number, g: number, b: number },
    block: { r: number, g: number, b: number }
  } {
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

  /**
   * Set light at local chunk coordinates
   */
  setLight(
    x: number,
    y: number,
    z: number,
    channel: 'sky' | 'block',
    color: { r: number, g: number, b: number }
  ): void {
    const index = this.getIndex(x, y, z)

    if (channel === 'sky') {
      this.skyLightR[index] = Math.max(0, Math.min(15, color.r))
      this.skyLightG[index] = Math.max(0, Math.min(15, color.g))
      this.skyLightB[index] = Math.max(0, Math.min(15, color.b))
    } else {
      this.blockLightR[index] = Math.max(0, Math.min(15, color.r))
      this.blockLightG[index] = Math.max(0, Math.min(15, color.g))
      this.blockLightB[index] = Math.max(0, Math.min(15, color.b))
    }

    this.dirty = true
  }

  /**
   * Convert local coordinates to array index
   */
  private getIndex(x: number, y: number, z: number): number {
    // Bounds check
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      console.warn(`⚠️ Out of bounds: (${x}, ${y}, ${z})`)
      return 0
    }

    return (z * this.height * this.size) + (y * this.size) + x
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    const arraySize = this.size * this.height * this.size
    return arraySize * 6  // 6 arrays
  }
}
