import { describe, it, expect, beforeEach } from 'bun:test'
import { EventBus, EventCategory } from '../EventBus'
import { DomainEvent } from '../../domain/DomainEvent'

// Test event type
interface TestEvent extends DomainEvent {
  data: string
}

const createTestEvent = (data: string = 'test'): TestEvent => ({
  type: 'TestEvent',
  timestamp: Date.now(),
  data
})

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  describe('on/emit', () => {
    it('should register and call event handlers', () => {
      let called = false
      let receivedEvent: DomainEvent | null = null

      eventBus.on('world', 'TestEvent', (event) => {
        called = true
        receivedEvent = event
      })

      const testEvent = createTestEvent('hello')
      eventBus.emit('world', testEvent)

      expect(called).toBe(true)
      expect(receivedEvent).toBe(testEvent)
    })

    it('should call multiple handlers for same event type', () => {
      const calls: string[] = []

      eventBus.on('world', 'TestEvent', () => calls.push('handler1'))
      eventBus.on('world', 'TestEvent', () => calls.push('handler2'))
      eventBus.on('world', 'TestEvent', () => calls.push('handler3'))

      eventBus.emit('world', createTestEvent())

      expect(calls).toEqual(['handler1', 'handler2', 'handler3'])
    })

    it('should not call handlers for different event types', () => {
      let called = false

      eventBus.on('world', 'DifferentEvent', () => {
        called = true
      })

      eventBus.emit('world', createTestEvent())

      expect(called).toBe(false)
    })

    it('should not call handlers for different categories', () => {
      let called = false

      eventBus.on('player', 'TestEvent', () => {
        called = true
      })

      eventBus.emit('world', createTestEvent())

      expect(called).toBe(false)
    })
  })

  describe('off', () => {
    it('should remove specific handler', () => {
      const calls: string[] = []
      const handler1 = () => calls.push('handler1')
      const handler2 = () => calls.push('handler2')

      eventBus.on('world', 'TestEvent', handler1)
      eventBus.on('world', 'TestEvent', handler2)

      const removed = eventBus.off('world', 'TestEvent', handler1)
      expect(removed).toBe(true)

      eventBus.emit('world', createTestEvent())

      expect(calls).toEqual(['handler2'])
    })

    it('should return false when handler not found', () => {
      const handler = () => {}
      const removed = eventBus.off('world', 'TestEvent', handler)
      expect(removed).toBe(false)
    })

    it('should return false when event type has no handlers', () => {
      const handler = () => {}
      eventBus.on('world', 'OtherEvent', handler)

      const removed = eventBus.off('world', 'TestEvent', handler)
      expect(removed).toBe(false)
    })
  })

  describe('offAll', () => {
    it('should remove all handlers for event type', () => {
      let callCount = 0

      eventBus.on('world', 'TestEvent', () => callCount++)
      eventBus.on('world', 'TestEvent', () => callCount++)
      eventBus.on('world', 'TestEvent', () => callCount++)

      eventBus.offAll('world', 'TestEvent')
      eventBus.emit('world', createTestEvent())

      expect(callCount).toBe(0)
    })

    it('should not affect other event types', () => {
      let testCalls = 0
      let otherCalls = 0

      eventBus.on('world', 'TestEvent', () => testCalls++)
      eventBus.on('world', 'OtherEvent', () => otherCalls++)

      eventBus.offAll('world', 'TestEvent')

      eventBus.emit('world', createTestEvent())
      eventBus.emit('world', { type: 'OtherEvent', timestamp: Date.now() })

      expect(testCalls).toBe(0)
      expect(otherCalls).toBe(1)
    })
  })

  describe('error handling', () => {
    it('should continue calling handlers after one throws', () => {
      const calls: string[] = []

      eventBus.on('world', 'TestEvent', () => calls.push('before'))
      eventBus.on('world', 'TestEvent', () => {
        throw new Error('Handler error')
      })
      eventBus.on('world', 'TestEvent', () => calls.push('after'))

      // Should not throw
      eventBus.emit('world', createTestEvent())

      expect(calls).toEqual(['before', 'after'])
    })
  })

  describe('cascade protection', () => {
    it('should prevent infinite event loops', () => {
      let depth = 0

      eventBus.on('world', 'TestEvent', () => {
        depth++
        // Trigger same event recursively
        eventBus.emit('world', createTestEvent())
      })

      eventBus.emit('world', createTestEvent())

      // Should stop at MAX_EMIT_DEPTH (10)
      expect(depth).toBeLessThanOrEqual(10)
    })
  })

  describe('event categories', () => {
    it('should support all defined event categories', () => {
      const categories: EventCategory[] = [
        'world', 'lighting', 'meshing', 'rendering', 'time',
        'player', 'input', 'ui', 'interaction', 'persistence', 'session'
      ]

      const calls: EventCategory[] = []

      for (const category of categories) {
        eventBus.on(category, 'TestEvent', () => calls.push(category))
        eventBus.emit(category, createTestEvent())
      }

      expect(calls).toEqual(categories)
    })
  })

  describe('tracing', () => {
    it('should enable and disable tracing', () => {
      eventBus.enableTracing()
      // Just verify no error - actual console output not tested
      eventBus.emit('world', createTestEvent())

      eventBus.disableTracing()
      eventBus.emit('world', createTestEvent())
    })
  })
})
