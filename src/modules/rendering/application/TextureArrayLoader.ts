// src/modules/rendering/application/TextureArrayLoader.ts
import * as THREE from 'three'

/**
 * TextureArrayLoader - Loads block textures into a DataArrayTexture
 *
 * Benefits over individual textures:
 * - Single draw call for all blocks (massive performance boost)
 * - Perfect mipmapping per layer (no atlas bleeding)
 * - Simple UVs (0-1), layer index per vertex
 * - Supports up to 2048 texture layers
 */
export class TextureArrayLoader {
  private textureArray: THREE.DataArrayTexture | null = null
  private layerMap = new Map<string, number>()
  private inverseMap = new Map<number, string>()
  private textureSize = 16 // Minecraft standard
  private isLoaded = false
  private loadPromise: Promise<void> | null = null

  /**
   * Load all textures from a list of texture names
   */
  async loadTextures(textureNames: string[], basePath: string = '/textures/block/'): Promise<void> {
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = this.doLoadTextures(textureNames, basePath)
    return this.loadPromise
  }

  private async doLoadTextures(textureNames: string[], basePath: string): Promise<void> {
    // Filter out duplicates and empty names
    const uniqueTextures = [...new Set(textureNames.filter(t => t && t.length > 0))]

    if (uniqueTextures.length === 0) {
      console.warn('⚠️ No textures to load')
      return
    }

    console.log(`📦 Loading ${uniqueTextures.length} textures into array...`)

    // Load all textures as images
    const images = await Promise.all(
      uniqueTextures.map((name, index) =>
        this.loadImage(`${basePath}${name}`)
          .then(img => ({ name, index, img, success: true as const }))
          .catch(err => {
            console.warn(`⚠️ Failed to load texture: ${name}`, err)
            return { name, index, img: null, success: false as const }
          })
      )
    )

    // Filter successful loads and create fallback for failures
    const successfulImages = images.filter(r => r.success && r.img !== null) as {
      name: string
      index: number
      img: HTMLImageElement
      success: true
    }[]

    if (successfulImages.length === 0) {
      console.error('❌ No textures loaded successfully')
      return
    }

    // Determine texture size from first image
    this.textureSize = successfulImages[0].img.width

    // Create the texture array data
    const layerCount = successfulImages.length
    const data = new Uint8Array(this.textureSize * this.textureSize * 4 * layerCount)

    // Create canvas for pixel extraction
    const canvas = document.createElement('canvas')
    canvas.width = this.textureSize
    canvas.height = this.textureSize
    const ctx = canvas.getContext('2d')!

    // Copy each texture into the array
    successfulImages.forEach((result, arrayIndex) => {
      const { name, img } = result

      // Draw image to canvas
      ctx.clearRect(0, 0, this.textureSize, this.textureSize)
      ctx.drawImage(img, 0, 0, this.textureSize, this.textureSize)

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, this.textureSize, this.textureSize)

      // Copy to array buffer
      const offset = arrayIndex * this.textureSize * this.textureSize * 4
      data.set(imageData.data, offset)

      // Record mapping
      this.layerMap.set(name, arrayIndex)
      this.inverseMap.set(arrayIndex, name)
    })

    // Create the DataArrayTexture
    this.textureArray = new THREE.DataArrayTexture(
      data,
      this.textureSize,
      this.textureSize,
      layerCount
    )

    this.textureArray.format = THREE.RGBAFormat
    this.textureArray.type = THREE.UnsignedByteType
    // LinearMipmapLinearFilter (trilinear) reduces shimmering on distant high-contrast blocks
    // NearestMipmapLinearFilter caused aliasing artifacts at distance
    this.textureArray.minFilter = THREE.LinearMipmapLinearFilter
    this.textureArray.magFilter = THREE.NearestFilter // Pixelated look up close
    this.textureArray.wrapS = THREE.RepeatWrapping
    this.textureArray.wrapT = THREE.RepeatWrapping
    this.textureArray.generateMipmaps = true
    
    // Fix for blurry textures at distance/angles (Anisotropic Filtering)
    // We hardcode 16 as standard for PC; mobile might need lower, but Three.js clamps it automatically
    this.textureArray.anisotropy = 16
    
    this.textureArray.needsUpdate = true

    this.isLoaded = true
    console.log(`✅ Texture array created: ${layerCount} layers, ${this.textureSize}x${this.textureSize}`)
  }

  /**
   * Load a single image
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load: ${url}`))
      img.src = url
    })
  }

  /**
   * Get the texture array (must call loadTextures first)
   */
  getTextureArray(): THREE.DataArrayTexture | null {
    return this.textureArray
  }

  /**
   * Get layer index for a texture name
   * Returns 0 (first texture) if not found
   */
  getLayerIndex(textureName: string): number {
    return this.layerMap.get(textureName) ?? 0
  }

  /**
   * Get the layer map as a plain object (for serialization to workers)
   */
  getLayerMapAsObject(): Record<string, number> {
    return Object.fromEntries(this.layerMap)
  }

  /**
   * Get texture name for a layer index
   */
  getTextureName(layerIndex: number): string | undefined {
    return this.inverseMap.get(layerIndex)
  }

  /**
   * Get total number of loaded textures
   */
  getLayerCount(): number {
    return this.layerMap.size
  }

  /**
   * Check if textures are loaded
   */
  getIsLoaded(): boolean {
    return this.isLoaded
  }

  /**
   * Get texture size (usually 16)
   */
  getTextureSize(): number {
    return this.textureSize
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.textureArray) {
      this.textureArray.dispose()
      this.textureArray = null
    }
    this.layerMap.clear()
    this.inverseMap.clear()
    this.isLoaded = false
    this.loadPromise = null
  }
}

// Singleton instance
export const textureArrayLoader = new TextureArrayLoader()
