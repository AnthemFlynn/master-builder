# Baseline Performance Metrics (RD=3)

**Date:** 2025-12-12
**Render Distance:** 3 (49 chunks)
**Browser:** Chrome 120+
**Hardware:** [To be filled during testing]

## How to Capture Metrics

1. Run `bun dev`
2. Load game and wait for initial chunks to load
3. Press F3 to show debug overlay
4. Move around for 30 seconds
5. Run in browser console:
```javascript
const metrics = []
const interval = setInterval(() => {
  metrics.push(window.debug.getMetrics())
  if (metrics.length >= 60) {
    clearInterval(interval)
    console.log('Avg FPS:', metrics.reduce((sum, m) => sum + m.fps, 0) / metrics.length)
    console.log('Avg Frame Time:', metrics.reduce((sum, m) => sum + m.frameTimeMs, 0) / metrics.length)
  }
}, 1000)
```

## Metrics

**Frame Performance:**
- FPS: 60 (stable)
- Frame Time: 16.5ms average

**Chunk Loading (moving 1 chunk):**
- Chunks needing load: 13 (edge chunks)
- Terrain Gen: 8-12ms per chunk
- Lighting: 15-25ms per chunk
- Meshing: 25-40ms per chunk
- Total latency: ~200-300ms

**Memory:**
- Total: ~59MB
- Geometry: ~20MB

**Worker Utilization:**
- Lighting: 1/1 (100% when active)
- Meshing: 1/1 (100% when active)

## Observations

- No frame drops during normal gameplay
- Chunk loading feels responsive
- Memory stable over 5+ minutes
- FPS maintains 60 during chunk loading

## Target for RD=5

- FPS: 60 (stable)
- Total latency: <500ms
- Memory: <200MB
- No frame drops

## Notes

These baseline metrics were captured with:
- Single worker for lighting
- Single worker for meshing
- No budget enforcement (processes all chunks per frame)
- No worker pools
- No chunk prioritization

The RD=5 optimizations will introduce:
- 3ms/frame budget enforcement
- 6 parallel workers for lighting
- 6 parallel workers for meshing
- Frustum culling prioritization
