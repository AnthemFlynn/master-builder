import InputManager, { Action, Binding, InputType } from '../../input/InputManager'
import { CATEGORY_DISPLAY, getKeyDisplayName } from '../../input/defaultBindings'

/**
 * ControlsUI - Manages the visual representation and editing of keybindings
 *
 * Features:
 * - Displays all actions organized by category
 * - Keyboard / Gamepad columns
 * - Click to rebind
 * - Conflict detection and warnings
 * - Reset, Import, Export functionality
 */
export default class ControlsUI {
  private inputManager: InputManager
  private container: HTMLElement
  private rebindingAction: string | null = null
  private rebindingType: InputType | null = null
  private rebindingElement: HTMLElement | null = null

  constructor(inputManager: InputManager) {
    this.inputManager = inputManager

    // Get container
    const container = document.querySelector('#controls-container')
    if (!container) {
      console.error('❌ Controls container not found')
      return
    }
    this.container = container as HTMLElement

    // Setup keyboard capture for rebinding
    this.setupRebindingCapture()

    // Setup buttons
    this.setupButtons()

    // Initial render
    this.render()
  }

  /**
   * Setup keyboard capture for rebinding
   */
  private setupRebindingCapture(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Only capture if we're rebinding
      if (!this.isRebinding()) return

      // Prevent default behavior
      e.preventDefault()
      e.stopPropagation()

      // Escape cancels rebinding
      if (e.code === 'Escape') {
        this.cancelRebinding()
        return
      }

      // Create binding from keypress
      const binding: Binding = {
        type: InputType.KEYBOARD,
        key: e.code,
        modifiers: {
          shift: e.shiftKey,
          ctrl: e.ctrlKey,
          alt: e.altKey,
          meta: e.metaKey
        }
      }

      // Handle the binding
      this.handleBinding(binding)
    }, true) // Use capture phase to intercept before other handlers
  }

  /**
   * Render the controls UI
   */
  render(): void {
    this.container.innerHTML = ''

    // Get all actions organized by category
    const actions = this.inputManager.getAllActions()
    console.log(`📊 Rendering ${actions.length} actions`)

    // Debug: Check move_forward binding
    const moveForward = actions.find(a => a.name === 'move_forward')
    if (moveForward) {
      const kb = moveForward.bindings.find(b => b.type === InputType.KEYBOARD)
      console.log(`   move_forward keyboard binding: ${kb?.key}`)
    }

    const categorized = this.categorizeActions(actions)

    // Sort categories by display order
    const sortedCategories = Object.entries(categorized).sort((a, b) => {
      const orderA = CATEGORY_DISPLAY[a[0]]?.order ?? 999
      const orderB = CATEGORY_DISPLAY[b[0]]?.order ?? 999
      return orderA - orderB
    })

    // Render each category (limit to important ones to fit in modal)
    for (const [categoryKey, categoryActions] of sortedCategories) {
      // Skip debug category
      if (categoryKey === 'debug') continue

      const categoryInfo = CATEGORY_DISPLAY[categoryKey]
      if (!categoryInfo) continue

      const categoryDiv = document.createElement('div')
      categoryDiv.style.cssText = 'margin-bottom: 15px;'

      // Category title
      const title = document.createElement('div')
      title.style.cssText = 'font-size: 11px; font-weight: bold; color: #17cd07; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #545655;'
      title.textContent = categoryInfo.name
      categoryDiv.appendChild(title)

      // Grid for this category
      const grid = document.createElement('div')
      grid.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr; gap: 4px; font-size: 10px;'

      // Action rows (limit some categories to prevent overflow)
      const maxActions = categoryKey === 'inventory' ? 3 : 100 // Limit inventory to first 3
      for (const action of categoryActions.slice(0, maxActions)) {
        const row = this.createSimpleActionRow(action)
        grid.appendChild(row)
      }

      categoryDiv.appendChild(grid)
      this.container.appendChild(categoryDiv)
    }
  }

  /**
   * Create a simple action row (just keyboard binding, clickable)
   */
  private createSimpleActionRow(action: Action): HTMLElement {
    const row = document.createElement('div')
    row.style.cssText = 'display: contents;'

    // Action label
    const label = document.createElement('div')
    label.style.cssText = 'color: white; padding: 2px 0;'
    label.textContent = action.description
    row.appendChild(label)

    // Keyboard binding button
    const keyboardBinding = action.bindings.find(b => b.type === InputType.KEYBOARD)
    const kbButton = document.createElement('div')
    kbButton.style.cssText = 'background-color: #545655; border: 1px solid #3a3a3a; border-radius: 2px; padding: 3px 8px; text-align: center; color: #d4d4d4; font-family: monospace; cursor: pointer; transition: all 0.15s;'

    if (keyboardBinding) {
      kbButton.textContent = this.formatBinding(keyboardBinding)
    } else {
      kbButton.textContent = '---'
    }

    // Hover effect
    kbButton.addEventListener('mouseenter', () => {
      kbButton.style.backgroundColor = '#6a6a6a'
      kbButton.style.borderColor = '#17cd07'
    })
    kbButton.addEventListener('mouseleave', () => {
      if (!kbButton.classList.contains('rebinding')) {
        kbButton.style.backgroundColor = '#545655'
        kbButton.style.borderColor = '#3a3a3a'
      }
    })

    // Click to rebind
    kbButton.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      console.log(`🖱️ Clicked binding for '${action.name}'`)
      this.startRebinding(action.name, InputType.KEYBOARD, kbButton)
    })

    row.appendChild(kbButton)

    return row
  }

  /**
   * Create a row for an action
   */
  private createActionRow(action: Action): HTMLElement {
    const row = document.createElement('div')
    row.className = 'controls-row'

    // Action label
    const label = document.createElement('div')
    label.className = 'control-label'
    label.textContent = action.description
    row.appendChild(label)

    // Keyboard binding
    const keyboardBinding = action.bindings.find(b => b.type === InputType.KEYBOARD)
    const kbButton = this.createBindingButton(
      action,
      keyboardBinding,
      InputType.KEYBOARD
    )
    row.appendChild(kbButton)

    // Gamepad binding
    const gamepadBinding = action.bindings.find(b => b.type === InputType.GAMEPAD)
    const gpButton = this.createBindingButton(
      action,
      gamepadBinding,
      InputType.GAMEPAD
    )
    row.appendChild(gpButton)

    return row
  }

  /**
   * Create a binding button
   */
  private createBindingButton(
    action: Action,
    binding: Binding | undefined,
    type: InputType
  ): HTMLElement {
    const button = document.createElement('div')
    button.className = 'control-binding'

    // Display text
    if (binding) {
      button.textContent = this.formatBinding(binding)
    } else {
      button.textContent = '---'
    }

    // Disable gamepad buttons if no gamepad connected
    if (type === InputType.GAMEPAD && !this.inputManager.isGamepadConnected()) {
      button.classList.add('gamepad-disabled')
      button.title = 'No gamepad connected'
    } else {
      // Click handler for rebinding
      button.addEventListener('click', () => {
        if (type === InputType.GAMEPAD && !this.inputManager.isGamepadConnected()) {
          return
        }
        this.startRebinding(action.name, type, button)
      })
    }

    return button
  }

  /**
   * Format binding for display
   */
  private formatBinding(binding: Binding): string {
    let text = getKeyDisplayName(binding.key)

    // Add modifiers
    if (binding.modifiers) {
      const mods: string[] = []
      if (binding.modifiers.ctrl) mods.push('Ctrl')
      if (binding.modifiers.alt) mods.push('Alt')
      if (binding.modifiers.shift) mods.push('Shift')
      if (binding.modifiers.meta) mods.push('Cmd')

      if (mods.length > 0) {
        text = mods.join('+') + '+' + text
      }
    }

    return text
  }

  /**
   * Start rebinding process
   */
  private startRebinding(
    actionName: string,
    type: InputType,
    element: HTMLElement
  ): void {
    // Cancel previous rebinding
    if (this.rebindingElement) {
      this.rebindingElement.classList.remove('rebinding')
      this.rebindingElement.style.backgroundColor = '#545655'
      this.rebindingElement.style.borderColor = '#3a3a3a'
      this.rebindingElement.textContent = this.rebindingElement.dataset.originalText || '---'
    }

    // Set rebinding state
    this.rebindingAction = actionName
    this.rebindingType = type
    this.rebindingElement = element

    // Update UI
    element.dataset.originalText = element.textContent || '---'
    element.textContent = 'Press key...'
    element.classList.add('rebinding')
    element.style.backgroundColor = '#218306'
    element.style.borderColor = '#17cd07'
    element.style.color = 'white'

    console.log(`🎮 Rebinding '${actionName}' for ${type}...`)
  }

  /**
   * Handle new binding from user input
   */
  handleBinding(binding: Binding): void {
    if (!this.rebindingAction || !this.rebindingType || !this.rebindingElement) {
      return
    }

    // Only accept bindings of the correct type
    if (binding.type !== this.rebindingType) {
      return
    }

    // Get the action
    const action = this.inputManager.getAllActions().find(a => a.name === this.rebindingAction)
    if (!action) return

    // Check for conflicts
    const conflict = this.checkConflict(binding, this.rebindingAction!)
    if (conflict) {
      const confirmReplace = confirm(
        `'${binding.key}' is already bound to '${conflict.description}'.\n\nReplace that binding?`
      )

      if (!confirmReplace) {
        this.cancelRebinding()
        return
      }

      // Remove conflicting binding
      this.inputManager.unbindAction(conflict.name, binding)
    }

    // Remove old binding of this type
    const oldBinding = action.bindings.find(b => b.type === this.rebindingType)
    if (oldBinding) {
      this.inputManager.unbindAction(this.rebindingAction!, oldBinding)
    }

    // Add new binding
    this.inputManager.bindAction(this.rebindingAction!, binding)

    // Save to localStorage
    this.inputManager.saveBindings()

    console.log(`✅ Rebound '${this.rebindingAction}' to ${binding.key}`)

    // Update UI
    this.rebindingElement.textContent = this.formatBinding(binding)
    this.rebindingElement.classList.remove('rebinding')

    // Clear rebinding state
    this.rebindingAction = null
    this.rebindingType = null
    this.rebindingElement = null

    // Re-render to update any conflicts
    this.render()
  }

  /**
   * Cancel rebinding
   */
  cancelRebinding(): void {
    if (this.rebindingElement) {
      this.rebindingElement.classList.remove('rebinding')
      this.rebindingElement.style.backgroundColor = '#545655'
      this.rebindingElement.style.borderColor = '#3a3a3a'
      this.rebindingElement.style.color = '#d4d4d4'
      this.rebindingElement.textContent = this.rebindingElement.dataset.originalText || '---'
    }

    this.rebindingAction = null
    this.rebindingType = null
    this.rebindingElement = null

    console.log('⏹️ Rebinding cancelled')
  }

  /**
   * Check if a binding conflicts with another action
   */
  private checkConflict(binding: Binding, excludeAction: string): Action | null {
    const actions = this.inputManager.getAllActions()

    for (const action of actions) {
      if (action.name === excludeAction) continue

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
   */
  private modifiersMatch(
    a?: Binding['modifiers'],
    b?: Binding['modifiers']
  ): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    return (
      a.shift === b.shift &&
      a.ctrl === b.ctrl &&
      a.alt === b.alt &&
      a.meta === b.meta
    )
  }

  /**
   * Categorize actions by category
   */
  private categorizeActions(actions: Action[]): Record<string, Action[]> {
    const categorized: Record<string, Action[]> = {}

    for (const action of actions) {
      if (!categorized[action.category]) {
        categorized[action.category] = []
      }
      categorized[action.category].push(action)
    }

    return categorized
  }

  /**
   * Setup button handlers
   */
  private setupButtons(): void {
    // Reset button
    const resetBtn = document.querySelector('#reset-controls')
    if (resetBtn) {
      console.log('✅ Found reset button, attaching handler')
      resetBtn.addEventListener('click', () => {
        console.log('🖱️ Reset button clicked')
        const confirm = window.confirm(
          'Reset all keybindings to defaults?\n\nThis cannot be undone.'
        )

        if (confirm) {
          console.log('✅ User confirmed reset')
          this.inputManager.resetBindings() // No parameter needed - uses stored defaults
          this.render()
          console.log('🔄 Controls reset to defaults')
        } else {
          console.log('⏹️ User cancelled reset')
        }
      })
    } else {
      console.error('❌ Reset button not found!')
    }

    // Export button
    const exportBtn = document.querySelector('#export-controls')
    exportBtn?.addEventListener('click', () => {
      const json = this.inputManager.exportBindings()
      this.downloadJSON(json, 'master-builder-controls.json')
      console.log('📤 Controls exported')
    })

    // Import button
    const importBtn = document.querySelector('#import-controls')
    importBtn?.addEventListener('click', () => {
      this.openFileImport()
    })
  }

  /**
   * Download JSON file
   */
  private downloadJSON(json: string, filename: string): void {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Open file import dialog
   */
  private openFileImport(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string
          this.inputManager.importBindings(json)
          this.render()
          alert('Controls imported successfully!')
          console.log('📥 Controls imported')
        } catch (err) {
          alert('Failed to import controls. Invalid file format.')
          console.error('❌ Import failed:', err)
        }
      }
      reader.readAsText(file)
    }

    input.click()
  }

  /**
   * Check if currently rebinding
   */
  isRebinding(): boolean {
    return this.rebindingAction !== null
  }
}
