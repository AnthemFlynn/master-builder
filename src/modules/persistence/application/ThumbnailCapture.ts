// src/modules/persistence/application/ThumbnailCapture.ts

import * as THREE from 'three'

/**
 * ThumbnailCapture - Captures screenshots for world thumbnails
 *
 * Uses the Three.js renderer to capture the current view and
 * convert it to a base64-encoded image string.
 */
export class ThumbnailCapture {
  private renderer: THREE.WebGLRenderer | null = null

  /**
   * Set the renderer to use for captures
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer
  }

  /**
   * Capture the current view as a thumbnail
   * @param maxSize Maximum width/height of the thumbnail (default 256)
   * @returns Base64-encoded JPEG image
   */
  capture(maxSize = 256): string | null {
    if (!this.renderer) {
      console.warn('[ThumbnailCapture] No renderer set')
      return null
    }

    try {
      // Get the canvas
      const canvas = this.renderer.domElement

      // Create a smaller canvas for the thumbnail
      const thumbnailCanvas = document.createElement('canvas')
      const ctx = thumbnailCanvas.getContext('2d')
      if (!ctx) {
        console.warn('[ThumbnailCapture] Failed to get 2D context')
        return null
      }

      // Calculate thumbnail size maintaining aspect ratio
      const aspectRatio = canvas.width / canvas.height
      let width: number
      let height: number

      if (aspectRatio > 1) {
        width = maxSize
        height = Math.round(maxSize / aspectRatio)
      } else {
        height = maxSize
        width = Math.round(maxSize * aspectRatio)
      }

      thumbnailCanvas.width = width
      thumbnailCanvas.height = height

      // Draw the scaled image
      ctx.drawImage(canvas, 0, 0, width, height)

      // Convert to base64 JPEG (smaller than PNG)
      const dataUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.8)

      console.log(`📸 Captured thumbnail: ${width}x${height}`)
      return dataUrl
    } catch (error) {
      console.error('[ThumbnailCapture] Failed to capture:', error)
      return null
    }
  }

  /**
   * Capture with a slight delay to ensure the frame is rendered
   */
  async captureAsync(maxSize = 256): Promise<string | null> {
    // Wait for next animation frame to ensure render is complete
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(this.capture(maxSize))
      })
    })
  }

  /**
   * Create a placeholder thumbnail when no capture is available
   */
  createPlaceholder(worldType: string): string {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 144  // 16:9 aspect ratio

    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    // Background based on world type
    const colors: Record<string, { bg: string; accent: string }> = {
      default: { bg: '#4A7C4E', accent: '#2E5E32' },    // Green (grass)
      flat: { bg: '#7CB342', accent: '#558B2F' },       // Bright green
      caves: { bg: '#424242', accent: '#212121' },     // Dark gray
      forest: { bg: '#2E7D32', accent: '#1B5E20' },    // Forest green
      crystals: { bg: '#7B1FA2', accent: '#4A148C' }   // Purple
    }

    const { bg, accent } = colors[worldType] || colors.default

    // Fill background
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, 256, 144)

    // Add some visual interest
    ctx.fillStyle = accent
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 256
      const y = 80 + Math.random() * 64
      const size = 20 + Math.random() * 30
      ctx.fillRect(x, y, size, 144 - y)
    }

    // Add sky gradient at top
    const gradient = ctx.createLinearGradient(0, 0, 0, 60)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 60)

    return canvas.toDataURL('image/jpeg', 0.8)
  }
}
