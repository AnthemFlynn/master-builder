// src/modules/terrain/application/EventBus.ts
import { DomainEvent } from '../domain/events/DomainEvent'

export type EventCategory = 'world' | 'lighting' | 'meshing' | 'rendering' | 'time' | 'player' | 'input' | 'ui' | 'interaction' | 'persistence'

type EventHandler = (event: DomainEvent) => void

export class EventBus {
  private listeners = new Map<string, EventHandler[]>()
  private trace: boolean = false

  // Cascade protection: track current emit depth to prevent infinite loops
  private emitDepth = 0
  private readonly MAX_EMIT_DEPTH = 10

  emit(category: EventCategory, event: DomainEvent): void {
    // Cascade protection: prevent infinite event loops
    if (this.emitDepth >= this.MAX_EMIT_DEPTH) {
      console.error(`[EventBus] Max emit depth (${this.MAX_EMIT_DEPTH}) exceeded. Possible event cascade detected for ${category}:${event.type}`)
      return
    }

    this.emitDepth++

    try {
      if (this.trace) {
        console.log(`📢 [${category}] ${event.type}`, event)
      }

      const key = `${category}:${event.type}`
      const handlers = this.listeners.get(key) || []

      for (const handler of handlers) {
        try {
          handler(event)
        } catch (error) {
          console.error(`[EventBus] Error in handler for ${key}:`, error)
          // Continue to next handler instead of stopping
        }
      }
    } finally {
      this.emitDepth--
    }
  }

  on(
    category: EventCategory,
    eventType: string,
    handler: EventHandler
  ): void {
    const key = `${category}:${eventType}`
    const handlers = this.listeners.get(key) || []
    handlers.push(handler)
    this.listeners.set(key, handlers)
  }

  /**
   * Remove an event handler. Returns true if handler was found and removed.
   */
  off(
    category: EventCategory,
    eventType: string,
    handler: EventHandler
  ): boolean {
    const key = `${category}:${eventType}`
    const handlers = this.listeners.get(key)
    if (!handlers) return false

    const index = handlers.indexOf(handler)
    if (index === -1) return false

    handlers.splice(index, 1)
    return true
  }

  /**
   * Remove all handlers for a specific event type.
   */
  offAll(category: EventCategory, eventType: string): void {
    const key = `${category}:${eventType}`
    this.listeners.delete(key)
  }

  enableTracing(): void {
    this.trace = true
  }

  disableTracing(): void {
    this.trace = false
  }
}
