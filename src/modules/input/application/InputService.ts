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

  constructor(private eventBus: EventBus) {
    this.setupEventListeners()
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
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true)
    document.addEventListener('keyup', this.handleKeyUp.bind(this), true)
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), true)
    document.addEventListener('mouseup', this.handleMouseUp.bind(this), true)
    document.addEventListener('dblclick', this.handleDoubleClick.bind(this), true)
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return

    const actionName = this.findActionByKey(event.code)
    if (!actionName) return

    this.actionStates.set(actionName, true)
    this.triggerAction(actionName, ActionEventType.PRESSED, event)
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const actionName = this.findActionByKey(event.code)
    if (!actionName) return

    this.actionStates.set(actionName, false)
    this.triggerAction(actionName, ActionEventType.RELEASED, event)
  }

  private handleMouseDown(event: MouseEvent): void {
    const buttonMap: Record<number, string> = {
      0: 'mouse:left',
      1: 'mouse:middle',
      2: 'mouse:right'
    }

    event.preventDefault()

    const actionName = this.findActionByKey(buttonMap[event.button])
    if (!actionName) return

    this.actionStates.set(actionName, true)
    this.triggerAction(actionName, ActionEventType.PRESSED, event)
  }

  private handleMouseUp(event: MouseEvent): void {
    const buttonMap: Record<number, string> = {
      0: 'mouse:left',
      1: 'mouse:middle',
      2: 'mouse:right'
    }

    event.preventDefault()

    const actionName = this.findActionByKey(buttonMap[event.button])
    if (!actionName) return

    this.actionStates.set(actionName, false)
    this.triggerAction(actionName, ActionEventType.RELEASED, event)
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
