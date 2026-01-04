// src/modules/ui/components/ControlsModal.ts

import { createPanel } from './base/Panel'
import { createButton } from './base/Button'
import { createRibbonTitle } from './base/RibbonTitle'
import { InputService } from '../../input/application/InputService'
import { GameAction } from '../../input/domain/GameAction'
import { KeyBinding } from '../../input/domain/KeyBinding'

export interface ControlsModalOptions {
  inputService: InputService
  onClose: () => void
}

export interface ControlsModalComponent {
  element: HTMLElement
  show: () => void
  hide: () => void
  destroy: () => void
}

/**
 * Format a key code to a human-readable label
 */
function formatKeyCode(code: string): string {
  // Handle mouse buttons
  if (code === 'mouse:left') return 'Left Click'
  if (code === 'mouse:right') return 'Right Click'
  if (code === 'mouse:middle') return 'Middle Click'

  // Handle special keys
  const specialKeys: Record<string, string> = {
    'Space': 'Space',
    'Escape': 'Esc',
    'Tab': 'Tab',
    'ShiftLeft': 'L Shift',
    'ShiftRight': 'R Shift',
    'ControlLeft': 'L Ctrl',
    'ControlRight': 'R Ctrl',
    'AltLeft': 'L Alt',
    'AltRight': 'R Alt',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': 'Enter',
    'Backspace': 'Back',
    'Delete': 'Del',
    'Insert': 'Ins',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PgUp',
    'PageDown': 'PgDn',
  }

  if (specialKeys[code]) return specialKeys[code]

  // Handle letter keys (KeyA -> A)
  if (code.startsWith('Key')) return code.slice(3)

  // Handle digit keys (Digit1 -> 1)
  if (code.startsWith('Digit')) return code.slice(5)

  // Handle numpad (Numpad1 -> Num1)
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6)

  // Handle F keys
  if (code.startsWith('F') && !isNaN(parseInt(code.slice(1)))) return code

  return code
}

/**
 * Format action ID to human-readable label
 */
function formatActionName(id: string): string {
  return id
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get category display order and label
 */
function getCategoryInfo(category: string): { order: number; label: string } {
  const categories: Record<string, { order: number; label: string }> = {
    'movement': { order: 1, label: 'Movement' },
    'camera': { order: 2, label: 'Camera' },
    'building': { order: 3, label: 'Building' },
    'inventory': { order: 4, label: 'Inventory' },
    'ui': { order: 5, label: 'Interface' },
  }
  return categories[category] ?? { order: 99, label: category.charAt(0).toUpperCase() + category.slice(1) }
}

export function createControlsModal(options: ControlsModalOptions): ControlsModalComponent {
  const { inputService, onClose } = options

  let rebindingAction: string | null = null
  let keyListener: ((e: KeyboardEvent) => void) | null = null
  let mouseListener: ((e: MouseEvent) => void) | null = null

  // Container (full screen overlay)
  const container = document.createElement('div')
  container.className = 'kb-controls-modal'
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.85);
    z-index: calc(var(--z-modal) + 10);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s, visibility 0.2s;
  `

  // Main panel
  const panel = createPanel({
    width: '600px',
    padding: 'var(--space-lg)',
    corners: true
  })
  panel.style.cssText += `
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    max-height: 85vh;
    animation: kb-scale-in 0.2s ease-out;
  `

  // Title
  const title = createRibbonTitle({
    title: 'Controls',
    size: 'small'
  })

  // Scrollable content area
  const content = document.createElement('div')
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    overflow-y: auto;
    flex: 1;
    padding-right: var(--space-sm);
  `

  // Build controls list by category
  const actions = inputService.getAllActions()
  const byCategory = new Map<string, GameAction[]>()

  for (const action of actions) {
    const cat = action.category
    if (!byCategory.has(cat)) {
      byCategory.set(cat, [])
    }
    byCategory.get(cat)!.push(action)
  }

  // Sort categories and render
  const sortedCategories = Array.from(byCategory.entries())
    .sort((a, b) => getCategoryInfo(a[0]).order - getCategoryInfo(b[0]).order)

  const bindingRows: Map<string, HTMLElement> = new Map()

  for (const [category, categoryActions] of sortedCategories) {
    const categoryInfo = getCategoryInfo(category)

    // Category header
    const categoryHeader = document.createElement('div')
    categoryHeader.style.cssText = `
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
      font-weight: bold;
      color: var(--text-gold);
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-bottom: var(--space-xs);
      border-bottom: 2px solid var(--wood-medium);
      margin-top: var(--space-sm);
    `
    categoryHeader.textContent = categoryInfo.label
    content.appendChild(categoryHeader)

    // Action rows
    for (const action of categoryActions) {
      const row = createBindingRow(action)
      bindingRows.set(action.id, row)
      content.appendChild(row)
    }
  }

  function createBindingRow(action: GameAction): HTMLElement {
    const row = document.createElement('div')
    row.className = 'kb-binding-row'
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm) var(--space-xs);
      border-radius: 4px;
      transition: background 0.15s;
    `

    // Action name
    const nameEl = document.createElement('div')
    nameEl.style.cssText = `
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
      color: var(--text-light);
    `
    nameEl.textContent = formatActionName(action.id)

    // Key binding button
    const keyBtn = document.createElement('button')
    keyBtn.className = 'kb-key-button'
    keyBtn.style.cssText = `
      min-width: 100px;
      padding: var(--space-xs) var(--space-sm);
      background: var(--wood-dark);
      border: 2px solid var(--wood-medium);
      border-radius: 4px;
      color: var(--text-light);
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    `

    const updateKeyDisplay = () => {
      const bindings = inputService.getBindings(action.id)
      if (bindings.length > 0) {
        keyBtn.textContent = formatKeyCode(bindings[0].key)
        keyBtn.style.color = 'var(--text-light)'
      } else {
        keyBtn.textContent = 'Not bound'
        keyBtn.style.color = 'var(--text-muted)'
      }
    }
    updateKeyDisplay()

    keyBtn.addEventListener('mouseenter', () => {
      if (rebindingAction !== action.id) {
        keyBtn.style.borderColor = 'var(--button-green)'
        keyBtn.style.background = 'var(--wood-medium)'
      }
    })

    keyBtn.addEventListener('mouseleave', () => {
      if (rebindingAction !== action.id) {
        keyBtn.style.borderColor = 'var(--wood-medium)'
        keyBtn.style.background = 'var(--wood-dark)'
      }
    })

    keyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      startRebinding(action.id, keyBtn, updateKeyDisplay)
    })

    row.appendChild(nameEl)
    row.appendChild(keyBtn)

    return row
  }

  function startRebinding(
    actionId: string,
    button: HTMLElement,
    onUpdate: () => void
  ): void {
    // Cancel any existing rebind
    if (rebindingAction) {
      cancelRebinding()
    }

    rebindingAction = actionId
    button.textContent = 'Press key...'
    button.style.background = 'var(--button-green)'
    button.style.borderColor = 'var(--button-green-dark)'
    button.style.color = 'white'

    // Listen for key press
    keyListener = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Allow Escape to cancel
      if (e.code === 'Escape') {
        cancelRebinding()
        onUpdate()
        return
      }

      finishRebinding(e.code, button, onUpdate)
    }

    // Listen for mouse button
    mouseListener = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const buttonMap: Record<number, string> = {
        0: 'mouse:left',
        1: 'mouse:middle',
        2: 'mouse:right'
      }
      const key = buttonMap[e.button]
      if (key) {
        finishRebinding(key, button, onUpdate)
      }
    }

    document.addEventListener('keydown', keyListener, true)
    document.addEventListener('mousedown', mouseListener, true)
  }

  function finishRebinding(
    key: string,
    button: HTMLElement,
    onUpdate: () => void
  ): void {
    if (!rebindingAction) return

    // Check for conflicts
    const conflict = inputService.findConflict(key, rebindingAction)
    if (conflict) {
      // Show conflict warning and swap bindings
      const action = inputService.getAllActions().find(a => a.id === conflict)
      const actionName = action ? formatActionName(action.id) : conflict

      // Clear the conflicting binding
      inputService.clearBindings(conflict)

      // Update the conflicting row
      const conflictRow = bindingRows.get(conflict)
      if (conflictRow) {
        const conflictBtn = conflictRow.querySelector('.kb-key-button') as HTMLElement
        if (conflictBtn) {
          conflictBtn.textContent = 'Not bound'
          conflictBtn.style.color = 'var(--text-muted)'
        }
      }

      console.log(`⌨️ Removed binding from "${actionName}" (conflict)`)
    }

    // Set the new binding
    inputService.setBinding(rebindingAction, { key, ctrl: false, shift: false, alt: false })

    // Reset button style
    button.style.background = 'var(--wood-dark)'
    button.style.borderColor = 'var(--wood-medium)'
    button.style.color = 'var(--text-light)'

    cancelRebinding()
    onUpdate()
  }

  function cancelRebinding(): void {
    if (keyListener) {
      document.removeEventListener('keydown', keyListener, true)
      keyListener = null
    }
    if (mouseListener) {
      document.removeEventListener('mousedown', mouseListener, true)
      mouseListener = null
    }
    rebindingAction = null
  }

  // Button row
  const buttonRow = document.createElement('div')
  buttonRow.style.cssText = `
    display: flex;
    gap: var(--space-sm);
    justify-content: flex-end;
    padding-top: var(--space-sm);
    border-top: 2px solid var(--wood-medium);
  `

  // Reset to Defaults button
  const resetBtn = createButton({
    label: 'Reset Defaults',
    variant: 'secondary',
    size: 'small',
    onClick: () => {
      inputService.resetToDefaults()
      // Refresh all binding displays
      for (const [actionId, row] of bindingRows) {
        const btn = row.querySelector('.kb-key-button') as HTMLElement
        if (btn) {
          const bindings = inputService.getBindings(actionId)
          if (bindings.length > 0) {
            btn.textContent = formatKeyCode(bindings[0].key)
            btn.style.color = 'var(--text-light)'
          } else {
            btn.textContent = 'Not bound'
            btn.style.color = 'var(--text-muted)'
          }
        }
      }
    }
  })

  // Close button
  const closeBtn = createButton({
    label: 'Done',
    variant: 'primary',
    size: 'small',
    onClick: () => {
      cancelRebinding()
      onClose()
    }
  })

  buttonRow.appendChild(resetBtn)
  buttonRow.appendChild(closeBtn)

  // Help text
  const helpText = document.createElement('div')
  helpText.style.cssText = `
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-align: center;
    padding: var(--space-xs) 0;
  `
  helpText.textContent = 'Click a key to rebind. Press Escape to cancel.'

  panel.appendChild(title)
  panel.appendChild(content)
  panel.appendChild(helpText)
  panel.appendChild(buttonRow)
  container.appendChild(panel)

  // Click outside to close
  container.addEventListener('click', (e) => {
    if (e.target === container) {
      cancelRebinding()
      onClose()
    }
  })

  // Component methods
  const show = () => {
    document.body.appendChild(container)
    void container.offsetHeight
    container.style.opacity = '1'
    container.style.visibility = 'visible'
  }

  const hide = () => {
    cancelRebinding()
    container.style.opacity = '0'
    container.style.visibility = 'hidden'
    setTimeout(() => {
      if (container.parentElement) {
        container.parentElement.removeChild(container)
      }
    }, 200)
  }

  const destroy = () => {
    cancelRebinding()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  }

  return {
    element: container,
    show,
    hide,
    destroy
  }
}
