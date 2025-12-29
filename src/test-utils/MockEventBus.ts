/**
 * MockEventBus - Test utility for mocking the EventBus
 *
 * Captures emitted events for assertion and provides controlled event emission.
 */

type EventHandler = (event: any) => void

export interface CapturedEvent {
  category: string
  event: any
  timestamp: number
}

export class MockEventBus {
  private handlers = new Map<string, Map<string, EventHandler[]>>()
  private capturedEvents: CapturedEvent[] = []
  private tracingEnabled = false

  /**
   * Register an event handler
   */
  on(category: string, eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(category)) {
      this.handlers.set(category, new Map())
    }
    const categoryHandlers = this.handlers.get(category)!
    if (!categoryHandlers.has(eventType)) {
      categoryHandlers.set(eventType, [])
    }
    categoryHandlers.get(eventType)!.push(handler)
  }

  /**
   * Remove an event handler
   */
  off(category: string, eventType: string, handler: EventHandler): void {
    const categoryHandlers = this.handlers.get(category)
    if (!categoryHandlers) return

    const handlers = categoryHandlers.get(eventType)
    if (!handlers) return

    const index = handlers.indexOf(handler)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
  }

  /**
   * Emit an event (captured for testing)
   */
  emit(category: string, event: any): void {
    this.capturedEvents.push({
      category,
      event,
      timestamp: Date.now()
    })

    if (this.tracingEnabled) {
      console.log(`[MockEventBus] ${category}:${event.type}`, event)
    }

    const categoryHandlers = this.handlers.get(category)
    if (!categoryHandlers) return

    const eventType = event.type || event.constructor?.name
    const handlers = categoryHandlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => handler(event))
    }
  }

  // === Test Utilities ===

  /**
   * Get all captured events
   */
  getCapturedEvents(): CapturedEvent[] {
    return [...this.capturedEvents]
  }

  /**
   * Get captured events by category
   */
  getEventsByCategory(category: string): CapturedEvent[] {
    return this.capturedEvents.filter(e => e.category === category)
  }

  /**
   * Get captured events by type
   */
  getEventsByType(eventType: string): CapturedEvent[] {
    return this.capturedEvents.filter(e => e.event.type === eventType)
  }

  /**
   * Check if a specific event was emitted
   */
  wasEmitted(category: string, eventType: string): boolean {
    return this.capturedEvents.some(
      e => e.category === category && e.event.type === eventType
    )
  }

  /**
   * Get the count of emitted events
   */
  getEmitCount(category?: string, eventType?: string): number {
    let events = this.capturedEvents
    if (category) {
      events = events.filter(e => e.category === category)
    }
    if (eventType) {
      events = events.filter(e => e.event.type === eventType)
    }
    return events.length
  }

  /**
   * Clear all captured events
   */
  clearCaptured(): void {
    this.capturedEvents = []
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers.clear()
  }

  /**
   * Reset the mock completely
   */
  reset(): void {
    this.clearCaptured()
    this.clearHandlers()
    this.tracingEnabled = false
  }

  /**
   * Enable tracing (logs events to console)
   */
  enableTracing(): void {
    this.tracingEnabled = true
  }

  /**
   * Disable tracing
   */
  disableTracing(): void {
    this.tracingEnabled = false
  }

  /**
   * Trigger handlers for a specific event type (for testing event subscriptions)
   */
  triggerHandler(category: string, eventType: string, event: any): void {
    const categoryHandlers = this.handlers.get(category)
    if (!categoryHandlers) return

    const handlers = categoryHandlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => handler(event))
    }
  }
}
