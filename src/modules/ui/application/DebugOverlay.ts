import { PerformanceMonitor } from '../../game/infrastructure/PerformanceMonitor'

interface Position {
  x: number
  y: number
  z: number
}

export class DebugOverlay {
  private container: HTMLDivElement
  private enabled: boolean = false
  private monitor: PerformanceMonitor
  private handleKeyDown: (e: KeyboardEvent) => void
  private getPosition?: () => Position

  constructor(monitor: PerformanceMonitor, getPosition?: () => Position) {
    this.monitor = monitor
    this.getPosition = getPosition
    this.container = document.createElement('div')
    this.container.id = 'debug-overlay'
    this.container.style.display = 'none'
    document.body.appendChild(this.container)

    // F3 key toggle
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault()
        this.toggle()
      }
    }
    window.addEventListener('keydown', this.handleKeyDown)
  }

  toggle(): void {
    this.enabled = !this.enabled
    this.container.style.display = this.enabled ? 'block' : 'none'
  }

  update(): void {
    if (!this.enabled) return

    const frameMetrics = this.monitor.getFrameMetrics()
    const chunkMetrics = this.monitor.getLastChunkMetrics()
    const lodMetrics = this.monitor.getLODMetrics()
    const workerUtil = this.monitor.getWorkerUtilization()
    const lightingQueue = this.monitor.getQueueDepth('lighting')
    const meshingQueue = this.monitor.getQueueDepth('meshing')
    const pos = this.getPosition?.()

    this.container.innerHTML = `
      <div class="debug-section">
        ${pos ? `<div>XYZ: ${pos.x.toFixed(1)} / ${pos.y.toFixed(1)} / ${pos.z.toFixed(1)}</div>` : ''}
        <div>FPS: ${frameMetrics.fps.toFixed(1)} (${frameMetrics.frameTimeMs.toFixed(1)}ms)</div>
        <div>LOD: L0=${lodMetrics.level0Count} L1=${lodMetrics.level1Count} L2=${lodMetrics.level2Count} L3=${lodMetrics.level3Count}</div>
        <div>Transitions: ${lodMetrics.activeTransitions} (cache: ${(lodMetrics.cacheHitRate * 100).toFixed(0)}%)</div>
        <div>Chunks Queued: L=${lightingQueue} M=${meshingQueue}</div>
        <div>Workers: L=${workerUtil.lighting?.busy ?? 0}/${workerUtil.lighting?.total ?? 0} M=${workerUtil.meshing?.busy ?? 0}/${workerUtil.meshing?.total ?? 0}</div>
        <div>Budget: ${frameMetrics.budgetUsedMs.toFixed(1)}ms / 3.0ms</div>
      </div>
      ${chunkMetrics ? `
        <div class="debug-section">
          <div>Last Chunk: ${chunkMetrics.totalMs.toFixed(0)}ms total</div>
          <div>  - Terrain: ${chunkMetrics.terrainGenMs.toFixed(0)}ms</div>
          <div>  - Lighting: ${chunkMetrics.lightingMs.toFixed(0)}ms</div>
          <div>  - Meshing: ${chunkMetrics.meshingMs.toFixed(0)}ms</div>
          <div>  - Render: ${chunkMetrics.renderMs.toFixed(0)}ms</div>
        </div>
      ` : ''}
    `
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    this.container.remove()
  }
}
