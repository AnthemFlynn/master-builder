// src/modules/terrain/application/EventBus.ts
import { DomainEvent } from '../domain/events/DomainEvent'

export type EventCategory = 'world' | 'lighting' | 'meshing' | 'rendering' | 'time' | 'player' | 'input' | 'ui' | 'interaction'

type EventHandler = (event: DomainEvent) => void

export class EventBus {
  private listeners = new Map<string, EventHandler[]>()
  private trace: boolean = false

  emit(category: EventCategory, event: DomainEvent): void {
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

  enableTracing(): void {
    this.trace = true
  }

  disableTracing(): void {
    this.trace = false
  }
}
