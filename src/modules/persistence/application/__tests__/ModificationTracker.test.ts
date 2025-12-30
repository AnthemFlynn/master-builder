import { describe, it, expect, beforeEach } from 'bun:test'
import { ModificationTracker } from '../ModificationTracker'
import { MockEventBus } from '../../../../test-utils'

describe('ModificationTracker', () => {
  let tracker: ModificationTracker
  let mockEventBus: MockEventBus

  beforeEach(() => {
    mockEventBus = new MockEventBus()
    tracker = new ModificationTracker(mockEventBus as any)
  })

  describe('trackModification', () => {
    it('should track block placement', () => {
      tracker.trackModification(10, 64, 20, 5) // Place block type 5

      const mods = tracker.getChunkModifications('0,0')
      expect(mods).toBeDefined()
      expect(mods!.get('10,64,20')).toBe(5)
    })

    it('should track block removal as type 0', () => {
      tracker.trackModification(10, 64, 20, 0) // Remove block (air)

      const mods = tracker.getChunkModifications('0,0')
      expect(mods!.get('10,64,20')).toBe(0)
    })

    it('should convert world coords to chunk coords', () => {
      // Block at world (30, 64, 50) is in chunk (1, 2)
      tracker.trackModification(30, 64, 50, 1)

      // Local coords: 30 % 24 = 6, 50 % 24 = 2
      const mods = tracker.getChunkModifications('1,2')
      expect(mods).toBeDefined()
      expect(mods!.get('6,64,2')).toBe(1)
    })

    it('should handle negative coords', () => {
      // Block at world (-10, 64, -10) is in chunk (-1, -1)
      tracker.trackModification(-10, 64, -10, 3)

      const mods = tracker.getChunkModifications('-1,-1')
      expect(mods).toBeDefined()
      // -10 % 24 = -10, but we need positive: ((−10 % 24) + 24) % 24 = 14
      expect(mods!.get('14,64,14')).toBe(3)
    })

    it('should overwrite previous modification at same position', () => {
      tracker.trackModification(10, 64, 20, 5)
      tracker.trackModification(10, 64, 20, 8)

      const mods = tracker.getChunkModifications('0,0')
      expect(mods!.get('10,64,20')).toBe(8)
    })
  })

  describe('getChunkModifications', () => {
    it('should return undefined for chunk with no modifications', () => {
      expect(tracker.getChunkModifications('99,99')).toBeUndefined()
    })

    it('should return modifications map for modified chunk', () => {
      tracker.trackModification(0, 0, 0, 1)
      tracker.trackModification(1, 1, 1, 2)

      const mods = tracker.getChunkModifications('0,0')
      expect(mods).toBeInstanceOf(Map)
      expect(mods!.size).toBe(2)
    })
  })

  describe('getAllModifications', () => {
    it('should return empty object when no modifications', () => {
      expect(tracker.getAllModifications()).toEqual({})
    })

    it('should return all modifications as serializable object', () => {
      tracker.trackModification(0, 0, 0, 1)
      tracker.trackModification(24, 0, 0, 2) // Chunk 1,0

      const all = tracker.getAllModifications()
      expect(all['0,0']).toBeDefined()
      expect(all['1,0']).toBeDefined()
      expect(all['0,0']['0,0,0']).toBe(1)
      expect(all['1,0']['0,0,0']).toBe(2)
    })
  })

  describe('loadModifications', () => {
    it('should load modifications from save data', () => {
      const saveData = {
        '0,0': { '10,64,20': 5, '11,64,21': 6 },
        '1,1': { '5,32,5': 3 }
      }

      tracker.loadModifications(saveData)

      const chunk00 = tracker.getChunkModifications('0,0')
      expect(chunk00!.get('10,64,20')).toBe(5)
      expect(chunk00!.get('11,64,21')).toBe(6)

      const chunk11 = tracker.getChunkModifications('1,1')
      expect(chunk11!.get('5,32,5')).toBe(3)
    })

    it('should clear existing modifications before loading', () => {
      tracker.trackModification(0, 0, 0, 1)

      tracker.loadModifications({
        '5,5': { '0,0,0': 99 }
      })

      expect(tracker.getChunkModifications('0,0')).toBeUndefined()
      expect(tracker.getChunkModifications('5,5')).toBeDefined()
    })
  })

  describe('hasModifications', () => {
    it('should return false when no modifications', () => {
      expect(tracker.hasModifications()).toBe(false)
    })

    it('should return true after modification', () => {
      tracker.trackModification(0, 0, 0, 1)
      expect(tracker.hasModifications()).toBe(true)
    })

    it('should return false after clear', () => {
      tracker.trackModification(0, 0, 0, 1)
      tracker.clear()
      expect(tracker.hasModifications()).toBe(false)
    })
  })

  describe('getModifiedChunkCount', () => {
    it('should return 0 when no modifications', () => {
      expect(tracker.getModifiedChunkCount()).toBe(0)
    })

    it('should count modified chunks', () => {
      tracker.trackModification(0, 0, 0, 1)   // Chunk 0,0
      tracker.trackModification(24, 0, 0, 2)  // Chunk 1,0
      tracker.trackModification(0, 0, 24, 3)  // Chunk 0,1

      expect(tracker.getModifiedChunkCount()).toBe(3)
    })

    it('should not double count same chunk', () => {
      tracker.trackModification(0, 0, 0, 1)
      tracker.trackModification(1, 0, 0, 2)
      tracker.trackModification(2, 0, 0, 3)

      expect(tracker.getModifiedChunkCount()).toBe(1)
    })
  })

  describe('clear', () => {
    it('should clear all modifications', () => {
      tracker.trackModification(0, 0, 0, 1)
      tracker.trackModification(24, 0, 24, 2)

      tracker.clear()

      expect(tracker.hasModifications()).toBe(false)
      expect(tracker.getModifiedChunkCount()).toBe(0)
    })
  })

  describe('event integration', () => {
    it('should track modifications from BlockPlacedEvent', () => {
      // Simulate BlockPlacedEvent
      mockEventBus.triggerHandler('world', 'BlockPlacedEvent', {
        type: 'BlockPlacedEvent',
        timestamp: Date.now(),
        position: { x: 10, y: 64, z: 20 },
        blockType: 7
      })

      const mods = tracker.getChunkModifications('0,0')
      expect(mods!.get('10,64,20')).toBe(7)
    })

    it('should track removals from BlockRemovedEvent', () => {
      mockEventBus.triggerHandler('world', 'BlockRemovedEvent', {
        type: 'BlockRemovedEvent',
        timestamp: Date.now(),
        position: { x: 10, y: 64, z: 20 }
      })

      const mods = tracker.getChunkModifications('0,0')
      expect(mods!.get('10,64,20')).toBe(0)
    })
  })
})
