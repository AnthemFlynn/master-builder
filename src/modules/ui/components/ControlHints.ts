// src/modules/ui/components/ControlHints.ts

/**
 * ControlHints - Shows control hints overlay when player first enters world
 *
 * Displays essential controls and auto-hides after interaction or timeout.
 */

export interface ControlHintsOptions {
  /** Auto-hide after this many ms (default: 8000) */
  autoHideMs?: number
  /** Called when hints are dismissed */
  onDismiss?: () => void
}

export class ControlHints {
  private container: HTMLDivElement
  private autoHideTimer: ReturnType<typeof setTimeout> | null = null
  private isVisible = false

  constructor(private options: ControlHintsOptions = {}) {
    this.container = this.createContainer()
    document.body.appendChild(this.container)
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'kb-control-hints'
    container.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 24px;
      padding: 16px 24px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 12px;
      font-family: var(--font-family, 'Courier Prime', monospace);
      font-size: 14px;
      color: white;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.5s, visibility 0.5s;
      z-index: 1000;
      pointer-events: none;
    `

    // Control groups
    const groups = [
      {
        title: 'Move',
        keys: ['W', 'A', 'S', 'D'],
        layout: 'wasd'
      },
      {
        title: 'Look',
        keys: ['Mouse'],
        icon: '🖱️'
      },
      {
        title: 'Build / Destroy',
        keys: ['Left / Right Click'],
        icon: '🔨'
      },
      {
        title: 'Jump / Fly',
        keys: ['Space', 'F'],
        layout: 'inline'
      }
    ]

    groups.forEach(group => {
      const groupEl = document.createElement('div')
      groupEl.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      `

      // Keys
      const keysEl = document.createElement('div')
      keysEl.style.cssText = `
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        justify-content: center;
      `

      if (group.layout === 'wasd') {
        // WASD layout
        keysEl.style.cssText += `
          display: grid;
          grid-template-columns: repeat(3, 28px);
          grid-template-rows: repeat(2, 28px);
        `
        const positions = ['', 'W', '', 'A', 'S', 'D']
        positions.forEach(key => {
          const keyEl = this.createKey(key)
          keysEl.appendChild(keyEl)
        })
      } else if (group.icon) {
        // Icon display
        const iconEl = document.createElement('span')
        iconEl.textContent = group.icon
        iconEl.style.fontSize = '24px'
        keysEl.appendChild(iconEl)
      } else {
        // Inline keys
        group.keys.forEach((key, i) => {
          if (i > 0) {
            const sep = document.createElement('span')
            sep.textContent = ' / '
            sep.style.color = '#888'
            keysEl.appendChild(sep)
          }
          const keyEl = this.createKey(key)
          keysEl.appendChild(keyEl)
        })
      }

      // Title
      const titleEl = document.createElement('div')
      titleEl.textContent = group.title
      titleEl.style.cssText = `
        font-size: 11px;
        color: #aaa;
        text-transform: uppercase;
        letter-spacing: 1px;
      `

      groupEl.appendChild(keysEl)
      groupEl.appendChild(titleEl)
      container.appendChild(groupEl)
    })

    // Dismiss hint
    const dismissHint = document.createElement('div')
    dismissHint.textContent = 'Press any key to dismiss'
    dismissHint.style.cssText = `
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #666;
    `
    container.appendChild(dismissHint)

    return container
  }

  private createKey(key: string): HTMLSpanElement {
    const keyEl = document.createElement('span')
    if (!key) {
      keyEl.style.visibility = 'hidden'
    }
    keyEl.textContent = key
    keyEl.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    `
    return keyEl
  }

  show(): void {
    if (this.isVisible) return

    this.isVisible = true
    this.container.style.opacity = '1'
    this.container.style.visibility = 'visible'

    // Auto-hide after timeout
    const timeout = this.options.autoHideMs ?? 8000
    this.autoHideTimer = setTimeout(() => {
      this.hide()
    }, timeout)

    // Hide on any key press or mouse click
    const dismissHandler = () => {
      this.hide()
      document.removeEventListener('keydown', dismissHandler)
      document.removeEventListener('mousedown', dismissHandler)
    }

    // Delay adding listeners to avoid immediate dismissal
    setTimeout(() => {
      document.addEventListener('keydown', dismissHandler)
      document.addEventListener('mousedown', dismissHandler)
    }, 500)
  }

  hide(): void {
    if (!this.isVisible) return

    this.isVisible = false
    this.container.style.opacity = '0'
    this.container.style.visibility = 'hidden'

    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer)
      this.autoHideTimer = null
    }

    this.options.onDismiss?.()
  }

  destroy(): void {
    this.hide()
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container)
    }
  }
}
