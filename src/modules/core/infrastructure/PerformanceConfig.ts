// src/modules/game/infrastructure/PerformanceConfig.ts
const STORAGE_KEY = 'performance-config'

interface ConfigData {
  workerPoolSize?: number
  frameBudgetMs?: number
  lodLevel0Max?: number
  lodLevel1Max?: number
  lodLevel2Max?: number
  lodTransitionMs?: number
  lodCacheSize?: number
  lodHysteresis?: number
}

export class PerformanceConfig {
  // Worker pool settings
  workerPoolSize: number = 6
  frameBudgetMs: number = 3

  // LOD distance thresholds (in chunks)
  lodLevel0Max: number = 2.0
  lodLevel1Max: number = 4.0
  lodLevel2Max: number = 6.0

  // LOD transition settings
  lodTransitionMs: number = 300
  lodCacheSize: number = 30
  lodHysteresis: number = 0.5

  constructor() {
    this.load()
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  private load(): void {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return

    try {
      const data: ConfigData = JSON.parse(stored)

      // Validate and clamp each property
      if (data.workerPoolSize !== undefined) {
        this.workerPoolSize = this.clamp(data.workerPoolSize, 2, 12)
      }
      if (data.frameBudgetMs !== undefined) {
        this.frameBudgetMs = this.clamp(data.frameBudgetMs, 2, 5)
      }
      if (data.lodLevel0Max !== undefined) {
        this.lodLevel0Max = this.clamp(data.lodLevel0Max, 1.0, 10.0)
      }
      if (data.lodLevel1Max !== undefined) {
        this.lodLevel1Max = this.clamp(data.lodLevel1Max, 2.0, 10.0)
      }
      if (data.lodLevel2Max !== undefined) {
        this.lodLevel2Max = this.clamp(data.lodLevel2Max, 3.0, 10.0)
      }
      if (data.lodTransitionMs !== undefined) {
        this.lodTransitionMs = this.clamp(data.lodTransitionMs, 150, 500)
      }
      if (data.lodCacheSize !== undefined) {
        this.lodCacheSize = this.clamp(data.lodCacheSize, 10, 50)
      }
      if (data.lodHysteresis !== undefined) {
        this.lodHysteresis = this.clamp(data.lodHysteresis, 0.3, 0.8)
      }
    } catch (error) {
      // If JSON.parse fails or data is corrupt, keep defaults
      console.warn('Failed to load performance config from localStorage:', error)
    }
  }

  save(): void {
    const data: ConfigData = {
      workerPoolSize: this.workerPoolSize,
      frameBudgetMs: this.frameBudgetMs,
      lodLevel0Max: this.lodLevel0Max,
      lodLevel1Max: this.lodLevel1Max,
      lodLevel2Max: this.lodLevel2Max,
      lodTransitionMs: this.lodTransitionMs,
      lodCacheSize: this.lodCacheSize,
      lodHysteresis: this.lodHysteresis
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  resetToDefaults(): void {
    this.workerPoolSize = 6
    this.frameBudgetMs = 3
    this.lodLevel0Max = 2.0
    this.lodLevel1Max = 4.0
    this.lodLevel2Max = 6.0
    this.lodTransitionMs = 300
    this.lodCacheSize = 30
    this.lodHysteresis = 0.5
    this.save()
  }
}
