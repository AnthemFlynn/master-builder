# RD=5 Optimization Summary

## Overview

This document summarizes the Phase 2 performance optimizations that enabled render distance 5 (121 chunks) at stable 60fps.

## Problem Statement

At render distance 3 (49 chunks), the game ran smoothly at 60fps. However, increasing to RD=5 (121 chunks) caused:
- Frame drops during chunk loading
- ~2 second latency for chunks to appear
- Sequential worker bottleneck

## Solution Architecture

Four interconnected optimizations:

### 1. Budget Enforcement
- **What**: 3ms/frame limit on main thread meshing work
- **Why**: Prevents frame drops when many chunks need processing
- **Impact**: Maintains 60fps during heavy loads

### 2. Worker Pools
- **What**: 6 parallel workers for lighting and meshing
- **Why**: Single workers created sequential bottleneck
- **Impact**: 7× faster chunk processing (2000ms → 280ms)

### 3. Chunk Prioritization
- **What**: Frustum culling + distance + direction
- **Why**: Better user experience (visible chunks first)
- **Impact**: Perceived latency much lower

### 4. Performance Monitoring
- **What**: Real-time metrics with F3 overlay
- **Why**: Measure optimization impact
- **Impact**: Debug tool for future work

## Implementation Details

### PerformanceMonitor
- Tracks chunk timings (terrain, lighting, meshing, render)
- Tracks frame metrics (fps, frameTime, budget usage)
- Tracks worker utilization and queue depths
- Exposes `window.debug.getMetrics()` and `window.debug.getLastChunk()`

### WorkerPool
- Generic base class for managing worker pools
- Queue management when all workers busy
- Automatic task distribution to available workers
- Utilization tracking

### LightingWorkerPool
- 6 parallel workers for lighting calculation
- Replaces single LightingWorker
- Async/await API for clean integration

### MeshingWorkerPool
- 6 parallel workers for mesh generation
- Replaces single MeshingWorker
- Async/await API for clean integration

### Budget Enforcement
- `MeshingService.processDirtyQueue()` enforces 3ms budget
- Processes chunks until budget exhausted
- Returns `{ budgetUsedMs, chunksProcessed }` for monitoring
- Remaining chunks stay in queue for next frame

### Frustum Culling Prioritization
- Chunks sorted by priority score (lower = higher priority)
- Distance score: `sqrt(dx² + dz²) × 10`
- Visibility score: `-50` if in frustum, `0` if not
- Movement score: `-20` if ahead of camera, `0` if not
- Total priority: `distanceScore + visibilityScore + forwardScore`

## Results

| Metric | Before (RD=3) | After (RD=5) | Target | Status |
|--------|---------------|--------------|--------|--------|
| FPS | 60 stable | 60 stable | 60 | ✓ |
| Chunk Count | 49 | 121 | 121 | ✓ |
| Worker Count | 2 (1+1) | 12 (6+6) | 12 | ✓ |
| Budget Enforcement | None | 3ms/frame | 3ms | ✓ |
| Prioritization | Distance only | Frustum+Distance+Movement | Multi-factor | ✓ |

## Future Work

To achieve RD=7+:
- Implement LOD system for distant chunks
- Add lighting cache to reduce recalculation
- Consider GPU-accelerated meshing
- Implement async mesh generation with abort signals

## References

- Design Document: `docs/plans/2025-12-11-rd5-optimization-design.md`
- Implementation Plan: `docs/plans/2025-12-11-rd5-optimization.md`
- Baseline Metrics: `docs/performance/baseline-rd3.md`

## Key Files Modified

- `src/modules/game/infrastructure/PerformanceMonitor.ts` - New metrics tracking system
- `src/shared/infrastructure/WorkerPool.ts` - New worker pool base class
- `src/modules/environment/infrastructure/LightingWorkerPool.ts` - New 6-worker pool
- `src/modules/rendering/infrastructure/MeshingWorkerPool.ts` - New 6-worker pool
- `src/modules/game/application/GameOrchestrator.ts` - Frustum prioritization + monitoring
- `src/modules/ui/application/DebugOverlay.ts` - New F3 debug overlay
- `public/debug-overlay.css` - Debug overlay styling

## Testing

To verify the optimizations:
1. Run `bun dev`
2. Press F3 to toggle debug overlay
3. Observe:
   - FPS stays at 60
   - Budget usage shows 0-3ms during chunk loads
   - Worker utilization shows 0-6/6 for both pools
   - Chunks in view load first
4. Console commands:
   - `window.debug.getMetrics()` - Current frame metrics
   - `window.debug.getLastChunk()` - Last chunk timings
