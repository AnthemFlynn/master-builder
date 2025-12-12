import { ChunkCoordinate } from '@/shared/domain/ChunkCoordinate'

export interface ChunkMetrics {
  terrainGenMs: number
  lightingMs: number
  meshingMs: number
  renderMs: number
  totalMs: number
}

export interface FrameMetrics {
  fps: number
  frameTimeMs: number
  chunksProcessed: number
  budgetUsedMs: number
}

interface WorkerUtilization {
  busy: number
  total: number
}

export class PerformanceMonitor {
  private lastChunkMetrics: ChunkMetrics | null = null
  private frameMetrics: FrameMetrics = {
    fps: 0,
    frameTimeMs: 0,
    chunksProcessed: 0,
    budgetUsedMs: 0
  }
  private queueDepths: Map<string, number> = new Map()
  private workerUtilization: Map<string, WorkerUtilization> = new Map()

  recordChunkTiming(coord: ChunkCoordinate, metrics: ChunkMetrics): void {
    this.lastChunkMetrics = metrics
  }

  getLastChunkMetrics(): ChunkMetrics | null {
    return this.lastChunkMetrics
  }

  recordFrameMetrics(metrics: FrameMetrics): void {
    this.frameMetrics = metrics
  }

  getFrameMetrics(): FrameMetrics {
    return this.frameMetrics
  }

  setQueueDepth(queue: string, depth: number): void {
    this.queueDepths.set(queue, depth)
  }

  getQueueDepth(queue: string): number {
    return this.queueDepths.get(queue) ?? 0
  }

  setWorkerUtilization(type: string, busy: number, total: number): void {
    this.workerUtilization.set(type, { busy, total })
  }

  getWorkerUtilization(): Record<string, WorkerUtilization> {
    const result: Record<string, WorkerUtilization> = {}
    this.workerUtilization.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  mark(name: string): void {
    performance.mark(name)
  }

  measure(name: string, startMark: string, endMark?: string): void {
    if (endMark) {
      performance.measure(name, startMark, endMark)
    } else {
      performance.measure(name, startMark)
    }
  }

  getMeasures(name: string): PerformanceMeasure[] {
    return performance.getEntriesByName(name, 'measure') as PerformanceMeasure[]
  }

  clearMarks(name?: string): void {
    if (name) {
      performance.clearMarks(name)
    } else {
      performance.clearMarks()
    }
  }

  clearMeasures(name?: string): void {
    if (name) {
      performance.clearMeasures(name)
    } else {
      performance.clearMeasures()
    }
  }
}
