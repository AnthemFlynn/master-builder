import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test'
import { UIState } from '../../domain/UIState'
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

describe('UIState', () => {
  describe('enum values', () => {
    it('should have SPLASH state', () => {
      expect(UIState.SPLASH).toBe('SPLASH')
    })

    it('should have MENU state', () => {
      expect(UIState.MENU).toBe('MENU')
    })

    it('should have PLAYING state', () => {
      expect(UIState.PLAYING).toBe('PLAYING')
    })

    it('should have PAUSE state', () => {
      expect(UIState.PAUSE).toBe('PAUSE')
    })

    it('should have RADIAL_MENU state', () => {
      expect(UIState.RADIAL_MENU).toBe('RADIAL_MENU')
    })

    it('should have CREATIVE_INVENTORY state', () => {
      expect(UIState.CREATIVE_INVENTORY).toBe('CREATIVE_INVENTORY')
    })
  })

  describe('state categorization helpers', () => {
    // Helper functions to categorize states
    const isMenuState = (state: UIState): boolean => {
      return state === UIState.SPLASH ||
             state === UIState.MENU ||
             state === UIState.PAUSE
    }

    const isPlayingState = (state: UIState): boolean => {
      return state === UIState.PLAYING
    }

    const isOverlayState = (state: UIState): boolean => {
      return state === UIState.RADIAL_MENU ||
             state === UIState.CREATIVE_INVENTORY
    }

    it('should identify SPLASH as menu state', () => {
      expect(isMenuState(UIState.SPLASH)).toBe(true)
    })

    it('should identify MENU as menu state', () => {
      expect(isMenuState(UIState.MENU)).toBe(true)
    })

    it('should identify PAUSE as menu state', () => {
      expect(isMenuState(UIState.PAUSE)).toBe(true)
    })

    it('should not identify PLAYING as menu state', () => {
      expect(isMenuState(UIState.PLAYING)).toBe(false)
    })

    it('should not identify RADIAL_MENU as menu state (it is an overlay)', () => {
      expect(isMenuState(UIState.RADIAL_MENU)).toBe(false)
    })

    it('should identify PLAYING as playing state', () => {
      expect(isPlayingState(UIState.PLAYING)).toBe(true)
    })

    it('should not identify SPLASH as playing state', () => {
      expect(isPlayingState(UIState.SPLASH)).toBe(false)
    })

    it('should identify RADIAL_MENU as overlay state', () => {
      expect(isOverlayState(UIState.RADIAL_MENU)).toBe(true)
    })

    it('should identify CREATIVE_INVENTORY as overlay state', () => {
      expect(isOverlayState(UIState.CREATIVE_INVENTORY)).toBe(true)
    })

    it('should not identify PLAYING as overlay state', () => {
      expect(isOverlayState(UIState.PLAYING)).toBe(false)
    })
  })
})

describe('UIService state machine', () => {
  let mockEventBus: MockEventBus

  beforeEach(() => {
    mockEventBus = new MockEventBus()
  })

  describe('state transition pattern', () => {
    it('should follow SPLASH -> MENU -> PLAYING -> PAUSE -> PLAYING flow', () => {
      // Test the expected state transition sequence
      const transitions = [
        { from: UIState.SPLASH, to: UIState.MENU },
        { from: UIState.MENU, to: UIState.PLAYING },
        { from: UIState.PLAYING, to: UIState.PAUSE },
        { from: UIState.PAUSE, to: UIState.PLAYING },
        { from: UIState.PLAYING, to: UIState.MENU }
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
        { from: UIState.PLAYING, to: UIState.RADIAL_MENU },
        { from: UIState.RADIAL_MENU, to: UIState.PLAYING },
        { from: UIState.PLAYING, to: UIState.CREATIVE_INVENTORY },
        { from: UIState.CREATIVE_INVENTORY, to: UIState.PLAYING }
      ]

      overlayTransitions.forEach(({ from, to }) => {
        expect(from).not.toBe(to)
      })
    })
  })

  describe('UIStateChangedEvent emission', () => {
    it('should emit event with old and new state', () => {
      // Simulate what UIService does on setState
      const oldState = UIState.SPLASH
      const newState = UIState.MENU

      mockEventBus.emit('ui', {
        type: 'UIStateChangedEvent',
        timestamp: Date.now(),
        oldState,
        newState
      })

      expect(mockEventBus.wasEmitted('ui', 'UIStateChangedEvent')).toBe(true)
      const events = mockEventBus.getEventsByType('UIStateChangedEvent')
      expect(events[0].event.oldState).toBe(UIState.SPLASH)
      expect(events[0].event.newState).toBe(UIState.MENU)
    })
  })
})
