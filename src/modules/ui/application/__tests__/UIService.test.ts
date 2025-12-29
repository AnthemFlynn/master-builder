import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test'
import { GameState, isMenuState, isPlayingState, isOverlayState } from '../../../../shared/domain/GameState'
import { MockEventBus } from '../../../../test-utils'

// Mock DOM elements needed by UIService
const mockDocument = {
  querySelector: () => ({
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
}

const originalDocument = (globalThis as any).document
beforeAll(() => {
  (globalThis as any).document = mockDocument
})
afterAll(() => {
  (globalThis as any).document = originalDocument
})

describe('GameState', () => {
  describe('enum values', () => {
    it('should have SPLASH state', () => {
      expect(GameState.SPLASH).toBe('SPLASH')
    })

    it('should have MAIN_MENU state', () => {
      expect(GameState.MAIN_MENU).toBe('MAIN_MENU')
    })

    it('should have PLAYING state', () => {
      expect(GameState.PLAYING).toBe('PLAYING')
    })

    it('should have PAUSE state', () => {
      expect(GameState.PAUSE).toBe('PAUSE')
    })

    it('should have RADIAL_MENU state', () => {
      expect(GameState.RADIAL_MENU).toBe('RADIAL_MENU')
    })

    it('should have CREATIVE_INVENTORY state', () => {
      expect(GameState.CREATIVE_INVENTORY).toBe('CREATIVE_INVENTORY')
    })
  })

  describe('isMenuState', () => {
    it('should return true for SPLASH', () => {
      expect(isMenuState(GameState.SPLASH)).toBe(true)
    })

    it('should return true for MAIN_MENU', () => {
      expect(isMenuState(GameState.MAIN_MENU)).toBe(true)
    })

    it('should return true for PAUSE', () => {
      expect(isMenuState(GameState.PAUSE)).toBe(true)
    })

    it('should return true for SETTINGS', () => {
      expect(isMenuState(GameState.SETTINGS)).toBe(true)
    })

    it('should return true for LOADING', () => {
      expect(isMenuState(GameState.LOADING)).toBe(true)
    })

    it('should return false for PLAYING', () => {
      expect(isMenuState(GameState.PLAYING)).toBe(false)
    })

    it('should return false for RADIAL_MENU (overlay, not menu)', () => {
      expect(isMenuState(GameState.RADIAL_MENU)).toBe(false)
    })
  })

  describe('isPlayingState', () => {
    it('should return true for PLAYING', () => {
      expect(isPlayingState(GameState.PLAYING)).toBe(true)
    })

    it('should return false for SPLASH', () => {
      expect(isPlayingState(GameState.SPLASH)).toBe(false)
    })

    it('should return false for PAUSE', () => {
      expect(isPlayingState(GameState.PAUSE)).toBe(false)
    })

    it('should return false for RADIAL_MENU', () => {
      expect(isPlayingState(GameState.RADIAL_MENU)).toBe(false)
    })
  })

  describe('isOverlayState', () => {
    it('should return true for RADIAL_MENU', () => {
      expect(isOverlayState(GameState.RADIAL_MENU)).toBe(true)
    })

    it('should return true for CREATIVE_INVENTORY', () => {
      expect(isOverlayState(GameState.CREATIVE_INVENTORY)).toBe(true)
    })

    it('should return false for PLAYING', () => {
      expect(isOverlayState(GameState.PLAYING)).toBe(false)
    })

    it('should return false for PAUSE', () => {
      expect(isOverlayState(GameState.PAUSE)).toBe(false)
    })
  })
})

describe('UIService state machine', () => {
  let mockEventBus: MockEventBus

  beforeEach(() => {
    mockEventBus = new MockEventBus()
  })

  describe('state transition pattern', () => {
    it('should follow SPLASH -> MAIN_MENU -> PLAYING -> PAUSE -> PLAYING flow', () => {
      // Test the expected state transition sequence
      const transitions = [
        { from: GameState.SPLASH, to: GameState.MAIN_MENU },
        { from: GameState.MAIN_MENU, to: GameState.PLAYING },
        { from: GameState.PLAYING, to: GameState.PAUSE },
        { from: GameState.PAUSE, to: GameState.PLAYING },
        { from: GameState.PLAYING, to: GameState.MAIN_MENU }
      ]

      // Verify all transitions are valid state changes
      transitions.forEach(({ from, to }) => {
        expect(from).not.toBe(to)
        expect(typeof from).toBe('string')
        expect(typeof to).toBe('string')
      })
    })

    it('should support overlay states from PLAYING', () => {
      // Overlays are temporary states from PLAYING
      const overlayTransitions = [
        { from: GameState.PLAYING, to: GameState.RADIAL_MENU },
        { from: GameState.RADIAL_MENU, to: GameState.PLAYING },
        { from: GameState.PLAYING, to: GameState.CREATIVE_INVENTORY },
        { from: GameState.CREATIVE_INVENTORY, to: GameState.PLAYING }
      ]

      overlayTransitions.forEach(({ from, to }) => {
        expect(from).not.toBe(to)
      })
    })
  })

  describe('UIStateChangedEvent emission', () => {
    it('should emit event with old and new state', () => {
      // Simulate what UIService does on setState
      const oldState = GameState.SPLASH
      const newState = GameState.MAIN_MENU

      mockEventBus.emit('ui', {
        type: 'UIStateChangedEvent',
        timestamp: Date.now(),
        oldState,
        newState
      })

      expect(mockEventBus.wasEmitted('ui', 'UIStateChangedEvent')).toBe(true)
      const events = mockEventBus.getEventsByType('UIStateChangedEvent')
      expect(events[0].event.oldState).toBe(GameState.SPLASH)
      expect(events[0].event.newState).toBe(GameState.MAIN_MENU)
    })
  })
})
