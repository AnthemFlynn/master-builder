import { describe, it, expect, beforeEach } from 'bun:test'
import { PerformanceMonitor } from '../PerformanceMonitor'

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
  })

  it('should track chunk metrics', () => {
    const coord = { x: 0, z: 0 }
    monitor.recordChunkTiming(coord, {
      terrainGenMs: 10,
      lightingMs: 15,
      meshingMs: 20,
      renderMs: 2,
      totalMs: 47
    })

    const metrics = monitor.getLastChunkMetrics()
    expect(metrics).toEqual({
      terrainGenMs: 10,
      lightingMs: 15,
      meshingMs: 20,
      renderMs: 2,
      totalMs: 47
    })
  })

  it('should track frame metrics', () => {
    monitor.recordFrameMetrics({
      fps: 60,
      frameTimeMs: 16.7,
      chunksProcessed: 3,
      budgetUsedMs: 2.1
    })

    const metrics = monitor.getFrameMetrics()
    expect(metrics.fps).toBe(60)
    expect(metrics.frameTimeMs).toBe(16.7)
  })

  it('should track queue depths', () => {
    monitor.setQueueDepth('lighting', 5)
    monitor.setQueueDepth('meshing', 3)

    expect(monitor.getQueueDepth('lighting')).toBe(5)
    expect(monitor.getQueueDepth('meshing')).toBe(3)
  })

  it('should track worker utilization', () => {
    monitor.setWorkerUtilization('lighting', 4, 6)
    monitor.setWorkerUtilization('meshing', 3, 6)

    const util = monitor.getWorkerUtilization()
    expect(util.lighting).toEqual({ busy: 4, total: 6 })
    expect(util.meshing).toEqual({ busy: 3, total: 6 })
  })

  it('should create performance marks and measures', () => {
    monitor.mark('chunk-start')
    // Simulate work
    monitor.mark('chunk-end')
    monitor.measure('Chunk Processing', 'chunk-start', 'chunk-end')

    const measures = monitor.getMeasures('Chunk Processing')
    expect(measures.length).toBeGreaterThan(0)
    expect(measures[0].duration).toBeGreaterThanOrEqual(0)
  })

  it('should clear old marks and measures', () => {
    monitor.mark('test-mark')
    monitor.measure('test-measure', 'test-mark')

    monitor.clearMarks('test-mark')
    monitor.clearMeasures('test-measure')

    expect(monitor.getMeasures('test-measure')).toEqual([])
  })
})
