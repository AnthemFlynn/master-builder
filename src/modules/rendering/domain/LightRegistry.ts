// src/modules/rendering/domain/LightRegistry.ts
import * as THREE from 'three'

/**
 * Light source tracked for volumetric lighting
 */
export interface LightSource {
  position: THREE.Vector3
  color: THREE.Color
  intensity: number  // 0-15 from block lightEmission
}

/**
 * LightRegistry - Tracks emissive block positions for volumetric lighting
 *
 * Chunks register their light sources when meshed; removed when unloaded.
 * getNearestLights() returns the closest N lights for the shader.
 */
export class LightRegistry {
  private lights = new Map<string, LightSource[]>()
  private sunPosition = new THREE.Vector3(100, 200, 100)
  private sunColor = new THREE.Color(1.0, 0.95, 0.8)
  private sunIntensity = 15

  /**
   * Register light sources for a chunk
   */
  addChunkLights(chunkKey: string, lights: LightSource[]): void {
    this.lights.set(chunkKey, lights)
  }

  /**
   * Remove light sources when chunk unloads
   */
  removeChunkLights(chunkKey: string): void {
    this.lights.delete(chunkKey)
  }

  /**
   * Clear all lights (world reset)
   */
  clear(): void {
    this.lights.clear()
  }

  /**
   * Update sun position (from ThreeSkyAdapter)
   */
  setSunPosition(position: THREE.Vector3): void {
    this.sunPosition.copy(position)
  }

  /**
   * Update sun color based on time of day
   */
  setSunColor(color: THREE.Color, intensity: number): void {
    this.sunColor.copy(color)
    this.sunIntensity = intensity
  }

  /**
   * Get the N nearest lights to a position (for shader)
   * Always includes sun as first light
   */
  getNearestLights(position: THREE.Vector3, maxCount: number): LightSource[] {
    const result: LightSource[] = []

    // Sun is always first (if visible)
    if (this.sunIntensity > 0) {
      result.push({
        position: this.sunPosition.clone(),
        color: this.sunColor.clone(),
        intensity: this.sunIntensity
      })
    }

    // Collect all block lights with distances
    const blockLights: { light: LightSource; distance: number }[] = []

    for (const chunkLights of this.lights.values()) {
      for (const light of chunkLights) {
        const distance = position.distanceTo(light.position)
        blockLights.push({ light, distance })
      }
    }

    // Sort by distance and take nearest
    blockLights.sort((a, b) => a.distance - b.distance)

    const remaining = maxCount - result.length
    for (let i = 0; i < Math.min(remaining, blockLights.length); i++) {
      result.push(blockLights[i].light)
    }

    return result
  }

  /**
   * Get total light count (for debugging)
   */
  getTotalLightCount(): number {
    let count = 0
    for (const chunkLights of this.lights.values()) {
      count += chunkLights.length
    }
    return count
  }
}
