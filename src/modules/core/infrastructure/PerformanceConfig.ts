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

/**
 * Calculate optimal worker pool size based on hardware
 * Uses navigator.hardwareConcurrency with safe defaults
 */
function getOptimalWorkerCount(): number {
  // Default to 4 if hardwareConcurrency not available
  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency
    : 4

  // Reserve 2 cores for main thread and other tasks
  // Minimum 2 workers, maximum 8 (diminishing returns beyond this)
  return Math.min(8, Math.max(2, cores - 2))
}

export class PerformanceConfig {
  // Worker pool settings
  // Smart default: uses navigator.hardwareConcurrency - 2 (reserves cores for main thread)
  workerPoolSize: number = getOptimalWorkerCount()
  frameBudgetMs: number = 3

  // LOD distance thresholds (in chunks)
  // LOD 0 = full detail with AO, LOD 1 = AO enabled but simplified, LOD 2+ = no AO
  lodLevel0Max: number = 5.0
  lodLevel1Max: number = 7.0
  lodLevel2Max: number = 10.0

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
    this.workerPoolSize = getOptimalWorkerCount()
    this.frameBudgetMs = 3
    this.lodLevel0Max = 5.0
    this.lodLevel1Max = 7.0
    this.lodLevel2Max = 10.0
    this.lodTransitionMs = 300
    this.lodCacheSize = 30
    this.lodHysteresis = 0.5
    this.save()
  }

  /**
   * Get the optimal worker count for this hardware (for display in settings)
   */
  static getOptimalWorkerCount(): number {
    return getOptimalWorkerCount()
  }

  /**
   * Get available CPU core count (for display in settings)
   */
  static getHardwareCores(): number {
    return typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4
  }
}
