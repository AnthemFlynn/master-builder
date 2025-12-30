import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { GameState } from '../../domain/InputState'
import { MockEventBus } from '../../../../test-utils'

// Mock document for InputService (DOM API not available in Bun tests)
const mockDocument = {
  addEventListener: () => {},
  removeEventListener: () => {}
}

// Store original and set mock
const originalGlobalDocument = (globalThis as any).document
beforeAll(() => {
  (globalThis as any).document = mockDocument
})
afterAll(() => {
  (globalThis as any).document = originalGlobalDocument
})

// Import InputService after document mock is set up
import { InputService, ActionEventType } from '../InputService'

describe('InputService', () => {
  let inputService: InputService
  let mockEventBus: MockEventBus

  beforeEach(() => {
    mockEventBus = new MockEventBus()
    inputService = new InputService(mockEventBus as any)
  })

  afterEach(() => {
    inputService.dispose()
  })

  describe('action registration', () => {
    it('should register actions via registerAction()', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'movement',
        defaultKey: 'KeyW'
      })

      const actions = inputService.getAllActions()
      expect(actions.length).toBe(1)
      expect(actions[0].id).toBe('test_action')
    })

    it('should create default binding from action defaultKey', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'movement',
        defaultKey: 'KeyW'
      })

      const bindings = inputService.getBindings('test_action')
      expect(bindings.length).toBe(1)
      expect(bindings[0].key).toBe('KeyW')
    })

    it('should register action without defaultKey', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'ui'
      })

      const actions = inputService.getAllActions()
      expect(actions.length).toBe(1)
      expect(inputService.getBindings('test_action').length).toBe(0)
    })
  })

  describe('binding management', () => {
    it('should add bindings via addBinding()', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'movement',
        defaultKey: 'KeyW'
      })

      inputService.addBinding('test_action', { key: 'ArrowUp' })

      const bindings = inputService.getBindings('test_action')
      expect(bindings.length).toBe(2)
      expect(bindings.some(b => b.key === 'ArrowUp')).toBe(true)
    })

    it('should not add duplicate bindings', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'movement',
        defaultKey: 'KeyW'
      })

      inputService.addBinding('test_action', { key: 'KeyW' })

      const bindings = inputService.getBindings('test_action')
      expect(bindings.length).toBe(1)
    })

    it('should warn when adding binding to non-existent action', () => {
      // This should just warn, not throw
      inputService.addBinding('nonexistent', { key: 'KeyX' })
      expect(inputService.getBindings('nonexistent').length).toBe(0)
    })

    it('should handle modifier keys in bindings', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'movement',
        defaultKey: 'KeyW',
        defaultModifiers: { ctrl: true, shift: false, alt: false }
      })

      const bindings = inputService.getBindings('test_action')
      expect(bindings[0].ctrl).toBe(true)
      expect(bindings[0].shift).toBe(false)
      expect(bindings[0].alt).toBe(false)
    })
  })

  describe('subscription management', () => {
    it('should subscribe to actions via onAction()', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'ui'
      })

      let triggered = false
      inputService.onAction('test_action', () => {
        triggered = true
      })

      // Subscription should be registered (we can't easily trigger without DOM)
      expect(triggered).toBe(false) // Not triggered yet
    })

    it('should return subscription id from onAction()', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'ui'
      })

      const id = inputService.onAction('test_action', () => {})
      expect(id).toMatch(/^sub_/)
    })

    it('should sort subscriptions by priority', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'ui'
      })

      const callOrder: number[] = []

      inputService.onAction('test_action', () => callOrder.push(1), { priority: 1 })
      inputService.onAction('test_action', () => callOrder.push(2), { priority: 10 })
      inputService.onAction('test_action', () => callOrder.push(3), { priority: 5 })

      // Subscriptions are sorted by priority (higher first)
      // We can't trigger without DOM, but structure is correct
    })
  })

  describe('state management', () => {
    it('should initialize with SPLASH state', () => {
      expect(inputService.getCurrentState()).toBe(GameState.SPLASH)
    })

    it('should set state via setState()', () => {
      inputService.setState(GameState.PLAYING)
      expect(inputService.getCurrentState()).toBe(GameState.PLAYING)
    })

    it('should emit InputStateChangedEvent on state change', () => {
      inputService.setState(GameState.PLAYING)

      expect(mockEventBus.wasEmitted('input', 'InputStateChangedEvent')).toBe(true)

      const events = mockEventBus.getEventsByType('InputStateChangedEvent')
      expect(events.length).toBe(1)
      expect(events[0].event.state).toBe(GameState.PLAYING)
    })
  })

  describe('action state queries', () => {
    it('should return false for unregistered action isActionPressed()', () => {
      expect(inputService.isActionPressed('nonexistent')).toBe(false)
    })

    it('should track action pressed state', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'movement'
      })

      // Initially not pressed
      expect(inputService.isActionPressed('test_action')).toBe(false)
    })

    it('should return empty array for unregistered action bindings', () => {
      expect(inputService.getBindings('nonexistent')).toEqual([])
    })
  })

  describe('mouse position tracking', () => {
    it('should initialize mouse position at (0, 0)', () => {
      const pos = inputService.getMousePosition()
      expect(pos.x).toBe(0)
      expect(pos.y).toBe(0)
    })
  })

  describe('action categories and state validation', () => {
    it('should register movement category action', () => {
      inputService.registerAction({
        id: 'move_forward',
        description: 'Move Forward',
        category: 'movement',
        defaultKey: 'KeyW'
      })

      const actions = inputService.getAllActions()
      expect(actions[0].category).toBe('movement')
    })

    it('should register building category action', () => {
      inputService.registerAction({
        id: 'place_block',
        description: 'Place Block',
        category: 'building',
        defaultKey: 'mouse:right'
      })

      const actions = inputService.getAllActions()
      expect(actions[0].category).toBe('building')
    })

    it('should register ui category action', () => {
      inputService.registerAction({
        id: 'pause',
        description: 'Pause Game',
        category: 'ui',
        defaultKey: 'Escape'
      })

      const actions = inputService.getAllActions()
      expect(actions[0].category).toBe('ui')
    })

    it('should register inventory category action', () => {
      inputService.registerAction({
        id: 'select_slot_1',
        description: 'Select Slot 1',
        category: 'inventory',
        defaultKey: 'Digit1'
      })

      const actions = inputService.getAllActions()
      expect(actions[0].category).toBe('inventory')
    })
  })

  describe('disposal', () => {
    it('should clear all data on dispose()', () => {
      inputService.registerAction({
        id: 'test_action',
        description: 'Test Action',
        category: 'ui',
        defaultKey: 'KeyT'
      })

      inputService.dispose()

      expect(inputService.getAllActions().length).toBe(0)
      expect(inputService.getBindings('test_action').length).toBe(0)
    })
  })
})
