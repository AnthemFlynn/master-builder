import { EventBus } from '../../game/infrastructure/EventBus'
import { GameAction } from '../domain/GameAction'
import { KeyBinding } from '../domain/KeyBinding'
import { GameState } from '../domain/InputState'
import { IInputQuery } from '../ports/IInputQuery'

export enum InputType {
  KEYBOARD = 'keyboard',
  GAMEPAD = 'gamepad',
  MOUSE = 'mouse'
}

export enum ActionEventType {
  PRESSED = 'pressed',
  RELEASED = 'released',
  HELD = 'held'
}

export type ActionHandler = (eventType: ActionEventType, event?: Event) => void

interface Subscription {
  actionName: string
  handler: ActionHandler
  context?: GameState[]
  priority?: number
  id: string
}

export class InputService implements IInputQuery {
  private actions: Map<string, GameAction> = new Map()
  private actionBindings: Map<string, KeyBinding[]> = new Map()
  private subscriptions: Map<string, Subscription[]> = new Map()
  private actionStates: Map<string, boolean> = new Map()
  private currentState: GameState = GameState.SPLASH
  private nextSubscriptionId = 0
  private mousePosition: { x: number, y: number } = { x: 0, y: 0 }

  // Throttle mousemove events to prevent CPU overload (16ms = 60fps max)
  private lastMouseMoveEmit = 0
  private readonly MOUSE_MOVE_THROTTLE_MS = 16

  // Store bound handlers for cleanup (prevents memory leaks)
  private boundHandlers: {
    keydown: (e: KeyboardEvent) => void
    keyup: (e: KeyboardEvent) => void
    mousedown: (e: MouseEvent) => void
    mouseup: (e: MouseEvent) => void
    dblclick: (e: MouseEvent) => void
    mousemove: (e: MouseEvent) => void
  }

  constructor(private eventBus: EventBus) {
    // Bind handlers once and store references for cleanup
    this.boundHandlers = {
      keydown: this.handleKeyDown.bind(this),
      keyup: this.handleKeyUp.bind(this),
      mousedown: this.handleMouseDown.bind(this),
      mouseup: this.handleMouseUp.bind(this),
      dblclick: this.handleDoubleClick.bind(this),
      mousemove: this.handleMouseMove.bind(this)
    }
    this.setupEventListeners()
  }

  getMousePosition(): { x: number, y: number } {
    return this.mousePosition
  }

  // Register action
  registerAction(action: GameAction): void {
    this.actions.set(action.id, action)

    // Create binding from defaultKey
    if (action.defaultKey) {
      const binding: KeyBinding = {
        key: action.defaultKey,
        ctrl: action.defaultModifiers?.ctrl ?? false,
        shift: action.defaultModifiers?.shift ?? false,
        alt: action.defaultModifiers?.alt ?? false
      }
      this.actionBindings.set(action.id, [binding])
    }
  }

  addBinding(actionName: string, binding: KeyBinding): void {
    if (!this.actions.has(actionName)) {
      console.warn(`Cannot add binding. Action "${actionName}" not registered.`)
      return
    }

    const bindings = this.actionBindings.get(actionName) ?? []
    if (!bindings.some(existing => this.bindingEquals(existing, binding))) {
      bindings.push(binding)
      this.actionBindings.set(actionName, bindings)
    }
  }

  // Subscribe to action
  onAction(
    actionName: string,
    handler: ActionHandler,
    options: { context?: GameState[], priority?: number } = {}
  ): string {
    const subscription: Subscription = {
      actionName,
      handler,
      context: options.context,
      priority: options.priority ?? 0,
      id: `sub_${this.nextSubscriptionId++}`
    }

    if (!this.subscriptions.has(actionName)) {
      this.subscriptions.set(actionName, [])
    }

    const subs = this.subscriptions.get(actionName)!
    subs.push(subscription)
    subs.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    return subscription.id
  }

  // Update state
  setState(state: GameState): void {
    this.currentState = state
    this.eventBus.emit('input', {
      type: 'InputStateChangedEvent',
      timestamp: Date.now(),
      state
    })
  }

  // Query methods
  isActionPressed(actionName: string): boolean {
    return this.actionStates.get(actionName) ?? false
  }

  getBindings(actionName: string): KeyBinding[] {
    return this.actionBindings.get(actionName) ?? []
  }

  getAllActions(): GameAction[] {
    return Array.from(this.actions.values())
  }

  getCurrentState(): GameState {
    return this.currentState
  }

  // Setup DOM event listeners
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.boundHandlers.keydown, true)
    document.addEventListener('keyup', this.boundHandlers.keyup, true)
    document.addEventListener('mousedown', this.boundHandlers.mousedown, true)
    document.addEventListener('mouseup', this.boundHandlers.mouseup, true)
    document.addEventListener('dblclick', this.boundHandlers.dblclick, true)
    document.addEventListener('mousemove', this.boundHandlers.mousemove, true)
  }

  /**
   * Remove all event listeners. Call this when disposing the service
   * to prevent memory leaks if the service is recreated.
   */
  dispose(): void {
    document.removeEventListener('keydown', this.boundHandlers.keydown, true)
    document.removeEventListener('keyup', this.boundHandlers.keyup, true)
    document.removeEventListener('mousedown', this.boundHandlers.mousedown, true)
    document.removeEventListener('mouseup', this.boundHandlers.mouseup, true)
    document.removeEventListener('dblclick', this.boundHandlers.dblclick, true)
    document.removeEventListener('mousemove', this.boundHandlers.mousemove, true)

    // Clear all subscriptions
    this.subscriptions.clear()
    this.actions.clear()
    this.actionBindings.clear()
    this.actionStates.clear()
  }

  private handleMouseMove(event: MouseEvent): void {
    // Always update position (cheap operation)
    this.mousePosition = { x: event.clientX, y: event.clientY }

    // Throttle event emission to prevent CPU overload
    const now = performance.now()
    if (now - this.lastMouseMoveEmit < this.MOUSE_MOVE_THROTTLE_MS) {
      return // Skip emission, position already updated
    }
    this.lastMouseMoveEmit = now

    // Emit for UI components (Radial Menu) - throttled to 60fps max
    this.eventBus.emit('input', {
      type: 'InputMouseMoveEvent',
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY
    })
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return

    const actionName = this.findActionByKey(event.code)
    
    // DEBUG: Targeted logging for problem keys (disabled for performance)
    // if (['Space', 'Tab', 'KeyB'].includes(event.code)) {
    //     console.log(`[Input] Debug KeyDown: ${event.code} mapped to ${actionName}`)
    // }
    
    if (!actionName) return

    event.preventDefault() // Prevent browser default (e.g., Tab focus)

    this.actionStates.set(actionName, true)
    this.triggerAction(actionName, ActionEventType.PRESSED, event)
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const actionName = this.findActionByKey(event.code)
    if (!actionName) return

    event.preventDefault() // Prevent browser default

    this.actionStates.set(actionName, false)
    this.triggerAction(actionName, ActionEventType.RELEASED, event)
  }

  private handleMouseDown(event: MouseEvent): void {
    // Allow UI interactions
    if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName
        if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(tag)) return
        
        // Also allow interactions inside UI containers
        if (event.target.closest('.creative-modal') || event.target.closest('.menu')) return
    }

    const buttonMap: Record<number, string> = {
      0: 'mouse:left',
      1: 'mouse:middle',
      2: 'mouse:right'
    }

    const actionName = this.findActionByKey(buttonMap[event.button])
    if (actionName) {
        event.preventDefault()
        this.actionStates.set(actionName, true)
        this.triggerAction(actionName, ActionEventType.PRESSED, event)
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    // Allow UI interactions
    if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName
        if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(tag)) return
        if (event.target.closest('.creative-modal') || event.target.closest('.menu')) return
    }

    const buttonMap: Record<number, string> = {
      0: 'mouse:left',
      1: 'mouse:middle',
      2: 'mouse:right'
    }

    const actionName = this.findActionByKey(buttonMap[event.button])
    if (actionName) {
        event.preventDefault()
        this.actionStates.set(actionName, false)
        this.triggerAction(actionName, ActionEventType.RELEASED, event)
    }
  }

  private handleDoubleClick(event: MouseEvent): void {
    // Treat double-click as block placement shortcut (useful when mice lack right button)
    if (event.button !== 0) return
    event.preventDefault()
    if (!this.actions.has('place_block')) return
    this.triggerAction('place_block', ActionEventType.PRESSED, event)
    this.triggerAction('place_block', ActionEventType.RELEASED, event)
  }

  private findActionByKey(key: string): string | null {
    for (const [name, bindings] of this.actionBindings.entries()) {
      if (bindings.some(b => b.key === key)) {
        return name
      }
    }
    return null
  }

  private bindingEquals(a: KeyBinding, b: KeyBinding): boolean {
    return (
      a.key === b.key &&
      !!a.ctrl === !!b.ctrl &&
      !!a.shift === !!b.shift &&
      !!a.alt === !!b.alt
    )
  }

  private triggerAction(actionName: string, eventType: ActionEventType, event?: Event): void {
    const subs = this.subscriptions.get(actionName)
    if (subs && subs.length > 0) {
      // Filter by context
      const validSubs = subs.filter(sub => {
        if (sub.context && !sub.context.includes(this.currentState)) {
          return false
        }
        return true
      })

      // Execute handlers
      for (const sub of validSubs) {
        sub.handler(eventType, event)
      }
    }

    // Emit event to EventBus for other systems (e.g., GameOrchestrator)
    this.eventBus.emit('input', {
      type: 'InputActionEvent',
      timestamp: Date.now(),
      action: actionName,
      eventType
    })
  }
}
