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

  private load(): void {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data: ConfigData = JSON.parse(stored)
      Object.assign(this, data)
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
