import * as THREE from 'three'
import { Chunk } from '../terrain/Chunk'

/**
 * GPU texture containing chunk light data
 * Format: RGB format with 6 channels (sky RGB + block RGB)
 */
export class LightDataTexture {
  private texture: THREE.DataTexture
  private data: Uint8Array
  private width: number
  private height: number
  private depth: number

  constructor(chunkSize: number = 24, chunkHeight: number = 256) {
    this.width = chunkSize
    this.height = chunkHeight
    this.depth = chunkSize

    // Create texture data
    // Use 2 texels per block: first for sky RGB, second for block RGB
    // Texture width = chunkSize * 2 (side-by-side layout)
    const textureWidth = this.width * 2  // Double width for 2 texels per block
    const textureHeight = this.height * this.depth
    const size = textureWidth * textureHeight * 3  // 3 bytes per texel (RGB)

    this.data = new Uint8Array(size)

    // Initialize: First half = sky (15,15,15), second half = block (0,0,0)
    for (let y = 0; y < textureHeight; y++) {
      for (let x = 0; x < this.width; x++) {
        // Sky light (left half of texture)
        const skyIndex = (y * textureWidth + x) * 3
        this.data[skyIndex] = 15
        this.data[skyIndex + 1] = 15
        this.data[skyIndex + 2] = 15

        // Block light (right half of texture)
        const blockIndex = (y * textureWidth + (x + this.width)) * 3
        this.data[blockIndex] = 0
        this.data[blockIndex + 1] = 0
        this.data[blockIndex + 2] = 0
      }
    }

    // Create DataTexture
    this.texture = new THREE.DataTexture(
      this.data,
      textureWidth,
      textureHeight,
      THREE.RGBFormat,
      THREE.UnsignedByteType
    )

    this.texture.needsUpdate = true
    this.texture.minFilter = THREE.NearestFilter
    this.texture.magFilter = THREE.NearestFilter
    this.texture.wrapS = THREE.ClampToEdgeWrapping
    this.texture.wrapT = THREE.ClampToEdgeWrapping

    console.log(`📊 LightDataTexture created: ${textureWidth}x${textureHeight}, ${(size / 1024).toFixed(0)}KB`)
  }

  /**
   * Update texture from chunk data
   */
  updateFromChunk(chunk: Chunk): void {
    if (!chunk.dirty) return

    const size = chunk.size
    const height = chunk.height
    const textureWidth = this.width * 2  // Doubled for side-by-side layout

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < size; x++) {
          const light = chunk.getLight(x, y, z)

          // Map 3D (x,y,z) to 2D texture coords
          const v = y * this.depth + z

          // Sky light (left half of texture)
          const skyIndex = (v * textureWidth + x) * 3
          this.data[skyIndex] = light.sky.r
          this.data[skyIndex + 1] = light.sky.g
          this.data[skyIndex + 2] = light.sky.b

          // Block light (right half of texture, offset by width)
          const blockIndex = (v * textureWidth + (x + this.width)) * 3
          this.data[blockIndex] = light.block.r
          this.data[blockIndex + 1] = light.block.g
          this.data[blockIndex + 2] = light.block.b
        }
      }
    }

    this.texture.needsUpdate = true
    chunk.dirty = false
  }

  /**
   * Get Three.js texture for shader
   */
  getTexture(): THREE.DataTexture {
    return this.texture
  }
}
