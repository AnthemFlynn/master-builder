# Lighting System & Block Registry Design

**Date:** 2025-12-03
**Status:** Design Validated, Ready for Implementation
**Estimated Timeline:** 6 weeks (6 phases)

---

## Executive Summary

Implement Minecraft-style lighting system with centralized block management registry. Goals:
- Add gameplay properties to blocks (water slows movement, ice is slippery)
- Implement light propagation with RGB colored lighting
- Consolidate scattered block definitions into single registry
- Support easy addition of 50+ new block types

---

## Problem Statement

### Current Issues
1. **Blocks scattered across 5 files** - Adding one block requires changes in terrain, materials, categories, inventory
2. **No lighting system** - Emissive materials glow but don't illuminate neighbors
3. **Limited block variety** - Using 14 of 332 available textures
4. **No gameplay properties** - All blocks identical collision/physics
5. **Sunrise/sunset visual only** - Doesn't affect block brightness

### User Requirements
- Dirt and sand blocks (textures exist, not accessible)
- Water/lava with movement penalties
- Light-emitting blocks that actually illuminate surroundings
- Proper day/night cycle affecting visibility
- Easy to add many more blocks

---

## Design Decisions

### 1. Block Management: Centralized Registry
**Choice:** Option A - Complete centralization
**Rationale:** Doing lighting system anyway, refactor everything once properly

### 2. Lighting System: Minecraft-Style Flood Fill
**Choice:** Option B - Material-aware absorption (no reflection)
**Rationale:** Performance vs realism balance, proven by Minecraft

### 3. Water/Lava: Hybrid Static Blocks
**Choice:** Option C - Static blocks with visual effects + movement penalty
**Rationale:** No complex fluid simulation, manageable scope

### 4. Light Updates: Incremental Processing
**Choice:** Option C - Budget-based updates (2ms/frame)
**Rationale:** Guarantees 60fps during sunrise/sunset (5000+ block updates)

### 5. Light Channels: Two-Channel System
**Choice:** Option A - Separate sky light + block light
**Rationale:** Minecraft-accurate, caves stay dark during day

### 6. Light Rendering: Custom Shaders
**Choice:** Option B - Shader uniforms with DataTexture
**Rationale:** Works with InstancedMesh, performant, modern

### 7. Light Storage: Chunk-Based
**Choice:** Option C - Proper chunk system
**Rationale:** Mirrors existing terrain generation, memory efficient

### 8. Light Quality: RGB Colored Lighting
**Choice:** Option D - Per-block RGB (4MB)
**Rationale:** Colored glows, reasonable memory, unique block ambiance

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Block Registry (Central)            │
│  - Block definitions (properties + visuals) │
│  - Material creation                        │
│  - Category management                      │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐  ┌──────────────┐
│  Lighting   │  │   Collision  │
│  Engine     │  │   System     │
│             │  │              │
│ - RGB flood │  │ - Reads      │
│   fill      │  │   collidable │
│ - 2ms/frame │  │ - Applies    │
│   budget    │  │   friction   │
└──────┬──────┘  └──────┬───────┘
       │                │
       ▼                ▼
┌─────────────────────────────────┐
│     Chunk System                │
│  - 24×256×24 blocks             │
│  - RGB light storage (3 bytes)  │
│  - Sky + Block channels         │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Custom Shader (GPU)            │
│  - Reads light data texture     │
│  - Applies RGB tint to blocks   │
│  - Combines sky + block light   │
└─────────────────────────────────┘
```

---

## Data Structures

### BlockDefinition
```typescript
interface BlockDefinition {
  // Identity
  id: BlockType
  name: string
  category: BlockCategory

  // Visual
  textures: string | string[]  // 6-face or single
  transparent: boolean
  icon: string

  // Lighting
  emissive: {r: number, g: number, b: number}  // RGB 0-15 each
  lightAbsorption: number  // 0.0 (glass) to 1.0 (bedrock)

  // Physics
  collidable: boolean
  friction: number  // Movement speed multiplier

  // Inventory
  inventorySlot?: number  // 1-9 for hotbar, null otherwise
  categorySlot?: number   // Position in category

  // Future
  hardness?: number
  tool?: string
  drops?: BlockType
}

export enum BlockCategory {
  GROUND = 'ground',
  STONE = 'stone',
  WOOD = 'wood',
  ILLUMINATION = 'illumination',
  METALS = 'metals',
  TRANSPARENT = 'transparent',
  FLUIDS = 'fluids'
}
```

### Chunk Light Storage
```typescript
class Chunk {
  x: number
  z: number
  size: number = 24

  // Block types
  blocks: Uint8Array  // Existing

  // Light data (NEW)
  // 3 bytes per block: R, G, B (each 0-15 packed in 4 bits)
  skyLightR: Uint8Array    // Red channel sky light
  skyLightG: Uint8Array    // Green channel sky light
  skyLightB: Uint8Array    // Blue channel sky light
  blockLightR: Uint8Array  // Red channel block light
  blockLightG: Uint8Array  // Green channel block light
  blockLightB: Uint8Array  // Blue channel block light

  // Or packed: 6 values × 4 bits = 3 bytes per block
  packedLight: Uint8Array  // [skyR|skyG|skyB|blockR|blockG|blockB]

  dirty: boolean  // Needs GPU texture update
}
```

### Light Propagation Queue
```typescript
interface LightUpdate {
  x: number
  y: number
  z: number
  channel: 'sky' | 'block'
  color: {r: number, g: number, b: number}  // RGB 0-15
  priority: number  // Higher = process first
}

class LightQueue {
  private queue: LightUpdate[] = []
  private blocksPerFrame = 100
  private frameBudget = 2.0  // milliseconds

  update(deltaTime: number): void {
    const start = performance.now()
    let processed = 0

    while (queue.length > 0 && performance.now() - start < frameBudget) {
      const update = queue.shift()
      processLightUpdate(update)
      processed++
    }
  }
}
```

---

## Algorithms

### Light Propagation (Flood Fill BFS)

```typescript
/**
 * Propagate light from a source block
 * Supports RGB colored lighting
 */
function propagateLight(
  x: number, y: number, z: number,
  color: {r: number, g: number, b: number},
  channel: 'sky' | 'block'
) {
  const queue: Array<{pos: Vector3, color: RGB}> = [{
    pos: new Vector3(x, y, z),
    color: color
  }]

  const visited = new Set<string>()

  while (queue.length > 0) {
    const {pos, color} = queue.shift()

    // Stop if light too dim
    if (color.r <= 0 && color.g <= 0 && color.b <= 0) continue

    // Check 6 neighbors
    for (const direction of DIRECTIONS) {
      const neighbor = pos.clone().add(direction)
      const key = `${neighbor.x},${neighbor.y},${neighbor.z}`

      if (visited.has(key)) continue
      visited.add(key)

      // Get block properties
      const blockType = getBlockAt(neighbor)
      const props = BlockRegistry.get(blockType)

      // Calculate light reduction
      const absorption = props.lightAbsorption  // 0.0 to 1.0
      const newColor = {
        r: Math.floor(color.r * (1 - absorption)) - 1,
        g: Math.floor(color.g * (1 - absorption)) - 1,
        b: Math.floor(color.b * (1 - absorption)) - 1
      }

      // Update if brighter than current
      const current = getLight(neighbor, channel)
      if (isBrighter(newColor, current)) {
        setLight(neighbor, channel, newColor)
        queue.push({pos: neighbor, color: newColor})
      }
    }
  }
}
```

**Incremental Wrapper:**
```typescript
// Add to queue instead of processing immediately
LightQueue.add({
  x, y, z,
  channel: 'block',
  color: {r: 15, g: 13, b: 8},  // Glowstone color
  priority: 1
})

// Process in update loop (2ms/frame budget)
```

### Sky Light Calculation

```typescript
/**
 * Calculate sky light level from sun altitude
 * Integrated with existing TimeOfDay system
 */
function calculateSkyLightColor(sunAltitude: number): RGB {
  // Sun altitude: -π/2 (midnight) to +π/2 (noon)
  const normalized = (sunAltitude + Math.PI/2) / Math.PI  // 0 to 1
  const intensity = Math.max(0, Math.min(15, normalized * 15))

  // Sky light is white during day
  return {
    r: Math.floor(intensity),
    g: Math.floor(intensity),
    b: Math.floor(intensity)
  }

  // Future: Could tint blue during day, orange at sunset
}

// When hour changes:
onTimeChange(hour: number) {
  const skyColor = calculateSkyLightColor(sunAltitude)

  // Queue all surface blocks for update
  for (const block of surfaceBlocks) {
    LightQueue.add({...block, color: skyColor, channel: 'sky'})
  }
}
```

---

## Performance Budget

### Target: 60 FPS (16.67ms per frame)

**Frame Budget Allocation:**
- Rendering: 8ms
- Physics/Collision: 3ms
- **Light updates: 2ms** ← Our budget
- Input/UI: 1ms
- Headroom: 2.67ms

**Light Update Capacity:**
- 100 blocks per frame @ 2ms budget
- 6000 blocks/second throughput
- Sunrise (5000 blocks) = 0.83 seconds ✅

**Memory:**
- 9 chunks visible × 147KB = 1.3 MB
- RGB (3 bytes) × 2 channels = 4 MB total
- Acceptable for modern browsers

---

## Migration Strategy

### Files to Delete
```
❌ /src/control/BlockCategories.ts (115 lines)
❌ Hardcoded materials in materials.ts (~100 lines)
❌ holdingBlocks array in control/index.ts
```

### Files to Create
```
✅ /src/blocks/BlockRegistry.ts
✅ /src/blocks/definitions/ground.ts
✅ /src/blocks/definitions/stone.ts
✅ /src/blocks/definitions/wood.ts
✅ /src/blocks/definitions/illumination.ts
✅ /src/blocks/definitions/metals.ts
✅ /src/blocks/definitions/transparent.ts
✅ /src/blocks/definitions/fluids.ts
✅ /src/terrain/Chunk.ts
✅ /src/lighting/LightingEngine.ts
✅ /src/lighting/LightQueue.ts
✅ /src/lighting/LightShader.ts
```

### Files to Modify
```
📝 /src/terrain/index.ts - Use Chunk system
📝 /src/terrain/mesh/materials.ts - Generate from registry
📝 /src/control/index.ts - Use block properties for collision
📝 /src/core/TimeOfDay.ts - Integrate with lighting
📝 /src/ui/bag/index.ts - Read inventory from registry
```

---

## Testing Strategy

### Phase 1-2: Registry Migration
- Visual regression: Screenshot each block type before/after
- Material properties: Verify transparency, emissive still work
- Categories: Verify all 6 categories accessible

### Phase 3-4: Lighting Core
- Unit tests: Flood fill algorithm correctness
- Console logging: Light levels at different distances from source
- Performance: Measure frame time with 1000 block updates

### Phase 5: Shader Integration
- Visual: Place glowstone, verify nearby blocks brighten
- Day/night: Watch smooth transition over time
- Colors: Lava (orange), glowstone (yellow), redstone (red)

### Phase 6: New Blocks
- Water: Walk through, verify 0.5× speed
- Ice: Walk on, verify 1.5× speed (slippery)
- Lava: Walk through, verify 0.3× speed + orange glow
- Dirt/sand: Verify textures, standard properties

---

## Block Examples

### Initial Block Set (Phase 6)

**Ground:**
```typescript
{
  id: BlockType.dirt,
  name: 'Dirt',
  category: BlockCategory.GROUND,
  textures: 'dirt.png',
  transparent: false,
  emissive: {r: 0, g: 0, b: 0},
  lightAbsorption: 1.0,  // Fully opaque
  collidable: true,
  friction: 1.0,
  inventorySlot: null,
  categorySlot: 1
}
```

**Fluids:**
```typescript
{
  id: BlockType.water,
  name: 'Water',
  category: BlockCategory.FLUIDS,
  textures: 'water_still.png',
  transparent: true,
  emissive: {r: 0, g: 0, b: 0},
  lightAbsorption: 0.3,  // Transmits 70% of light
  collidable: false,     // Can walk through
  friction: 0.5,         // Half speed
  inventorySlot: null,
  categorySlot: 1
}

{
  id: BlockType.lava,
  name: 'Lava',
  category: BlockCategory.FLUIDS,
  textures: 'lava_still.png',
  transparent: false,
  emissive: {r: 15, g: 6, b: 0},  // Orange-red glow
  lightAbsorption: 0.2,
  collidable: false,
  friction: 0.3,         // Very slow
  inventorySlot: null,
  categorySlot: 2
}
```

**Illumination:**
```typescript
{
  id: BlockType.glowstone,
  name: 'Glowstone',
  category: BlockCategory.ILLUMINATION,
  textures: 'glowstone.png',
  transparent: false,
  emissive: {r: 15, g: 13, b: 8},  // Warm yellow
  lightAbsorption: 0.0,  // Transparent to light
  collidable: true,
  friction: 1.0,
  inventorySlot: 8,
  categorySlot: 1
}
```

---

## Implementation Phases (Detailed)

### Phase 1: BlockRegistry Foundation
**Goal:** Registry working alongside existing code
**Duration:** Week 1
**Risk:** Zero (no breaking changes)

**Tasks:**
1. Create `/src/blocks/BlockRegistry.ts` class
2. Create definition files for 7 categories
3. Port all 14 existing blocks to new format
4. Add `BlockRegistry.createMaterial()` method
5. Add `BlockRegistry.get()` and query methods
6. Unit tests for registry
7. Test: Game runs identically

**Success Criteria:**
- Registry contains all 14 blocks
- Can query by ID, category, inventory slot
- Materials generated match existing materials
- Zero visual changes

---

### Phase 2: Material System Migration
**Goal:** Delete hardcoded materials
**Duration:** Week 2
**Risk:** Low

**Tasks:**
1. Update `/src/terrain/mesh/materials.ts`:
   - Replace `materials` array with `createMaterialsFromRegistry()`
   - Delete 100 lines of hardcoded material definitions
2. Update `/src/terrain/index.ts`:
   - Import from registry instead of materials.ts
3. Test transparency (glass, leaves)
4. Test emissive (glowstone, redstone lamp)
5. Test multi-face (grass, logs)
6. Screenshot comparison: before vs after

**Success Criteria:**
- All 14 blocks visually identical
- Shadows working
- Transparency working
- Emissive materials glowing

---

### Phase 3: Chunk System + Light Storage
**Goal:** Chunks store RGB light data
**Duration:** Week 3
**Risk:** Low (data added but not used)

**Tasks:**
1. Create `/src/terrain/Chunk.ts` class:
   ```typescript
   - packedLight: Uint8Array (6 × 4 bits per block)
   - getLight(x, y, z): {sky: RGB, block: RGB}
   - setLight(x, y, z, channel, color: RGB)
   ```
2. Create `/src/terrain/ChunkManager.ts`:
   - Manage chunk lifecycle
   - worldToChunk() coordinate conversion
3. Initialize chunks with default light:
   - Sky: {r: 15, g: 15, b: 15} (full daylight)
   - Block: {r: 0, g: 0, b: 0} (no emission)
4. Integrate with existing terrain generation
5. Test memory usage (~4MB expected)

**Success Criteria:**
- Can store/retrieve light at any position
- Memory usage acceptable
- Game runs at 60fps (data exists but unused)

---

### Phase 4: Lighting Engine Core
**Goal:** Light propagation algorithm working
**Duration:** Week 4
**Risk:** Medium (complex algorithm)

**Tasks:**
1. Create `/src/lighting/LightingEngine.ts`:
   - `propagateLight()` flood fill with RGB
   - Separate sky and block light channels
   - Use BlockRegistry for absorption values
2. Create `/src/lighting/LightQueue.ts`:
   - Incremental update queue
   - 2ms/frame budget enforcement
   - Priority system (player area = high priority)
3. Integration hooks:
   - When block placed: Trigger light update
   - When block broken: Remove light source, recalc
4. Console logging for debugging
5. Test single glowstone: Verify light spreads ~15 blocks

**Success Criteria:**
- Place glowstone → light values update in chunk data
- Console shows propagation (15, 14, 13, ... 0)
- Colored emission: Lava (orange), glowstone (yellow)
- Incremental processing: Smooth 60fps during updates

---

### Phase 5: Shader Integration (Visual!)
**Goal:** See lighting in-game
**Duration:** Week 5
**Risk:** High (shader debugging difficult)

**Tasks:**
1. Create `/src/lighting/LightShader.ts`:
   - Custom fragment shader modifier
   - Read light data from DataTexture
   - Apply RGB tint to block color
   - Combine sky + block light (max of both channels)
2. Create DataTexture from chunk light data:
   - Upload to GPU each frame (only dirty chunks)
3. Apply shader to all materials
4. Tune light curve:
   - Linear vs gamma correction
   - Minimum ambient (prevent pitch black)
5. Test day/night cycle integration

**Success Criteria:**
- Blocks visibly darken away from light sources
- Glowstone illuminates 15 blocks around it
- Lava has orange glow
- Sunrise/sunset smoothly brightens/darkens world
- Still 60fps

---

### Phase 6: Add New Blocks
**Goal:** Water, lava, dirt, sand, cobblestone, ice
**Duration:** Week 6
**Risk:** Low (registry makes this trivial)

**Tasks:**
1. Extend BlockType enum:
   ```typescript
   water = 14,
   lava = 15,
   dirt = 16,
   cobblestone = 17,
   ice = 18,
   iron_ore = 19
   ```
2. Add block definitions to registry
3. Create block icons (or use existing textures)
4. Add to appropriate categories
5. Test each block:
   - Water: Walk through (slow), light transmission
   - Lava: Walk through (very slow), orange light emission
   - Ice: Walk on (fast/slippery)
   - Dirt: Standard solid block
6. Update category UI if needed

**Success Criteria:**
- All 6 new blocks placeable
- Water/lava have movement penalties
- Ice is slippery (1.5× speed)
- Lava emits orange light
- All blocks in inventory/categories

---

## Technical Specifications

### Light Data Format (Packed)

```
Single block light storage: 3 bytes

Byte 0: [skyR (4 bits) | skyG (4 bits)]
Byte 1: [skyB (4 bits) | blockR (4 bits)]
Byte 2: [blockG (4 bits) | blockB (4 bits)]

Total per block: 3 bytes
Total per chunk (24×256×24): 442,368 bytes (~432 KB)
Total for 9 chunks: 3.88 MB
```

### Shader Uniforms

```glsl
uniform sampler2D lightDataTexture;
uniform vec3 chunkOffset;

void main() {
  // Get block world position
  vec3 blockPos = vWorldPosition - chunkOffset;

  // Sample light texture (RGB channels)
  vec3 skyLight = texture2D(lightDataTexture, uvCoord).rgb / 15.0;
  vec3 blockLight = texture2D(lightDataTexture, uvCoord2).rgb / 15.0;

  // Take maximum (Minecraft rule)
  vec3 finalLight = max(skyLight, blockLight);

  // Apply to fragment color
  gl_FragColor.rgb *= finalLight;
}
```

### Performance Targets

**Light Propagation:**
- Single torch: <10ms total (spread over 5 frames)
- Sunrise/sunset: <1 second (5000 blocks over 50 frames)
- Lava pool: <50ms (spread over 25 frames)

**Frame Budget:**
- Always maintain 60fps
- 2ms/frame maximum for lighting
- Graceful degradation if budget exceeded (finish next frame)

**Memory:**
- 4MB light data (acceptable)
- No memory leaks from chunk management
- Chunks unload when far from player (future optimization)

---

## Future Enhancements (Post-Phase 6)

### Short Term
1. **Smooth lighting** - Per-vertex instead of per-block (31MB)
2. **Light reflection** - Single bounce from surfaces (2× compute)
3. **More blocks** - Use remaining 300+ textures
4. **Colored glass** - Tint light passing through

### Long Term
1. **Baked lighting** - Pre-calculate static light, only dynamic for changes
2. **Shadow from blocks** - Block light casts shadows
3. **Underwater lighting** - Caustics, light rays
4. **Particle effects** - Torch flames, lava bubbles

---

## Risk Mitigation

### Shader Risk (High)
**Problem:** Custom shaders can break rendering entirely
**Mitigation:**
- Keep fallback to non-lit materials
- Extensive console logging
- Test on multiple browsers
- Feature flag to disable shader

### Performance Risk (Medium)
**Problem:** Light updates could cause frame drops
**Mitigation:**
- Strict 2ms budget enforcement
- Priority queue (player area first)
- Can reduce blocksPerFrame if needed
- Monitor frame time, adjust dynamically

### Complexity Risk (Medium)
**Problem:** Flood fill bugs, edge cases
**Mitigation:**
- Incremental implementation (test after each phase)
- Unit tests for propagation algorithm
- Visual debugging (console log light levels)
- Start with monochrome, add RGB after working

---

## Success Metrics

### Functional
- ✅ Place glowstone → 15 blocks around it brighten
- ✅ Sunrise → World brightens over 1 second
- ✅ Cave → Stays dark even during day (block light only)
- ✅ Water → Slows movement, transmits light
- ✅ Add new block in <10 lines of code

### Performance
- ✅ Maintain 60fps during all lighting updates
- ✅ Memory < 10MB for lighting system
- ✅ Sunrise/sunset < 1 second transition

### Code Quality
- ✅ Single source of truth (BlockRegistry)
- ✅ Zero scattered hardcoded block data
- ✅ Easy to add 50+ more blocks
- ✅ Well-tested, no regressions

---

## Conclusion

This design provides:
1. **Centralized block management** - Add blocks trivially
2. **Minecraft-authentic lighting** - Flood fill, 0-15 levels, two channels
3. **RGB colored lighting** - Different blocks emit different colors
4. **Guaranteed performance** - 2ms budget, incremental updates
5. **Gameplay variety** - Water, lava, ice with physics properties
6. **Scalability** - Foundation for hundreds of block types

**Implementation is phased and safe** - each phase tested before next begins.

---

**References:**
- [Minecraft Light Mechanics](https://minecraft.wiki/w/Light)
- [Minecraft Water Mechanics](https://minecraft.wiki/w/Water)
- [Voxel Lighting Algorithm](https://0fps.net/2018/02/21/voxel-lighting/)
- [Light Propagation Implementation](https://gamedev.stackexchange.com/questions/91926/how-can-i-build-minecraft-style-light-propagation-without-recursive-functions)
- [Three.js Point Light Performance](https://discourse.threejs.org/t/point-lights-and-performance-revisited/49316)
- [Voxel Engine Best Practices](https://sites.google.com/site/letsmakeavoxelengine/home/block-data-structure)
