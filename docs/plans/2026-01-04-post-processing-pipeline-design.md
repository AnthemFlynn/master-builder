# Post-Processing Pipeline Design

**Date**: 2026-01-04
**Goal**: Add modern post-processing effects for stylized/vibrant visuals
**Performance Target**: 55-60fps at 1080p (acceptable shader-user experience)

---

## Visual Style

**Stylized/Vibrant** - Oversaturated colors, strong bloom, dreamy atmosphere with volumetric lighting from all light sources (sun + emissive blocks).

---

## Architecture

```
Scene Render → SSAO → Volumetric Light → Bloom → Color Grading → Output
```

### New Files

```
src/modules/rendering/
├── application/
│   └── PostProcessingService.ts    # Main service, owns EffectComposer
├── shaders/
│   ├── VolumetricLightShader.ts    # Custom god rays shader
│   └── ColorGradingShader.ts       # Saturation/contrast/vibrance
└── domain/
    └── LightRegistry.ts            # Tracks emissive block positions
```

### Integration Points

1. **Core.ts** - Expose renderer for PostProcessingService
2. **GameFactory.ts** - Create PostProcessingService
3. **GameOrchestrator.ts** - Replace `renderer.render()` with `composer.render()`
4. **MeshingService.ts** - Emit light source positions when building chunks

---

## Effect Stack (Stylized/Vibrant Preset)

### 1. RenderPass
Base scene render - no configuration needed.

### 2. SSAOPass
```typescript
kernelRadius: 16      // Large radius for soft, dreamy AO
minDistance: 0.005
maxDistance: 0.1
intensity: 1.5        // Strong but not harsh
```

### 3. VolumetricLightPass (Custom)
```typescript
density: 0.8          // Thick, dreamy rays
weight: 0.4           // Visible but not overwhelming
decay: 0.95           // Long rays
samples: 80           // Quality (adjustable per preset)
maxLights: 16         // Limit for performance (nearest N lights)
```

### 4. UnrealBloomPass
```typescript
strength: 1.8         // STRONG bloom for vibrant look
radius: 1.2           // Wide, soft glow
threshold: 0.3        // Catch more bright pixels
```

### 5. ColorGradingPass (Custom)
```typescript
saturation: 1.4       // Oversaturated colors
contrast: 1.15        // Punchy
brightness: 1.05      // Slightly lifted
vibrance: 0.3         // Boost muted colors more
```

### 6. OutputPass
Uses renderer's existing ACES Filmic tone mapping.

---

## Quality Presets

| Preset | SSAO | Volumetric | Bloom | Color Grade | Target FPS |
|--------|------|------------|-------|-------------|------------|
| Ultra | Full | 80 samples, 16 lights | Full | Full | 45-55 |
| High | Full | 50 samples, 8 lights | Full | Full | 55-60 |
| Medium | Half-res | Sun only | Full | Full | 60+ |
| Low | Off | Off | Reduced | Full | 60+ |

---

## Performance Budget (1080p)

| Pass | Ultra | High | Medium | Low |
|------|-------|------|--------|-----|
| SSAO | 3ms | 3ms | 1.5ms | 0ms |
| Volumetric | 4ms | 2.5ms | 1ms | 0ms |
| Bloom | 2ms | 2ms | 2ms | 1ms |
| Color Grading | 0.5ms | 0.5ms | 0.5ms | 0.5ms |
| **Total** | **9.5ms** | **8ms** | **5ms** | **1.5ms** |

---

## Light Registry

Tracks positions of emissive blocks for volumetric lighting:

```typescript
interface LightSource {
  position: THREE.Vector3
  color: THREE.Color
  intensity: number  // From block's lightEmission (0-15)
}

class LightRegistry {
  private lights: Map<string, LightSource[]>  // Keyed by chunk

  addChunkLights(chunkKey: string, lights: LightSource[]): void
  removeChunkLights(chunkKey: string): void
  getNearestLights(position: THREE.Vector3, maxCount: number): LightSource[]
}
```

---

## Settings UI Integration

Add to existing Settings modal:
- **Graphics Quality**: Ultra / High / Medium / Low dropdown
- **Bloom Intensity**: Slider (0.5 - 2.5)
- **God Rays**: On / Sun Only / Off

Persist to localStorage with existing PerformanceConfig pattern.

---

## Dependencies

Three.js addons (already available, just import):
- `three/addons/postprocessing/EffectComposer`
- `three/addons/postprocessing/RenderPass`
- `three/addons/postprocessing/UnrealBloomPass`
- `three/addons/postprocessing/SSAOPass`
- `three/addons/postprocessing/ShaderPass`
- `three/addons/postprocessing/OutputPass`

---

## Success Criteria

- [ ] Bloom visible on sky, glowstone, sunlit surfaces
- [ ] SSAO adds depth to block corners and caves
- [ ] God rays from sun visible through trees
- [ ] Emissive blocks (glowstone, torches) cast localized volumetric light
- [ ] Colors are vibrant and oversaturated
- [ ] 55+ fps at 1080p on mid-range hardware
- [ ] Quality presets work and persist
- [ ] No visual artifacts or z-fighting
