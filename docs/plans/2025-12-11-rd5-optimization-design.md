# RD=5 Performance Optimization Design

**Date:** 2025-12-11
**Author:** Claude (Phase 2 Session)
**Status:** Approved for Implementation
**Target:** Render Distance 5 (121 chunks) at stable 60fps

---

## Executive Summary

Enable render distance 5 by implementing four key optimizations to the chunk loading pipeline: budget enforcement, worker pools, chunk prioritization, and performance instrumentation. These changes require no algorithm rewrites and work within the existing hexagonal architecture.

**Current State (RD=3):**
- 49 chunks, 60fps stable, ~59MB memory
- New chunk latency: ~200ms

**Target State (RD=5):**
- 121 chunks, 60fps stable, ~145MB memory
- New chunk latency: <500ms
- No frame drops during chunk loading

**Estimated Effort:** 7 days of focused development

---

## Problem Analysis

### Current Bottlenecks

The chunk loading analysis identified three critical bottlenecks at RD>3:

1. **Unbounded Main Thread Work**
   - `rebuildBudgetMs = 3` exists but is never enforced
   - `processDirtyQueue()` processes ALL dirty chunks per frame
   - Causes frame drops when many chunks need meshing

2. **Sequential Worker Processing**
   - 1 LightingWorker processes chunks one at a time
   - 1 MeshingWorker processes chunks one at a time
   - At RD=5: 25 new chunks × 35ms each = 875ms sequential processing

3. **No Prioritization**
   - All chunks treated equally regardless of visibility
   - Chunks behind player may render before visible chunks
   - Poor user experience during chunk loading

4. **Minimal Instrumentation**
   - No per-chunk timing metrics
   - No queue depth tracking
   - No worker utilization monitoring
   - Cannot measure optimization impact

### Performance Timeline (Current System at RD=5)

When player moves 1 chunk:
```
Frame 0: 25 new chunks requested

Frame 0-3: Terrain generation (5-15ms each, parallel)
Frame 6-20: Lighting calculation (10-30ms each, SEQUENTIAL)
  → 25 chunks × 20ms = 500ms = 30 frames

Frame 20-50: Mesh generation (20-50ms each, SEQUENTIAL)
  → 25 chunks × 35ms = 875ms = 52 frames

Frame 50+: Rendering (1-3ms each, trivial)

Total Latency: ~2 seconds for all chunks to render
```

---

## Solution Design

### Architecture Principles

- **Non-breaking changes** - All modifications compatible with existing voxel data structures
- **Incremental testing** - Each optimization testable independently
- **Metrics-driven** - Instrumentation to measure actual bottlenecks
- **Backward compatible** - Can easily revert or disable optimizations

### Optimization 1: Budget Enforcement (3ms/frame)

**Problem:** Main thread processes all dirty chunks per frame without time limits.

**Solution:** Enforce the existing `rebuildBudgetMs = 3` variable.

**Location:** `src/modules/rendering/meshing-application/MeshingService.ts`

**Implementation:**
```typescript
processDirtyQueue(): void {
  const startTime = performance.now()

  while (this.dirtyQueue.length > 0) {
    const elapsed = performance.now() - startTime

    // Enforce budget - stop if we've used our frame time
    if (elapsed >= this.rebuildBudgetMs) {
      break  // Continue next frame
    }

    const coord = this.dirtyQueue.shift()
    this.requestMesh(coord)  // Send to worker
  }
}
```

**Behavior:**
- Track elapsed time per frame with `performance.now()`
- Process chunks until budget exhausted (3ms)
- Leave remaining chunks in queue for next frame
- Processes ~3-6 chunks per frame (0.5-1ms serialization cost each)

**Performance Impact:**
- Prevents frame drops during heavy meshing
- Maintains stable 60fps
- Queue processing spreads across ~8-9 frames for 25 chunks

**Trade-offs:**
- Pro: Prevents frame drops, maintains 60fps
- Pro: Simple implementation, low risk
- Con: Chunks take multiple frames to queue (mitigated by worker pools)

---

### Optimization 2: Worker Pools for Parallel Processing

**Problem:** Single workers create sequential bottleneck (875ms for 25 chunks).

**Solution:** Use pools of 6 workers for both lighting and meshing.

**Architecture:**
```
Main Thread
    ↓
LightingWorkerPool (6 workers)
    ├─ LightingWorker #1 ─┐
    ├─ LightingWorker #2 ─┤
    ├─ LightingWorker #3 ─┼─→ Process chunks in parallel
    ├─ LightingWorker #4 ─┤
    ├─ LightingWorker #5 ─┤
    └─ LightingWorker #6 ─┘

MeshingWorkerPool (6 workers)
    ├─ MeshingWorker #1 ─┐
    ├─ MeshingWorker #2 ─┤
    ├─ MeshingWorker #3 ─┼─→ Process chunks in parallel
    ├─ MeshingWorker #4 ─┤
    ├─ MeshingWorker #5 ─┤
    └─ MeshingWorker #6 ─┘
```

**New Files:**
- `src/modules/environment/infrastructure/LightingWorkerPool.ts`
- `src/modules/rendering/infrastructure/MeshingWorkerPool.ts`

**WorkerPool Interface:**
```typescript
class WorkerPool {
  private workers: Worker[]
  private availableWorkers: Worker[]
  private taskQueue: Task[]

  constructor(workerCount: number, workerScript: string)

  // Submit task to next available worker
  execute(task: Task): Promise<Result>

  // Returns worker to available pool
  private onWorkerComplete(worker: Worker, result: Result)

  // Cleanup
  terminate(): void
}
```

**Worker Count Selection:**
- 6 workers chosen based on typical CPU cores (4-8 cores)
- Leaves 2 cores for main thread + OS
- Configurable via constructor for future tuning

**Message Handling:**
- Each worker gets unique ID
- Pool tracks which worker processes which chunk
- Workers post back with worker ID in result
- Pool routes result to correct promise resolver

**Performance Impact:**
- Lighting: 25 chunks / 6 workers = ~4 chunks per worker
  - 4 chunks × 20ms = 80ms = ~5 frames (was 30 frames)
- Meshing: 25 chunks / 6 workers = ~4 chunks per worker
  - 4 chunks × 35ms = 140ms = ~8 frames (was 52 frames)
- **Total latency: ~280ms** (down from ~2000ms)

**Trade-offs:**
- Pro: 7× faster chunk processing
- Pro: Exploits idle CPU cores
- Con: 6× more memory per worker pool (~3MB overhead)
- Con: More complex worker lifecycle management

---

### Optimization 3: Chunk Prioritization (Frustum Culling)

**Problem:** All chunks treated equally - chunks behind player may render before visible chunks.

**Solution:** Prioritize chunks based on distance, visibility, and movement direction.

**Location:** `src/modules/game/application/GameOrchestrator.ts`

**Implementation:**
```typescript
private prioritizeChunks(chunks: ChunkCoordinate[], camera: THREE.Camera): ChunkCoordinate[] {
  const frustum = new THREE.Frustum()
  frustum.setFromProjectionMatrix(
    camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse)
  )

  return chunks.sort((a, b) => {
    const scoreA = this.calculatePriority(a, camera, frustum)
    const scoreB = this.calculatePriority(b, camera, frustum)
    return scoreA - scoreB
  })
}

private calculatePriority(coord: ChunkCoordinate, camera: THREE.Camera, frustum: THREE.Frustum): number {
  // Factor 1: Distance (0-100)
  const distanceScore = Math.sqrt(coord.x * coord.x + coord.z * coord.z) * 10

  // Factor 2: Frustum visibility (-50 if visible, 0 if not)
  const chunkBox = this.getChunkBoundingBox(coord)
  const visibilityScore = frustum.intersectsBox(chunkBox) ? -50 : 0

  // Factor 3: Movement direction (-20 if ahead, 0 if not)
  const forwardScore = this.isInMovementDirection(coord, camera) ? -20 : 0

  return distanceScore + visibilityScore + forwardScore
}
```

**Priority Tiers:**
- **Tier 1 (score: -60 to 0):** Visible + close + ahead of player
- **Tier 2 (score: 0 to 50):** Visible but farther away
- **Tier 3 (score: 50+):** Behind player or outside frustum

**Example at RD=5:**
- Player looks north, moves forward
- 121 chunks sorted: ~40 visible chunks load first
- ~81 background chunks load after visible chunks complete

**Performance Impact:**
- User sees visible chunks render in ~200ms
- Background chunks fill in over next ~100ms
- Better perceived performance

**Performance Cost:**
- Frustum calculation: ~0.1ms per sort
- Bounding box checks: ~0.001ms × 121 chunks = ~0.12ms
- **Total overhead: ~0.22ms** (acceptable)

**Trade-offs:**
- Pro: Much better user experience
- Pro: Minimal performance cost
- Con: Background chunks may take longer to complete
- Con: Adds complexity to chunk loading logic

---

### Optimization 4: Performance Instrumentation & Metrics

**Problem:** Cannot measure optimization impact without proper metrics.

**Solution:** Centralized performance monitoring with real-time display.

**Location:** `src/modules/game/infrastructure/PerformanceMonitor.ts`

**Metrics Tracked:**
```typescript
interface ChunkMetrics {
  // Per-chunk timings
  terrainGenMs: number
  lightingMs: number
  meshingMs: number
  renderMs: number
  totalMs: number

  // Queue depths
  lightingQueueDepth: number
  meshingQueueDepth: number

  // Worker utilization
  lightingWorkersBusy: number  // 0-6
  meshingWorkersBusy: number   // 0-6
}

interface FrameMetrics {
  fps: number
  frameTimeMs: number
  chunksProcessed: number
  budgetUsedMs: number  // How much of 3ms budget used

  // Memory
  totalMemoryMB: number
  geometryMemoryMB: number
}
```

**Display Options:**

1. **Debug Overlay (F3 key toggle):**
```
FPS: 60 (16.7ms)
Chunks: 121 loaded, 5 in queue
Workers: L=4/6 busy, M=3/6 busy
Budget: 2.1ms / 3.0ms used
Memory: 152MB (42MB geometry)

Last chunk: 45ms total
  - Terrain: 8ms
  - Lighting: 15ms
  - Meshing: 21ms
  - Render: 1ms
```

2. **Console Logging (opt-in via `window.debug.enableMetrics()`):**
```typescript
console.log('📊 Frame metrics', {
  fps: 59.8,
  chunksQueued: 3,
  workerUtilization: '6/6 busy'
})
```

3. **Performance Timeline (Chrome DevTools integration):**
```typescript
performance.mark('chunk-terrain-start')
// ... terrain generation
performance.mark('chunk-terrain-end')
performance.measure('Terrain Gen', 'chunk-terrain-start', 'chunk-terrain-end')
```

**Integration Points:**
- Workers post timing data back to main thread
- Services report queue depths each frame
- PerformanceMonitor aggregates and displays
- GameOrchestrator.update() collects frame metrics

**Performance Cost:**
- ~0.1ms per frame for metric collection
- Negligible (< 1% overhead)

**Trade-offs:**
- Pro: Essential for measuring optimization impact
- Pro: Invaluable for debugging performance issues
- Pro: Can be completely disabled in production
- Con: Slight memory overhead for metric storage

---

## Implementation Plan

### Phase 1: Foundation (Days 1-2)

**Goal:** Establish performance baseline and instrumentation

**Tasks:**
1. Create `PerformanceMonitor.ts` with metrics interfaces
2. Add timing to existing ChunkWorker, LightingWorker, MeshingWorker
3. Add F3 debug overlay to UIService
4. Run at RD=3 and document baseline metrics
5. Test at RD=4 and measure degradation

**Deliverables:**
- Performance monitoring infrastructure
- Baseline metrics documented
- Debug overlay functional

**Success Criteria:**
- Can see real-time FPS, queue depths, worker status
- Can identify frame drops and their causes
- Metrics match analysis predictions (~200ms at RD=3)

---

### Phase 2: Budget Enforcement (Day 3)

**Goal:** Prevent frame drops with 3ms budget

**Tasks:**
1. Modify `MeshingService.processDirtyQueue()` with budget check
2. Add budget usage metric to PerformanceMonitor
3. Test at RD=3 (should be no change)
4. Test at RD=4 (should maintain 60fps)
5. Measure queue processing time

**Deliverables:**
- Budget enforcement implemented
- Metrics show budget usage per frame
- Stable frame times at RD=4

**Success Criteria:**
- Frame time never exceeds 16.7ms
- Budget usage stays under 3ms per frame
- FPS remains 60 even during burst loads

---

### Phase 3: Worker Pools (Days 4-5)

**Goal:** Parallelize lighting and meshing for 7× speedup

**Tasks:**
1. Create `WorkerPool.ts` base class
2. Create `LightingWorkerPool.ts` (6 workers)
3. Create `MeshingWorkerPool.ts` (6 workers)
4. Update `EnvironmentService` to use LightingWorkerPool
5. Update `MeshingService` to use MeshingWorkerPool
6. Add worker utilization metrics
7. Test at RD=3, then RD=4, then RD=5

**Deliverables:**
- Worker pool infrastructure
- 6 parallel workers for lighting
- 6 parallel workers for meshing
- Worker utilization metrics

**Success Criteria:**
- Chunk processing time reduced by 6-7×
- Worker utilization shows 4-6 workers busy during loads
- No race conditions or worker deadlocks
- Memory usage acceptable (~3MB overhead per pool)

---

### Phase 4: Prioritization (Day 6)

**Goal:** Improve perceived performance with frustum culling

**Tasks:**
1. Add frustum culling to `GameOrchestrator.generateChunksInRenderDistance()`
2. Implement `calculatePriority()` with three factors
3. Implement `getChunkBoundingBox()` helper
4. Implement `isInMovementDirection()` helper
5. Test visual perception improvements
6. Fine-tune priority weights if needed

**Deliverables:**
- Frustum culling implemented
- Chunk loading prioritizes visible chunks
- Priority weights tuned for best UX

**Success Criteria:**
- Visible chunks render in <300ms
- Background chunks fill in after
- User cannot see empty space during movement
- Prioritization overhead <0.5ms per frame

---

### Phase 5: Integration & Testing (Day 7)

**Goal:** Validate all optimizations work together at RD=5

**Tasks:**
1. Test at RD=5 with all optimizations enabled
2. Stress test: rapid movement, teleportation, AFK
3. Profile with Chrome DevTools
4. Identify any remaining bottlenecks
5. Document performance improvements
6. Update CLAUDE.md with new metrics

**Deliverables:**
- RD=5 running at stable 60fps
- Performance benchmarks documented
- Updated documentation

**Success Criteria:**
- 60fps stable at RD=5 (121 chunks)
- Chunk load latency <500ms
- Memory <200MB
- No frame drops during normal gameplay
- All functional tests pass

---

## Testing Strategy

### Functional Tests

All existing functionality must continue to work:

- [ ] Block placement/removal works correctly
- [ ] Lighting propagates correctly (sunlight + block lights)
- [ ] Chunks unload properly when out of range
- [ ] No memory leaks over 10+ minutes of play
- [ ] Save/load system compatible with optimizations
- [ ] Block selection (raycasting) still accurate
- [ ] Physics/collision detection unaffected
- [ ] Input system responsive
- [ ] UI state transitions work (SPLASH/MENU/PLAYING/PAUSE)

### Performance Tests

Target metrics must be achieved:

**At RD=3 (baseline):**
- [ ] 60fps stable (no regression)
- [ ] Frame time <16.7ms
- [ ] Memory ~59MB

**At RD=4 (intermediate):**
- [ ] 60fps stable
- [ ] Frame time <16.7ms
- [ ] Chunk load latency <400ms
- [ ] Memory ~90MB

**At RD=5 (target):**
- [ ] 60fps stable
- [ ] Frame time <16.7ms (no drops)
- [ ] Chunk load latency <500ms
- [ ] Memory <200MB
- [ ] Worker utilization 60-80%
- [ ] Budget usage 2-3ms per frame during loads

### Edge Cases

Stress test scenarios:

- [ ] **Rapid movement:** Sprint continuously for 1 minute
- [ ] **Teleport:** Jump 10 chunks instantly (burst load 121 chunks)
- [ ] **AFK:** Stand still for 5+ minutes (verify no memory leaks)
- [ ] **Render distance changes:** Switch RD=3→5→3→5 rapidly
- [ ] **Block spam:** Place/remove 100 blocks rapidly
- [ ] **Lighting stress:** Place 50 glowstone blocks at once

### Browser Compatibility

Test on multiple browsers:

- [ ] Chrome 120+ (primary target)
- [ ] Firefox 120+
- [ ] Safari 17+ (WebKit)
- [ ] Edge 120+

---

## Success Metrics

### Before Optimization (RD=3)

**Baseline:**
- Chunks: 49 loaded
- FPS: 60 stable
- Memory: ~59MB
- Chunk latency: ~200ms
- Frame drops: None

**At RD=5 (extrapolated):**
- Chunks: 121 loaded
- FPS: ~20-30 (estimated)
- Memory: ~145MB
- Chunk latency: ~2000ms
- Frame drops: Frequent

### After Optimization (Target RD=5)

**Performance:**
- Chunks: 121 loaded
- FPS: 60 stable
- Memory: <200MB (~145MB typical)
- Chunk latency: <500ms
- Frame drops: None
- Budget usage: 2-3ms per frame
- Worker utilization: 60-80% during loads

**Improvement factors:**
- Chunk latency: **4× faster** (2000ms → 500ms)
- FPS stability: **3× better** (20-30fps → 60fps)
- User experience: **Significantly improved** (visible chunks render first)

---

## Risk Assessment

### Low Risk

**Budget enforcement:**
- Simple implementation
- Easy to test and verify
- Can disable if issues arise

**Performance instrumentation:**
- Non-critical path
- Can be disabled entirely
- No gameplay impact

### Medium Risk

**Worker pools:**
- More complex lifecycle management
- Potential race conditions
- Memory overhead (mitigated by testing)
- Mitigation: Extensive testing, fallback to single worker

**Chunk prioritization:**
- Adds complexity to loading logic
- Potential edge cases with frustum calculation
- Mitigation: Extensive visual testing, can adjust weights

### High Risk

**None identified.** All optimizations are architectural improvements without algorithm changes.

---

## Future Enhancements

After RD=5 is stable, consider:

1. **Greedy Meshing** - 90% polygon reduction for RD=7+
2. **LOD System** - Lower detail for distant chunks
3. **Texture Atlas** - Reduce draw calls
4. **Lighting Cache** - Reuse lighting for unchanged chunks
5. **Octree Culling** - Spatial partitioning for large render distances
6. **WebGPU Compute** - GPU-accelerated meshing for RD=10+

---

## References

**Analysis Documents:**
- Chunk Loading Performance Analysis (2025-12-11)
- Phase 1 Session Handoff (2025-12-11)

**Code References:**
- `src/modules/game/application/GameOrchestrator.ts` - Chunk loading coordination
- `src/modules/rendering/meshing-application/MeshingService.ts` - Meshing queue management
- `src/modules/environment/workers/LightingWorker.ts` - Lighting calculation
- `src/modules/rendering/workers/MeshingWorker.ts` - Mesh generation
- `CLAUDE.md` - Architecture overview

**External Resources:**
- Three.js Frustum documentation
- Web Workers API specification
- Performance API documentation
- 0fps.net greedy meshing algorithm (for future reference)

---

## Approval

**Design Status:** ✅ Approved for implementation

**Next Steps:**
1. Create git worktree for isolated development
2. Create detailed implementation plan
3. Begin Phase 1: Foundation & Instrumentation

**Estimated Timeline:** 7 days focused development

**Risk Level:** Low-Medium (well-understood optimizations, incremental approach)

**Success Probability:** High (80-90%)
