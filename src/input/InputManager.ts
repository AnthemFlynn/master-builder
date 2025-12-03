import { Mode } from '../player'

/**
 * Game states for context-aware input handling
 */
export enum GameState {
  SPLASH = 'splash',
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSE = 'pause'
}

/**
 * Input types supported by the system
 */
export enum InputType {
  KEYBOARD = 'keyboard',
  GAMEPAD = 'gamepad',
  MOUSE = 'mouse'
}

/**
 * Represents a single key/button binding
 */
export interface Binding {
  type: InputType
  key: string // e.g., 'KeyW', 'Space', 'gamepad:button_0', 'mouse:left'
  modifiers?: {
    shift?: boolean
    ctrl?: boolean
    alt?: boolean
    meta?: boolean
  }
}

/**
 * Action configuration
 */
export interface Action {
  name: string
  description: string
  category: string // 'movement', 'flying', 'building', 'ui', etc.
  bindings: Binding[]
}

/**
 * Subscription options for action handlers
 */
export interface SubscriptionOptions {
  context?: GameState[] // Only fire in these states
  requiresMode?: Mode // Only fire in this player mode
  priority?: number // Higher = runs first (default: 0)
  preventDefault?: boolean // Prevent other handlers from running
}

/**
 * Action event types
 */
export enum ActionEventType {
  PRESSED = 'pressed',   // Key just pressed this frame
  RELEASED = 'released', // Key just released this frame
  HELD = 'held'          // Key is currently held down
}

/**
 * Action handler function signature
 */
export type ActionHandler = (eventType: ActionEventType, event?: Event) => void

/**
 * Subscription record
 */
interface Subscription {
  actionName: string
  handler: ActionHandler
  options: SubscriptionOptions
  id: string
}

/**
 * InputManager - Centralized input handling with Event Bus pattern
 *
 * Features:
 * - Action-based bindings (keyboard, gamepad, mouse)
 * - Context-aware filtering (game state, player mode)
 * - Priority system for conflict resolution
 * - Conflict detection and warnings
 * - Persistent storage (localStorage)
 * - Rebindable controls
 */
export default class InputManager {
  private actions: Map<string, Action> = new Map()
  private defaultActions: Map<string, Action> = new Map() // Store pristine defaults
  private subscriptions: Map<string, Subscription[]> = new Map()
  private actionStates: Map<string, boolean> = new Map() // Track which actions are currently held
  private currentState: GameState = GameState.SPLASH
  private currentMode: Mode = Mode.walking
  private nextSubscriptionId = 0
  private gamepadIndex: number | null = null
  private gamepadConnected = false

  constructor() {
    this.setupEventListeners()
    this.detectGamepad()
  }

  /**
   * Register an action with its default bindings
   */
  registerAction(action: Action): void {
    if (this.actions.has(action.name)) {
      console.warn(`⚠️ Action '${action.name}' is already registered. Overwriting.`)
    }
    this.actions.set(action.name, action)
  }

  /**
   * Register multiple actions at once
   */
  registerActions(actions: Action[]): void {
    actions.forEach(action => {
      // Store pristine copy of defaults (deep copy)
      const defaultCopy: Action = {
        name: action.name,
        description: action.description,
        category: action.category,
        bindings: action.bindings.map(b => ({
          type: b.type,
          key: b.key,
          modifiers: b.modifiers ? { ...b.modifiers } : undefined
        }))
      }
      this.defaultActions.set(action.name, defaultCopy)

      // Register the action normally
      this.registerAction(action)
    })
  }

  /**
   * Subscribe to an action
   */
  onAction(
    actionName: string,
    handler: ActionHandler,
    options: SubscriptionOptions = {}
  ): string {
    const subscription: Subscription = {
      actionName,
      handler,
      options: {
        context: options.context,
        requiresMode: options.requiresMode,
        priority: options.priority ?? 0,
        preventDefault: options.preventDefault ?? false
      },
      id: `sub_${this.nextSubscriptionId++}`
    }

    if (!this.subscriptions.has(actionName)) {
      this.subscriptions.set(actionName, [])
    }

    const subs = this.subscriptions.get(actionName)!
    subs.push(subscription)

    // Sort by priority (highest first)
    subs.sort((a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0))

    return subscription.id
  }

  /**
   * Unsubscribe from an action
   */
  offAction(subscriptionId: string): void {
    for (const [actionName, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(s => s.id === subscriptionId)
      if (index !== -1) {
        subs.splice(index, 1)
        if (subs.length === 0) {
          this.subscriptions.delete(actionName)
        }
        return
      }
    }
  }

  /**
   * Update current game state
   */
  setState(state: GameState): void {
    this.currentState = state
    console.log(`🎮 Input state: ${state}`)
  }

  /**
   * Update current player mode
   */
  setMode(mode: Mode): void {
    this.currentMode = mode
    console.log(`🎮 Input mode: ${Mode[mode]}`)
  }

  /**
   * Check if an action is currently pressed/held
   */
  isActionPressed(actionName: string): boolean {
    return this.actionStates.get(actionName) ?? false
  }

  /**
   * Bind a key/button to an action
   */
  bindAction(actionName: string, binding: Binding): void {
    const action = this.actions.get(actionName)
    if (!action) {
      console.error(`❌ Action '${actionName}' not found`)
      return
    }

    // Check for conflicts
    const conflict = this.findConflict(binding)
    if (conflict) {
      console.warn(
        `⚠️ Binding conflict: ${binding.key} is already bound to '${conflict.name}'`
      )
    }

    // Add binding
    action.bindings.push(binding)
  }

  /**
   * Unbind a key/button from an action
   */
  unbindAction(actionName: string, binding: Binding): void {
    const action = this.actions.get(actionName)
    if (!action) return

    const index = action.bindings.findIndex(
      b => b.type === binding.type && b.key === binding.key
    )
    if (index !== -1) {
      action.bindings.splice(index, 1)
    }
  }

  /**
   * Get all bindings for an action
   */
  getBindings(actionName: string): Binding[] {
    const action = this.actions.get(actionName)
    return action ? action.bindings : []
  }

  /**
   * Get all registered actions
   */
  getAllActions(): Action[] {
    return Array.from(this.actions.values())
  }

  /**
   * Find if a binding conflicts with existing bindings
   */
  private findConflict(binding: Binding): Action | null {
    for (const action of this.actions.values()) {
      const hasConflict = action.bindings.some(
        b =>
          b.type === binding.type &&
          b.key === binding.key &&
          this.modifiersMatch(b.modifiers, binding.modifiers)
      )
      if (hasConflict) return action
    }
    return null
  }

  /**
   * Check if modifier keys match
   * Treats undefined modifiers as all false (no modifiers pressed)
   */
  private modifiersMatch(
    a?: Binding['modifiers'],
    b?: Binding['modifiers']
  ): boolean {
    // Normalize undefined to all false
    const normalizeA = a || { shift: false, ctrl: false, alt: false, meta: false }
    const normalizeB = b || { shift: false, ctrl: false, alt: false, meta: false }

    return (
      (normalizeA.shift ?? false) === (normalizeB.shift ?? false) &&
      (normalizeA.ctrl ?? false) === (normalizeB.ctrl ?? false) &&
      (normalizeA.alt ?? false) === (normalizeB.alt ?? false) &&
      (normalizeA.meta ?? false) === (normalizeB.meta ?? false)
    )
  }

  /**
   * Setup DOM event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true)
    document.addEventListener('keyup', this.handleKeyUp.bind(this), true)

    // Mouse events
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), true)
    document.addEventListener('mouseup', this.handleMouseUp.bind(this), true)

    // Gamepad connection events
    window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this))
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this))
  }

  /**
   * Handle keyboard down events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Ignore repeat events
    if (event.repeat) return

    const binding: Binding = {
      type: InputType.KEYBOARD,
      key: event.code,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
      }
    }

    this.triggerAction(binding, ActionEventType.PRESSED, event)
  }

  /**
   * Handle keyboard up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const binding: Binding = {
      type: InputType.KEYBOARD,
      key: event.code,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
      }
    }

    this.triggerAction(binding, ActionEventType.RELEASED, event)
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    const buttonMap: Record<number, string> = {
      0: 'mouse:left',
      1: 'mouse:middle',
      2: 'mouse:right'
    }

    const binding: Binding = {
      type: InputType.MOUSE,
      key: buttonMap[event.button] || `mouse:${event.button}`,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
      }
    }

    this.triggerAction(binding, ActionEventType.PRESSED, event)
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    const buttonMap: Record<number, string> = {
      0: 'mouse:left',
      1: 'mouse:middle',
      2: 'mouse:right'
    }

    const binding: Binding = {
      type: InputType.MOUSE,
      key: buttonMap[event.button] || `mouse:${event.button}`,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
      }
    }

    this.triggerAction(binding, ActionEventType.RELEASED, event)
  }

  /**
   * Handle gamepad connected
   */
  private handleGamepadConnected(event: GamepadEvent): void {
    console.log(`🎮 Gamepad connected: ${event.gamepad.id}`)
    this.gamepadIndex = event.gamepad.index
    this.gamepadConnected = true
  }

  /**
   * Handle gamepad disconnected
   */
  private handleGamepadDisconnected(event: GamepadEvent): void {
    console.log(`🎮 Gamepad disconnected: ${event.gamepad.id}`)
    if (event.gamepad.index === this.gamepadIndex) {
      this.gamepadIndex = null
      this.gamepadConnected = false
    }
  }

  /**
   * Detect gamepad (needed for some browsers)
   */
  private detectGamepad(): void {
    // Poll for gamepads periodically
    setInterval(() => {
      if (!this.gamepadConnected) {
        const gamepads = navigator.getGamepads()
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            this.gamepadIndex = i
            this.gamepadConnected = true
            console.log(`🎮 Gamepad detected: ${gamepads[i]?.id}`)
            break
          }
        }
      }
    }, 1000)
  }

  /**
   * Check if gamepad is connected
   */
  isGamepadConnected(): boolean {
    return this.gamepadConnected
  }

  /**
   * Trigger action based on binding
   */
  private triggerAction(binding: Binding, eventType: ActionEventType, event?: Event): void {
    // Find matching action
    const action = this.findActionByBinding(binding)
    if (!action) return

    // Update action state
    if (eventType === ActionEventType.PRESSED) {
      this.actionStates.set(action.name, true)
    } else if (eventType === ActionEventType.RELEASED) {
      this.actionStates.set(action.name, false)
    }

    // Get subscriptions for this action
    const subs = this.subscriptions.get(action.name)
    if (!subs || subs.length === 0) return

    // Filter subscriptions by context and mode
    const validSubs = subs.filter(sub => {
      // Check context (game state)
      if (sub.options.context && !sub.options.context.includes(this.currentState)) {
        return false
      }

      // Check mode requirement
      if (sub.options.requiresMode !== undefined && sub.options.requiresMode !== this.currentMode) {
        return false
      }

      return true
    })

    if (validSubs.length === 0) return

    // Execute handlers (already sorted by priority)
    for (const sub of validSubs) {
      sub.handler(eventType, event)

      // Stop if preventDefault is set
      if (sub.options.preventDefault) {
        event?.preventDefault()
        event?.stopPropagation()
        break
      }
    }
  }

  /**
   * Find action that has a matching binding
   */
  private findActionByBinding(binding: Binding): Action | null {
    for (const action of this.actions.values()) {
      const hasMatch = action.bindings.some(
        b =>
          b.type === binding.type &&
          b.key === binding.key &&
          this.modifiersMatch(b.modifiers, binding.modifiers)
      )
      if (hasMatch) return action
    }
    return null
  }

  /**
   * Save bindings to localStorage
   */
  saveBindings(): void {
    const data: Record<string, Binding[]> = {}
    for (const [name, action] of this.actions.entries()) {
      data[name] = action.bindings
    }
    localStorage.setItem('customKeybindings', JSON.stringify(data))
    console.log('💾 Keybindings saved')
  }

  /**
   * Load bindings from localStorage
   */
  loadBindings(): void {
    const data = localStorage.getItem('customKeybindings')
    if (!data) return

    try {
      const bindings: Record<string, Binding[]> = JSON.parse(data)
      for (const [name, actionBindings] of Object.entries(bindings)) {
        const action = this.actions.get(name)
        if (action) {
          action.bindings = actionBindings
        }
      }
      console.log('📂 Keybindings loaded')
    } catch (e) {
      console.error('❌ Failed to load keybindings:', e)
    }
  }

  /**
   * Reset bindings to defaults
   */
  resetBindings(defaultActions?: Action[]): void {
    // Use stored pristine defaults
    for (const [name, defaultAction] of this.defaultActions.entries()) {
      const action = this.actions.get(name)
      if (action) {
        // Deep copy from pristine defaults
        action.bindings = defaultAction.bindings.map(b => ({
          type: b.type,
          key: b.key,
          modifiers: b.modifiers ? { ...b.modifiers } : undefined
        }))
      }
    }
    localStorage.removeItem('customKeybindings')
    console.log('🔄 Keybindings reset to defaults')
  }

  /**
   * Export bindings as JSON
   */
  exportBindings(): string {
    const data: Record<string, Binding[]> = {}
    for (const [name, action] of this.actions.entries()) {
      data[name] = action.bindings
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * Import bindings from JSON
   */
  importBindings(json: string): void {
    try {
      const bindings: Record<string, Binding[]> = JSON.parse(json)
      for (const [name, actionBindings] of Object.entries(bindings)) {
        const action = this.actions.get(name)
        if (action) {
          action.bindings = actionBindings
        }
      }
      this.saveBindings()
      console.log('📥 Keybindings imported')
    } catch (e) {
      console.error('❌ Failed to import keybindings:', e)
    }
  }
}
