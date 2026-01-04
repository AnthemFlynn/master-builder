# Post-Processing Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add modern post-processing effects (SSAO, Bloom, Volumetric Lighting, Color Grading) for stylized/vibrant visuals.

**Architecture:** EffectComposer pipeline with 6 passes. PostProcessingService owns the composer and integrates with existing render loop. LightRegistry tracks emissive blocks for volumetric lighting.

**Tech Stack:** Three.js postprocessing addons, custom GLSL shaders, TypeScript

---

## Task 1: Create ColorGradingShader

**Files:**
- Create: `src/modules/rendering/shaders/ColorGradingShader.ts`

**Step 1: Create the shader file**

```typescript
// src/modules/rendering/shaders/ColorGradingShader.ts
import * as THREE from 'three'

/**
 * ColorGradingShader - Saturation, contrast, brightness, vibrance
 *
 * Vibrance boosts muted colors more than saturated ones (like Photoshop).
 */
export const ColorGradingShader = {
  name: 'ColorGradingShader',

  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.4 },
    contrast: { value: 1.15 },
    brightness: { value: 1.05 },
    vibrance: { value: 0.3 }
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float brightness;
    uniform float vibrance;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Brightness
      color.rgb *= brightness;

      // Contrast (around mid-gray)
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;

      // Saturation
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(luminance), color.rgb, saturation);

      // Vibrance (boost low-saturation colors more)
      float maxChannel = max(color.r, max(color.g, color.b));
      float minChannel = min(color.r, min(color.g, color.b));
      float currentSat = (maxChannel - minChannel) / (maxChannel + 0.001);
      float vibranceAmount = vibrance * (1.0 - currentSat);
      color.rgb = mix(vec3(luminance), color.rgb, 1.0 + vibranceAmount);

      gl_FragColor = color;
    }
  `
}
```

**Step 2: Verify file created**

Run: `ls -la src/modules/rendering/shaders/ColorGradingShader.ts`
Expected: File exists

**Step 3: Type check**

Run: `bun lint`
Expected: No errors related to ColorGradingShader

**Step 4: Commit**

```bash
git add src/modules/rendering/shaders/ColorGradingShader.ts
git commit -m "feat(rendering): add ColorGradingShader for post-processing"
```

---

## Task 2: Create VolumetricLightShader

**Files:**
- Create: `src/modules/rendering/shaders/VolumetricLightShader.ts`

**Step 1: Create the shader file**

```typescript
// src/modules/rendering/shaders/VolumetricLightShader.ts
import * as THREE from 'three'

/**
 * VolumetricLightShader - God rays / light shafts
 *
 * Uses radial blur from light source positions to create volumetric effect.
 * Supports multiple light sources (sun + emissive blocks).
 */
export const VolumetricLightShader = {
  name: 'VolumetricLightShader',

  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    lightPositions: { value: [] as THREE.Vector2[] },  // Screen-space positions
    lightColors: { value: [] as THREE.Vector3[] },
    lightCount: { value: 0 },
    density: { value: 0.8 },
    weight: { value: 0.4 },
    decay: { value: 0.95 },
    samples: { value: 80 },
    exposure: { value: 0.3 }
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 lightPositions[16];
    uniform vec3 lightColors[16];
    uniform int lightCount;
    uniform float density;
    uniform float weight;
    uniform float decay;
    uniform int samples;
    uniform float exposure;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 godRays = vec3(0.0);

      // Process each light source
      for (int l = 0; l < 16; l++) {
        if (l >= lightCount) break;

        vec2 lightPos = lightPositions[l];
        vec3 lightColor = lightColors[l];

        // Direction from pixel to light
        vec2 deltaTexCoord = (vUv - lightPos) * density / float(samples);
        vec2 texCoord = vUv;

        float illuminationDecay = 1.0;
        vec3 rayColor = vec3(0.0);

        // March toward light, accumulating color
        for (int i = 0; i < 100; i++) {
          if (i >= samples) break;

          texCoord -= deltaTexCoord;

          // Sample scene at this point
          vec3 sampleColor = texture2D(tDiffuse, texCoord).rgb;

          // Accumulate weighted sample
          sampleColor *= illuminationDecay * weight;
          rayColor += sampleColor;

          illuminationDecay *= decay;
        }

        godRays += rayColor * lightColor;
      }

      // Add god rays to original color
      color.rgb += godRays * exposure;

      gl_FragColor = color;
    }
  `
}

/**
 * Project world position to screen space
 */
export function projectToScreen(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number
): THREE.Vector2 {
  const pos = worldPos.clone().project(camera)
  return new THREE.Vector2(
    (pos.x + 1) / 2,
    (pos.y + 1) / 2
  )
}
```

**Step 2: Type check**

Run: `bun lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/modules/rendering/shaders/VolumetricLightShader.ts
git commit -m "feat(rendering): add VolumetricLightShader for god rays"
```

---

## Task 3: Create LightRegistry

**Files:**
- Create: `src/modules/rendering/domain/LightRegistry.ts`

**Step 1: Create the registry**

```typescript
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
```

**Step 2: Type check**

Run: `bun lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/modules/rendering/domain/LightRegistry.ts
git commit -m "feat(rendering): add LightRegistry for tracking emissive blocks"
```

---

## Task 4: Create PostProcessingService

**Files:**
- Create: `src/modules/rendering/application/PostProcessingService.ts`

**Step 1: Create the service**

```typescript
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
   * Set bloom strength (for UI slider)
   */
  setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength
  }

  /**
   * Set color grading saturation
   */
  setSaturation(saturation: number): void {
    this.colorGradingPass.uniforms.saturation.value = saturation
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
```

**Step 2: Type check**

Run: `bun lint`
Expected: No errors (may have warnings about unused imports initially)

**Step 3: Commit**

```bash
git add src/modules/rendering/application/PostProcessingService.ts
git commit -m "feat(rendering): add PostProcessingService with full effect pipeline"
```

---

## Task 5: Expose Renderer from Core

**Files:**
- Modify: `src/core/index.ts`

**Step 1: Add getter for WebGLRenderer**

Find the Core class and add a method to get the WebGLRenderer:

```typescript
// Add after initRenderer method (around line 59)

  /**
   * Get the WebGL renderer for post-processing
   */
  getWebGLRenderer(): THREE.WebGLRenderer {
    return this.renderer as THREE.WebGLRenderer
  }
```

**Step 2: Type check**

Run: `bun lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/core/index.ts
git commit -m "feat(core): expose WebGLRenderer for post-processing integration"
```

---

## Task 6: Integrate PostProcessingService into GameFactory

**Files:**
- Modify: `src/modules/core/GameFactory.ts`

**Step 1: Add import**

Add at top with other imports:

```typescript
import { PostProcessingService } from '../rendering/application/PostProcessingService'
```

**Step 2: Add to GameServices interface**

```typescript
// Add to GameServices interface (around line 67)
  postProcessingService: PostProcessingService
```

**Step 3: Add renderer parameter to createGameServices**

Modify the function signature to accept renderer:

```typescript
export function createGameServices(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,  // Add this parameter
  callbacks: OrchestratorCallbacks,
  performanceConfig: PerformanceConfig
): GameServices {
```

**Step 4: Create PostProcessingService**

Add after other service creations (before the return statement):

```typescript
  // Post-processing
  const postProcessingService = new PostProcessingService(renderer, scene, camera)
```

**Step 5: Add to return object**

```typescript
  return {
    // ... existing services ...
    postProcessingService,
  }
```

**Step 6: Type check**

Run: `bun lint`
Expected: Error about missing renderer argument (we'll fix in next task)

**Step 7: Commit**

```bash
git add src/modules/core/GameFactory.ts
git commit -m "feat(core): integrate PostProcessingService into GameFactory"
```

---

## Task 7: Update GameOrchestrator to Use Post-Processing

**Files:**
- Modify: `src/modules/core/application/GameOrchestrator.ts`
- Modify: `src/main.ts`

**Step 1: Update main.ts to pass renderer**

Find where createGameServices is called and update to pass renderer:

```typescript
// In main.ts, update the GameOrchestrator constructor call
// Pass core.getWebGLRenderer() to orchestrator
```

**Step 2: Update GameOrchestrator constructor**

Add renderer parameter and pass to createGameServices:

```typescript
constructor(
  private scene: THREE.Scene,
  private camera: THREE.PerspectiveCamera,
  private renderer: THREE.WebGLRenderer  // Add this
) {
  // Update createGameServices call to include renderer
  this.services = createGameServices(scene, camera, renderer, { ... }, this.performanceConfig)
```

**Step 3: Replace renderer.render() with post-processing**

Find the render loop (likely in an update or render method) and replace:

```typescript
// Old:
// renderer.render(scene, camera)

// New:
this.services.postProcessingService.render()
```

**Step 4: Type check**

Run: `bun lint`
Expected: No errors

**Step 5: Test in browser**

Run: `bun dev`
Expected: Game loads with bloom visible on bright areas

**Step 6: Commit**

```bash
git add src/modules/core/application/GameOrchestrator.ts src/main.ts
git commit -m "feat(core): wire post-processing into render loop"
```

---

## Task 8: Add Graphics Settings to UI

**Files:**
- Modify: `src/modules/ui/application/MenuManager.ts` (or wherever Settings UI lives)

**Step 1: Find Settings UI component**

Run: `grep -r "Settings" src/modules/ui --include="*.ts" | head -20`

**Step 2: Add quality preset dropdown**

Add a dropdown with options: Ultra, High, Medium, Low

**Step 3: Add bloom slider**

Add a range slider for bloom intensity (0.5 - 2.5)

**Step 4: Wire to PostProcessingService**

```typescript
// On preset change
postProcessingService.setQualityPreset(value as QualityPreset)

// On bloom slider change
postProcessingService.setBloomStrength(value)
```

**Step 5: Persist to localStorage**

Follow existing PerformanceConfig pattern for persistence.

**Step 6: Test**

Run: `bun dev`
- Open Settings
- Change quality preset
- Verify visual difference
- Refresh page, verify setting persists

**Step 7: Commit**

```bash
git add src/modules/ui/
git commit -m "feat(ui): add graphics quality settings for post-processing"
```

---

## Task 9: Wire Light Registry to Chunk Events

**Files:**
- Modify: `src/modules/rendering/application/PostProcessingService.ts`
- Modify: `src/modules/meshing/application/MeshingService.ts`

**Step 1: Add EventBus listener in PostProcessingService**

```typescript
constructor(
  // ... existing params
  private eventBus: EventBus
) {
  // Listen for chunk mesh events
  eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e: any) => {
    // Extract light sources from chunk and register
    this.lightRegistry.addChunkLights(e.chunkKey, e.lightSources || [])
  })

  eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
    this.lightRegistry.removeChunkLights(e.chunkCoord.toKey())
  })
}
```

**Step 2: Emit light sources from MeshingService**

When building chunk mesh, collect emissive block positions and emit with event.

**Step 3: Test**

Run: `bun dev`
- Place glowstone blocks
- Verify god rays appear from them

**Step 4: Commit**

```bash
git add src/modules/rendering/ src/modules/meshing/
git commit -m "feat(rendering): wire light registry to chunk mesh events"
```

---

## Task 10: Final Testing & Polish

**Step 1: Full visual test**

- Start game
- Walk around, check bloom on sky
- Enter cave, check SSAO depth
- Look at sun through trees, check god rays
- Place glowstone, verify volumetric light

**Step 2: Performance test**

- Open browser DevTools
- Check FPS with Ultra preset
- Check FPS with Low preset
- Verify acceptable framerates

**Step 3: Fix any visual artifacts**

Common issues:
- Bloom bleeding into UI (add UI layer that renders after post-processing)
- Z-fighting in SSAO (adjust minDistance/maxDistance)
- God rays too intense (reduce exposure/weight)

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(rendering): complete post-processing pipeline implementation"
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | ColorGradingShader | 5 min |
| 2 | VolumetricLightShader | 10 min |
| 3 | LightRegistry | 5 min |
| 4 | PostProcessingService | 15 min |
| 5 | Expose renderer from Core | 2 min |
| 6 | GameFactory integration | 5 min |
| 7 | GameOrchestrator wiring | 10 min |
| 8 | Settings UI | 15 min |
| 9 | Light registry events | 10 min |
| 10 | Testing & polish | 15 min |
| **Total** | | **~90 min** |

---

## Verification Checklist

- [ ] Bloom visible on sky and bright surfaces
- [ ] SSAO adds depth to corners and caves
- [ ] God rays from sun through trees
- [ ] Emissive blocks cast volumetric light
- [ ] Colors are vibrant/oversaturated
- [ ] 55+ fps at 1080p on High preset
- [ ] Quality presets work
- [ ] Settings persist across sessions
- [ ] No visual artifacts
