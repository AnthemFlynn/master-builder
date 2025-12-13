# Phase 3: RD=7 LOD System Design

**Date:** 2025-12-13
**Author:** Claude (Phase 3 Planning Session)
**Status:** Design Complete - Ready for Implementation
**Target:** Render Distance 7 (225 chunks) at stable 60fps with 4-level LOD system

---

## Executive Summary

Enable render distance 7 by implementing a 4-level LOD (Level of Detail) system that reduces polygon count for distant chunks. This includes a transparency system for smooth LOD transitions that also unlocks glass rendering, water blocks, and fade-in effects.

**Current State (Phase 2 - RD=5):**
- 121 chunks at 60fps stable
- ~145MB memory
- ~30k-40k polygons total
- All chunks rendered at full detail

**Target State (Phase 3 - RD=7):**
- 225 chunks at 60fps stable
- <250MB memory
- ~30k-35k polygons total (LOD reduces distant chunk polys)
- 4 LOD levels with smooth transitions

**Key Innovation:** Transparency system is core rendering upgrade (not just LOD polish), enabling glass, water, particles, and animations.

---

## System Architecture

### Component Structure

```
GameOrchestrator
    ↓ (calculates distance, requests LOD)
LODManager (NEW)
    ├─ Tracks chunk→LOD level mapping
    ├─ Manages transition states (fading chunks)
    ├─ Maintains LRU cache of recently used meshes
    └─ Coordinates with MeshingService
          ↓
MeshingService (MODIFIED)
    ├─ Accepts LOD level parameter with priority
    ├─ Routes to worker pool with level metadata
    └─ Existing budget/queue logic unchanged
          ↓
WorkerPool (MODIFIED)
    ├─ Priority queue (Level 0 > Level 1 > Level 2 > Level 3)
    └─ 6 workers handle all LOD levels
          ↓
MeshingWorker (MODIFIED)
    ├─ Receives LOD level in message
    ├─ Selects meshing algorithm based on level
    └─ Returns geometry tagged with LOD level
          ↓
MaterialSystem (MODIFIED)
    ├─ Creates materials with alpha support
    ├─ Clones materials for independent opacity control
    └─ Updates opacity during transitions
          ↓
ChunkRenderer (MODIFIED)
    ├─ Receives mesh + LOD metadata
    ├─ Applies transition opacity if fading
    └─ Renders with appropriate material
```

### Data Flow Example

**Player moves from (0,0) to (1,0), chunk (5,5) changes from distance 3→4:**

1. **GameOrchestrator.update():** Detects chunk (5,5) now at distance 4
2. **LODManager.updateChunkLODs():** "Chunk (5,5) was Level 0, needs Level 1"
3. **LODManager.startTransition():**
   - Check cache for Level 1 mesh (miss)
   - Cache current Level 0 mesh
   - Request Level 1 mesh from MeshingService with priority=1
4. **MeshingService.buildMesh():** Queue Level 1 task in priority queue
5. **WorkerPool:** Assign to next available worker (or queue behind higher priority)
6. **MeshingWorker:** Select NoAOMesher, generate simplified mesh
7. **LODManager receives result:** Start 300ms fade (old opacity 1.0→0.0, new 0.0→1.0)
8. **LODManager.updateTransitions():** Each frame, interpolate opacity
9. **Transition complete:** Dispose old mesh, mark new as current

---

## The 4 LOD Levels

### Level 0 (Full Detail) - Distance 0-2 chunks

**Visual Range:** Player interaction zone (build, break, examine blocks)

**Algorithm:** Current greedy meshing with full features
- Greedy face merging (adjacent same-type+lighting faces merge)
- Smooth lighting (3×3×3 neighbor sampling per vertex)
- Ambient occlusion (8-corner darkening calculation)

**Polygon count:** ~8,000-15,000 per chunk (baseline)
**Generation time:** ~25-35ms per chunk
**Memory:** ~600KB geometry per chunk

**Use case:** 9 chunks at RD=7 (player's immediate surroundings)

---

### Level 1 (High Detail) - Distance 3-4 chunks

**Visual Range:** Still quite close, details visible

**Algorithm:** Greedy meshing WITHOUT ambient occlusion
- Same face merging as Level 0
- Smooth lighting (3×3×3 sampling)
- **Skip AO calculation** (saves 20% of generation time)

**Polygon count:** ~8,000-15,000 (same geometry, simpler shading)
**Generation time:** ~15-20ms per chunk (40% faster)
**Memory:** ~600KB geometry per chunk

**Visual impact:** Subtle - AO corner darkening only visible up close
**Use case:** 16 chunks at RD=7 (nearby area)

---

### Level 2 (Medium Detail) - Distance 5-6 chunks

**Visual Range:** Background, major shapes still important

**Algorithm:** Aggressive greedy meshing (2×2 block region merging)
- Treat 2×2×2 block groups as single merge unit
- Flat per-face lighting (single sample per face, no interpolation)
- No ambient occlusion

**Polygon count:** ~2,000-4,000 per chunk (70% reduction vs Level 0)
**Generation time:** ~8-12ms per chunk (65% faster)
**Memory:** ~150KB geometry per chunk (75% reduction)

**Visual impact:** Noticeable but acceptable - details blur together
**Use case:** 24 chunks at RD=7 (mid-distance ring)

---

### Level 3 (Low Detail) - Distance 7 chunks

**Visual Range:** Horizon, silhouettes only

**Algorithm:** Outer shell rendering (exposed surface blocks only)
- Iterate all blocks, check 6 neighbors
- If neighbor is air/transparent, emit quad for that face
- No greedy merging (raw quads)
- Flat shading (single color per face)

**Polygon count:** ~500-1,000 per chunk (95% reduction vs Level 0)
**Generation time:** ~2-4ms per chunk (90% faster)
**Memory:** ~40KB geometry per chunk (93% reduction)

**Visual impact:** Chunky silhouette, only acceptable at distance
**Use case:** 176 chunks at RD=7 (outer ring, majority of chunks)

---

## Distance Thresholds & Hysteresis

### Threshold Configuration

```typescript
class PerformanceConfig {
  // Base thresholds (in chunks from player)
  lodLevel0Max = 2.0
  lodLevel1Max = 4.0
  lodLevel2Max = 6.0
  // Level 3: everything > 6.0

  // Hysteresis buffer (prevents oscillation)
  hysteresis = 0.5
}
```

### Hysteresis Behavior

**Purpose:** Prevent chunks from rapidly switching LOD levels when player hovers at threshold boundary.

**Logic:**
- **Increasing distance:** Use standard threshold (e.g., 2.0 for Level 0→1)
- **Decreasing distance:** Require crossing threshold - hysteresis (e.g., 1.5 for Level 1→0)
- **Dead zone:** 0.5 chunk buffer where level doesn't change

**Example scenario:**
```
Chunk at distance 3.0 → Level 1
Player backs up to 2.8 → Still Level 1 (hasn't crossed 2.5)
Player backs up to 2.4 → Switches to Level 0 (crossed 2.5)
Player moves to 2.6 → Still Level 0 (hasn't crossed 3.0)
```

**Result:** Smooth, stable LOD levels. No flickering at boundaries.

---

## Transition System

### Transition State Tracking

```typescript
interface LODTransition {
  coord: ChunkCoordinate
  fromLevel: 0 | 1 | 2 | 3
  toLevel: 0 | 1 | 2 | 3
  oldMesh: THREE.Mesh
  newMesh: THREE.Mesh | null  // null until worker completes
  oldMaterial: THREE.Material
  newMaterial: THREE.Material
  startTime: number
  duration: number  // From PerformanceConfig (default 300ms)
  progress: number  // 0.0 to 1.0
}

class LODManager {
  private transitions = new Map<string, LODTransition>()

  updateTransitions(deltaTime: number): void {
    for (const [key, transition] of this.transitions) {
      // Update progress (0→1 over duration)
      transition.progress = Math.min(1.0,
        (performance.now() - transition.startTime) / transition.duration
      )

      // Update material opacity
      transition.oldMaterial.opacity = 1.0 - transition.progress
      transition.newMaterial.opacity = transition.progress

      // Complete transition
      if (transition.progress >= 1.0) {
        this.completeTransition(transition)
      }
    }
  }
}
```

### Transition Lifecycle

**Phase 1: Trigger (Frame 0)**
- Player crosses distance threshold
- LODManager detects level change needed
- Check cache for target LOD mesh
- If cache miss: Request from MeshingService with priority
- Store current mesh in transition state

**Phase 2: Generation (Frames 1-5)**
- Worker generates new LOD mesh asynchronously
- Old mesh remains visible at opacity=1.0
- New mesh not yet available

**Phase 3: Fade (Frames 6-24)**
- New mesh received, add to scene at opacity=0.0
- Each frame: old opacity decreases, new opacity increases (linear interpolation)
- Both meshes visible simultaneously

**Phase 4: Completion (Frame 24)**
- Old mesh opacity=0.0, new mesh opacity=1.0
- Dispose old mesh geometry
- Dispose old material clone
- Remove from transitions map
- Store old mesh in cache (for potential reuse)

**Memory during transition:** 2 meshes + 2 materials = ~1.2MB per transitioning chunk. At most 20 chunks transitioning = ~24MB temporary overhead (acceptable).

---

## LRU Mesh Cache

### Cache Design

```typescript
interface CachedMesh {
  coord: ChunkCoordinate
  lodLevel: 0 | 1 | 2 | 3
  mesh: THREE.Mesh
  geometry: THREE.BufferGeometry
  material: THREE.Material
  lastUsedTime: number
  memorySize: number  // Estimated KB
}

class LODMeshCache {
  private cache = new Map<string, CachedMesh>()
  private maxCacheSize: number  // From PerformanceConfig (default 30)

  // Cache key: "x,z:level" (e.g., "5,3:0")
  private getCacheKey(coord: ChunkCoordinate, level: number): string {
    return `${coord.toKey()}:${level}`
  }

  store(coord: ChunkCoordinate, level: number, mesh: THREE.Mesh): void {
    const key = this.getCacheKey(coord, level)

    // Update LRU timestamp
    this.cache.set(key, {
      coord, lodLevel: level, mesh,
      geometry: mesh.geometry,
      material: mesh.material,
      lastUsedTime: performance.now(),
      memorySize: this.estimateMemory(mesh.geometry)
    })

    // LRU eviction if over size
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldest()
    }
  }

  retrieve(coord: ChunkCoordinate, level: number): THREE.Mesh | null {
    const key = this.getCacheKey(coord, level)
    const cached = this.cache.get(key)

    if (cached) {
      // Update LRU timestamp (move to end)
      cached.lastUsedTime = performance.now()
      this.cache.delete(key)
      this.cache.set(key, cached)
      return cached.mesh
    }

    return null
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, cached] of this.cache) {
      if (cached.lastUsedTime < oldestTime) {
        oldestTime = cached.lastUsedTime
        oldestKey = key
      }
    }

    if (oldestKey) {
      const cached = this.cache.get(oldestKey)!
      cached.geometry.dispose()
      cached.material.dispose()
      this.cache.delete(oldestKey)
    }
  }
}
```

### Cache Strategy

**What gets cached:**
- Meshes that were just replaced during LOD transition
- Prioritize Level 0 (most expensive to regenerate)
- Only cache if chunk still loaded (unloaded chunks purged)

**Cache size tuning:**
- Default: 30 meshes (~15MB overhead)
- Low-end hardware: 20 meshes (~10MB)
- High-end hardware: 50 meshes (~25MB)

**Expected hit rate:** 70-80% for local movement patterns (player moves 1-3 chunks, returns frequently)

**Memory budget:** At 30 entries × 500KB average = 15MB (2.4% of 250MB total budget)

---

## Priority Queue for Worker Pool

### WorkerPool Modifications

```typescript
interface WorkerTask {
  type: string
  priority: number  // ← NEW: 0 = highest, 3 = lowest
  [key: string]: any
}

interface PendingTask {
  task: WorkerTask
  resolve: (result: WorkerResult) => void
  reject: (error: Error) => void
}

class WorkerPool {
  private taskQueue: PendingTask[] = []  // Now priority-sorted

  execute(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const pendingTask: PendingTask = { task, resolve, reject }

      if (this.availableWorkers.length > 0) {
        this.executeTask(pendingTask)
      } else {
        this.insertByPriority(pendingTask)
      }
    })
  }

  private insertByPriority(task: PendingTask): void {
    // Find insertion point (tasks sorted by priority, low to high)
    const index = this.taskQueue.findIndex(t =>
      t.task.priority > task.task.priority
    )

    if (index === -1) {
      this.taskQueue.push(task)  // Lowest priority, append
    } else {
      this.taskQueue.splice(index, 0, task)  // Insert before lower priority
    }
  }
}
```

### LOD Level → Priority Mapping

- **Level 0:** priority = 0 (highest - player interaction range)
- **Level 1:** priority = 1 (high - nearby area)
- **Level 2:** priority = 2 (medium - mid-distance)
- **Level 3:** priority = 3 (lowest - distant background)

**Behavior:** When worker becomes available, always pulls highest priority task from queue. Level 0 meshes process immediately, Level 3 waits.

**Queue distribution example at RD=7:**
```
Queue: [L0:2 tasks] [L1:5 tasks] [L2:8 tasks] [L3:25 tasks]
Worker becomes available → Processes L0 task first
```

**Performance cost:** `findIndex()` is O(n), but queue typically <50 tasks, so ~0.01ms overhead (negligible).

---

## Material System Upgrades

### Transparency Support

**Current limitation:** All materials opaque, no alpha channel or opacity control.

**Required additions:**

```typescript
class MaterialSystem {
  // Add opacity control to material creation
  getChunkMaterial(options?: {
    transparent?: boolean,
    opacity?: number
  }): THREE.Material {
    const baseMaterial = this.materials.get('chunk')!
    const material = baseMaterial.clone()  // Clone for independent control

    if (options?.transparent) {
      material.transparent = true
      material.opacity = options.opacity ?? 1.0
      material.depthWrite = options.opacity === 1.0  // Optimization
    }

    return material
  }

  // Update existing material opacity (for transitions)
  setMaterialOpacity(material: THREE.Material, opacity: number): void {
    material.opacity = opacity
    material.transparent = opacity < 1.0
    material.depthWrite = opacity === 1.0  // Re-enable depth write when opaque
    material.needsUpdate = true
  }

  // Dispose cloned materials to prevent leaks
  disposeMaterial(material: THREE.Material): void {
    material.dispose()
  }
}
```

### Material Cloning Strategy

**Why clone:** Each transitioning chunk needs independent opacity. Shared materials would cause all chunks to fade together.

**When to clone:**
- LOD transitions: Clone when starting fade
- Glass blocks: Clone once per glass chunk (static transparency)
- Chunk fade-in: Clone for initial load animation

**Lifecycle:**
- Create: When transition starts or chunk loads
- Update: During transition (opacity changes each frame)
- Dispose: When transition completes or chunk unloads

**Performance:** Material cloning is cheap (~0.01ms per clone). At peak, 40 clones during transitions = ~0.4ms total (acceptable).

**Memory:** Cloned materials share texture references (lightweight), only duplicate properties. ~1KB per clone × 40 = ~40KB (negligible).

### Future Benefits Unlocked

**By adding transparency system, we enable:**

1. **Proper glass rendering** - See through glass blocks (currently broken - marked transparent for light but render opaque)
2. **Water blocks** - Semi-transparent water with caustics
3. **Breaking animation** - Blocks fade out when destroyed (better UX than instant pop)
4. **Chunk fade-in** - New chunks fade from transparent to opaque on first load (professional polish)
5. **Particle effects** - Smoke, dust, magic effects with alpha blending
6. **Selection highlight** - Semi-transparent selection box overlay
7. **Block overlays** - Damage cracks, growth stages, etc.

**This transforms transparency from "LOD feature" to "core rendering capability."**

---

## Worker Modifications

### Message Type Updates

```typescript
// Worker request (add lodLevel)
interface MeshingTask {
  type: 'GEN_MESH'
  x: number
  z: number
  lodLevel: 0 | 1 | 2 | 3  // ← NEW
  priority: number         // ← NEW (for priority queue)
  neighborVoxels: Record<string, ArrayBuffer>
  neighborLight: Record<string, { sky: ArrayBuffer, block: ArrayBuffer }>
}

// Worker response (add lodLevel)
interface MeshingResult {
  type: 'MESH_GENERATED'
  x: number
  z: number
  lodLevel: 0 | 1 | 2 | 3  // ← NEW
  geometry: Record<string, {
    positions: ArrayBuffer
    colors: ArrayBuffer
    uvs: ArrayBuffer
    indices: ArrayBuffer
  }>
  timingMs: number
}
```

### Algorithm Selection

```typescript
// MeshingWorker.ts
self.onmessage = (event: MessageEvent<MeshingTask>) => {
  const { lodLevel } = event.data

  // Select mesher based on LOD level
  const mesher = selectMesher(lodLevel)
  const result = mesher.buildMesh(/* voxel data */)

  self.postMessage({
    lodLevel,  // Return level for cache storage
    ...result
  })
}

function selectMesher(level: number): BaseMesher {
  switch(level) {
    case 0: return new FullDetailMesher()    // Existing ChunkMesher
    case 1: return new NoAOMesher()           // ChunkMesher with AO disabled
    case 2: return new AggressiveMesher()     // 2×2 block merging
    case 3: return new OuterShellMesher()     // Surface only
  }
}
```

### Mesher Implementations

**FullDetailMesher (Level 0):**
- **Source:** Existing `ChunkMesher.ts` (no changes needed)
- **Lines of code:** ~200 (already implemented)

**NoAOMesher (Level 1):**
- **Source:** Copy `ChunkMesher.ts`, modify `FaceBuilder` to skip AO
- **Changes:** Remove 8-corner AO calculation (~15 lines deleted)
- **Lines of code:** ~185 (95% reuse)

**AggressiveMesher (Level 2):**
- **Source:** New implementation based on greedy meshing
- **Algorithm:** Group blocks into 2×2×2 regions, merge if all same type
- **Lines of code:** ~150 new lines

**OuterShellMesher (Level 3):**
- **Source:** Simple surface detection
- **Algorithm:**
  ```typescript
  for each block in chunk:
    for each of 6 faces:
      if neighbor is air or transparent:
        emit quad for this face
  ```
- **Lines of code:** ~80 new lines

**File organization:**
```
src/modules/rendering/meshing-application/lod/
  ├── FullDetailMesher.ts (symlink to ../ChunkMesher.ts)
  ├── NoAOMesher.ts
  ├── AggressiveMesher.ts
  └── OuterShellMesher.ts
```

---

## Performance Monitoring Extensions

### New LOD Metrics

```typescript
interface LODMetrics {
  // Chunk distribution
  level0Count: number
  level1Count: number
  level2Count: number
  level3Count: number

  // Transition metrics
  activeTransitions: number
  cacheHitRate: number  // Percentage

  // Generation time per level
  avgGenerationTime: {
    level0: number,  // ms
    level1: number,
    level2: number,
    level3: number
  }

  // Memory breakdown
  memoryUsage: {
    activeMeshes: number,    // MB for currently rendered meshes
    cachedMeshes: number,    // MB for LRU cache
    transitionMeshes: number // MB for meshes mid-fade
  }
}
```

### Debug Overlay Updates (F3)

```
FPS: 60.0 (16.7ms)
LOD: L0=9 L1=16 L2=24 L3=176 (225 total)
Transitions: 3 active (cache: 87% hits, 13% misses)
Memory: 234MB (active: 195MB, cache: 15MB, transitions: 24MB)
Budget: 2.8ms / 3.0ms
Workers: L=4/6 M=5/6
```

### New Debug Commands

```javascript
// LOD metrics
window.debug.getLODMetrics()

// Tune cache size
window.debug.setCacheSize(50)

// Tune LOD thresholds
window.debug.setLODThresholds({
  level0Max: 2.5,
  level1Max: 4.5,
  level2Max: 6.5
})

// Tune transition speed
window.debug.setTransitionDuration(200)  // ms

// Disable LOD (render all at Level 0 for comparison)
window.debug.setLODEnabled(false)
```

---

## Performance Targets

### Memory Budget

**Without LOD (extrapolated from RD=5):**
- 225 chunks × 600KB = ~135MB geometry
- 225 chunks × 2MB = ~450MB total
- **Too high** - would cause memory pressure on many systems

**With LOD at RD=7:**
- Level 0: 9 chunks × 600KB = 5.4MB
- Level 1: 16 chunks × 600KB = 9.6MB
- Level 2: 24 chunks × 150KB = 3.6MB
- Level 3: 176 chunks × 40KB = 7.0MB
- **Total geometry: ~26MB** (81% reduction)
- Cache: ~15MB
- Transitions: ~24MB (peak)
- **Total: ~65MB** vs 135MB without LOD
- **Overall game memory: <250MB** (vs ~450MB without LOD)

### Polygon Budget

**Without LOD:**
- 225 chunks × 12,000 polys average = 2.7M polygons
- **Too high** - GPU bottleneck, frame drops

**With LOD:**
- Level 0: 9 chunks × 12,000 = 108k
- Level 1: 16 chunks × 12,000 = 192k
- Level 2: 24 chunks × 3,000 = 72k
- Level 3: 176 chunks × 750 = 132k
- **Total: ~504k polygons** (81% reduction)
- **Easily within 60fps budget**

### Generation Time Budget

**Average per-chunk generation:**
- Level 0: 30ms
- Level 1: 18ms
- Level 2: 10ms
- Level 3: 3ms

**Initial RD=7 load (225 chunks, prioritized):**
- Workers process by priority (Level 0 first)
- With 6 workers + priority queue:
  - Level 0 (9 chunks): 9/6 = 2 batches × 30ms = 60ms
  - Level 1 (16 chunks): 16/6 = 3 batches × 18ms = 54ms
  - Level 2 (24 chunks): 24/6 = 4 batches × 10ms = 40ms
  - Level 3 (176 chunks): 176/6 = 30 batches × 3ms = 90ms
- **Total latency: ~250ms for all visible chunks** (L0-L2)
- **Total latency: ~500ms including background** (all 225)

**Success metrics:**
- FPS: 60 stable
- Memory: <250MB
- Initial load: <500ms for all chunks
- Cache hit rate: >70%
- No frame drops during LOD transitions

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)
- Create `PerformanceConfig` class with LOD settings
- Add advanced settings UI panel
- Create `LODMeshCache` with LRU eviction
- Write tests for cache hit/miss/eviction
- Document baseline RD=5 performance for comparison

### Phase 2: Priority Queue (Day 3)
- Modify `WorkerPool` to support priority
- Add `insertByPriority()` method
- Test priority ordering works correctly
- Verify no performance regression at RD=5

### Phase 3: Mesher Algorithms (Days 4-5)
- Implement `NoAOMesher` (Level 1)
- Implement `AggressiveMesher` (Level 2)
- Implement `OuterShellMesher` (Level 3)
- Write unit tests for each mesher
- Verify polygon counts match targets

### Phase 4: Material System (Day 6)
- Add transparency support to `MaterialSystem`
- Implement material cloning for independent opacity
- Add `setMaterialOpacity()` method
- Test glass blocks render transparent
- Fix any z-fighting issues

### Phase 5: LODManager (Days 7-8)
- Create `LODManager` class
- Implement distance calculation with hysteresis
- Implement transition state management
- Integrate cache lookups
- Wire up to GameOrchestrator

### Phase 6: Integration & Testing (Days 9-10)
- Test at RD=7 with all LOD levels
- Verify transitions are smooth (300ms fade)
- Tune thresholds if needed
- Performance profiling
- Update documentation

**Estimated total: 10 days**

---

## Risk Assessment

### Low Risk
- **Cache implementation** - Standard LRU, well-understood pattern
- **Priority queue** - Simple insertion sort, minimal complexity
- **Level 1-2 meshers** - Based on existing greedy meshing

### Medium Risk
- **Material cloning lifecycle** - Need careful dispose() to prevent GPU memory leaks
- **Transition timing** - May need tuning for different hardware
- **Level 3 mesher** - New algorithm, may have edge cases

### High Risk
- **None identified**

### Mitigation Strategies
- TDD for all new components (write tests first)
- Incremental testing (verify each LOD level independently)
- Performance monitoring built-in (F3 overlay tracks everything)
- Configurable thresholds (can adjust without code changes)

---

## Success Criteria

**Performance:**
- [ ] 60fps stable at RD=7 (225 chunks)
- [ ] Memory <250MB
- [ ] Initial chunk load <500ms
- [ ] No frame drops during LOD transitions
- [ ] Cache hit rate >70%

**Visual Quality:**
- [ ] Level 0-1 transitions barely noticeable
- [ ] Level 1-2 transitions acceptable
- [ ] Level 2-3 transitions only at horizon (acceptable quality drop)
- [ ] No flickering or z-fighting
- [ ] Glass blocks render transparent

**Functional:**
- [ ] All existing features work (block placement, physics, lighting)
- [ ] Save/load compatible with LOD system
- [ ] Settings UI allows threshold tuning
- [ ] F3 overlay shows LOD distribution

---

## Future Enhancements

After RD=7 is stable:

1. **Dynamic LOD adjustment** - Auto-tune thresholds based on FPS
2. **Temporal LOD** - Reduce detail for chunks not looked at recently
3. **Texture atlas** - Reduce draw calls (separate optimization)
4. **Target RD=10** - With additional optimizations

---

## References

**Previous work:**
- Phase 2 Design: `docs/plans/2025-12-11-rd5-optimization-design.md`
- Phase 2 Implementation: `docs/plans/2025-12-11-rd5-optimization.md`
- Optimization Summary: `docs/performance/optimization-summary.md`

**Code references:**
- `src/modules/rendering/meshing-application/MeshingService.ts` - Existing meshing
- `src/modules/rendering/meshing-application/ChunkMesher.ts` - Base mesher algorithm
- `src/modules/rendering/application/MaterialSystem.ts` - Material management
- `src/shared/infrastructure/WorkerPool.ts` - Worker pool base class

**External resources:**
- Three.js Material.transparent documentation
- LOD techniques in voxel engines
- Greedy meshing algorithm (0fps.net)

---

## Approval

**Design Status:** ✅ Complete - Ready for implementation planning

**Next Steps:**
1. Use superpowers:writing-plans to create detailed implementation plan
2. Execute plan using superpowers:executing-plans
3. Validate with browser testing at RD=7
