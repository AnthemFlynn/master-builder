// src/modules/game/infrastructure/__tests__/PerformanceConfig.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { PerformanceConfig } from '../PerformanceConfig'

// Mock localStorage for Node.js test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    clear: () => { store = {} },
    removeItem: (key: string) => { delete store[key] }
  }
})()

global.localStorage = localStorageMock as any

describe('PerformanceConfig', () => {
  let config: PerformanceConfig

  beforeEach(() => {
    localStorage.clear()
    config = new PerformanceConfig()
  })

  it('should initialize with default values', () => {
    expect(config.workerPoolSize).toBe(6)
    expect(config.frameBudgetMs).toBe(3)
    expect(config.lodLevel0Max).toBe(2.0)
    expect(config.lodLevel1Max).toBe(4.0)
    expect(config.lodLevel2Max).toBe(6.0)
    expect(config.lodTransitionMs).toBe(300)
    expect(config.lodCacheSize).toBe(30)
    expect(config.lodHysteresis).toBe(0.5)
  })

  it('should save to localStorage when values change', () => {
    config.workerPoolSize = 8
    config.save()

    const saved = localStorage.getItem('performance-config')
    expect(saved).toBeDefined()
    expect(JSON.parse(saved!).workerPoolSize).toBe(8)
  })

  it('should load from localStorage on init', () => {
    localStorage.setItem('performance-config', JSON.stringify({
      workerPoolSize: 4,
      lodLevel0Max: 3.0
    }))

    const newConfig = new PerformanceConfig()
    expect(newConfig.workerPoolSize).toBe(4)
    expect(newConfig.lodLevel0Max).toBe(3.0)
  })

  it('should reset to defaults', () => {
    config.workerPoolSize = 8
    config.save()

    config.resetToDefaults()
    expect(config.workerPoolSize).toBe(6)
  })
})
