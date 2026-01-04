// src/modules/rendering/application/PostProcessingService.ts
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'

import { ColorGradingShader } from '../shaders/ColorGradingShader'
import { VolumetricLightShader, projectToScreen } from '../shaders/VolumetricLightShader'
import { LightRegistry, LightSource } from '../domain/LightRegistry'

export type QualityPreset = 'ultra' | 'high' | 'medium' | 'low'

interface PresetConfig {
  ssaoEnabled: boolean
  ssaoKernelRadius: number
  volumetricEnabled: boolean
  volumetricSamples: number
  volumetricMaxLights: number
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
}

const PRESETS: Record<QualityPreset, PresetConfig> = {
  ultra: {
    ssaoEnabled: true,
    ssaoKernelRadius: 16,
    volumetricEnabled: true,
    volumetricSamples: 80,
    volumetricMaxLights: 16,
    bloomStrength: 1.8,
    bloomRadius: 1.2,
    bloomThreshold: 0.3
  },
  high: {
    ssaoEnabled: true,
    ssaoKernelRadius: 12,
    volumetricEnabled: true,
    volumetricSamples: 50,
    volumetricMaxLights: 8,
    bloomStrength: 1.6,
    bloomRadius: 1.0,
    bloomThreshold: 0.35
  },
  medium: {
    ssaoEnabled: true,
    ssaoKernelRadius: 8,
    volumetricEnabled: true,
    volumetricSamples: 30,
    volumetricMaxLights: 1,  // Sun only
    bloomStrength: 1.4,
    bloomRadius: 0.8,
    bloomThreshold: 0.4
  },
  low: {
    ssaoEnabled: false,
    ssaoKernelRadius: 0,
    volumetricEnabled: false,
    volumetricSamples: 0,
    volumetricMaxLights: 0,
    bloomStrength: 1.0,
    bloomRadius: 0.5,
    bloomThreshold: 0.5
  }
}

/**
 * PostProcessingService - Manages the post-processing effect pipeline
 */
export class PostProcessingService {
  private composer: EffectComposer
  private lightRegistry: LightRegistry

  // Passes (stored for runtime adjustment)
  private ssaoPass: SSAOPass | null = null
  private volumetricPass: ShaderPass | null = null
  private bloomPass: UnrealBloomPass
  private colorGradingPass: ShaderPass

  private currentPreset: QualityPreset = 'high'
  private enabled = true

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera
  ) {
    this.lightRegistry = new LightRegistry()
    this.composer = new EffectComposer(renderer)

    // Build the pass pipeline
    this.setupPipeline()

    // Apply default preset
    this.setQualityPreset('high')

    // Handle resize
    window.addEventListener('resize', this.onResize)

    console.log('✨ PostProcessingService initialized')
  }

  private setupPipeline(): void {
    const width = window.innerWidth
    const height = window.innerHeight

    // 1. RenderPass - Base scene
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)

    // 2. SSAOPass - Screen-space ambient occlusion
    this.ssaoPass = new SSAOPass(this.scene, this.camera, width, height)
    this.ssaoPass.kernelRadius = 16
    this.ssaoPass.minDistance = 0.005
    this.ssaoPass.maxDistance = 0.1
    this.composer.addPass(this.ssaoPass)

    // 3. VolumetricLightPass - God rays
    this.volumetricPass = new ShaderPass(VolumetricLightShader)
    this.composer.addPass(this.volumetricPass)

    // 4. UnrealBloomPass - Glow
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.8,   // strength
      1.2,   // radius
      0.3    // threshold
    )
    this.composer.addPass(this.bloomPass)

    // 5. ColorGradingPass - Saturation/contrast/vibrance
    this.colorGradingPass = new ShaderPass(ColorGradingShader)
    this.composer.addPass(this.colorGradingPass)

    // 6. OutputPass - Final tone mapping
    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)
  }

  /**
   * Render the scene with post-processing
   */
  render(): void {
    if (!this.enabled) {
      this.renderer.render(this.scene, this.camera)
      return
    }

    // Update volumetric light positions
    this.updateVolumetricLights()

    // Render through composer
    this.composer.render()
  }

  private updateVolumetricLights(): void {
    if (!this.volumetricPass) return

    const config = PRESETS[this.currentPreset]
    if (!config.volumetricEnabled) return

    const cameraPos = (this.camera as THREE.PerspectiveCamera).position
    const lights = this.lightRegistry.getNearestLights(cameraPos, config.volumetricMaxLights)

    const width = window.innerWidth
    const height = window.innerHeight

    // Project light positions to screen space
    const screenPositions: THREE.Vector2[] = []
    const colors: THREE.Vector3[] = []

    for (const light of lights) {
      const screenPos = projectToScreen(light.position, this.camera, width, height)
      screenPositions.push(screenPos)
      colors.push(new THREE.Vector3(light.color.r, light.color.g, light.color.b))
    }

    // Update shader uniforms
    this.volumetricPass.uniforms.lightPositions.value = screenPositions
    this.volumetricPass.uniforms.lightColors.value = colors
    this.volumetricPass.uniforms.lightCount.value = lights.length
    this.volumetricPass.uniforms.samples.value = config.volumetricSamples
  }

  /**
   * Set quality preset
   */
  setQualityPreset(preset: QualityPreset): void {
    this.currentPreset = preset
    const config = PRESETS[preset]

    // SSAO
    if (this.ssaoPass) {
      this.ssaoPass.enabled = config.ssaoEnabled
      this.ssaoPass.kernelRadius = config.ssaoKernelRadius
    }

    // Volumetric
    if (this.volumetricPass) {
      this.volumetricPass.enabled = config.volumetricEnabled
    }

    // Bloom
    this.bloomPass.strength = config.bloomStrength
    this.bloomPass.radius = config.bloomRadius
    this.bloomPass.threshold = config.bloomThreshold

    console.log(`✨ Quality preset: ${preset}`)
  }

  /**
   * Get current preset
   */
  getQualityPreset(): QualityPreset {
    return this.currentPreset
  }

  /**
   * Enable/disable all post-processing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if post-processing is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Set bloom strength (for UI slider)
   */
  setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength
  }

  /**
   * Get bloom strength
   */
  getBloomStrength(): number {
    return this.bloomPass.strength
  }

  /**
   * Set color grading saturation
   */
  setSaturation(saturation: number): void {
    this.colorGradingPass.uniforms.saturation.value = saturation
  }

  /**
   * Get saturation
   */
  getSaturation(): number {
    return this.colorGradingPass.uniforms.saturation.value
  }

  /**
   * Get light registry for external updates
   */
  getLightRegistry(): LightRegistry {
    return this.lightRegistry
  }

  private onResize = (): void => {
    const width = window.innerWidth
    const height = window.innerHeight

    this.composer.setSize(width, height)

    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height)
    }

    this.bloomPass.setSize(width, height)
  }

  /**
   * Cleanup
   */
  dispose(): void {
    window.removeEventListener('resize', this.onResize)
    this.composer.dispose()
  }
}
