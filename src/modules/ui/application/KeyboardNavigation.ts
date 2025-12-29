// src/modules/ui/application/KeyboardNavigation.ts

/**
 * KeyboardNavigation - Arrow key navigation for menu lists
 *
 * Enables navigating between focusable elements using arrow keys,
 * Enter to select, and Escape to go back.
 */

export interface KeyboardNavigationOptions {
  /** Container element to navigate within */
  container: HTMLElement
  /** Selector for focusable items */
  itemSelector?: string
  /** Called when Enter is pressed on focused item */
  onSelect?: (item: HTMLElement, index: number) => void
  /** Called when Escape is pressed */
  onEscape?: () => void
  /** Wrap around at ends */
  wrap?: boolean
  /** Initial focused index */
  initialIndex?: number
}

export class KeyboardNavigation {
  private container: HTMLElement
  private itemSelector: string
  private onSelect?: (item: HTMLElement, index: number) => void
  private onEscape?: () => void
  private wrap: boolean
  private currentIndex: number
  private items: HTMLElement[] = []
  private isActive = false

  constructor(options: KeyboardNavigationOptions) {
    this.container = options.container
    this.itemSelector = options.itemSelector || 'button, [tabindex="0"]'
    this.onSelect = options.onSelect
    this.onEscape = options.onEscape
    this.wrap = options.wrap ?? true
    this.currentIndex = options.initialIndex ?? 0

    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  /**
   * Enable keyboard navigation
   */
  enable(): void {
    if (this.isActive) return
    this.isActive = true
    this.refreshItems()
    this.focusCurrentItem()
    document.addEventListener('keydown', this.handleKeyDown)
  }

  /**
   * Disable keyboard navigation
   */
  disable(): void {
    if (!this.isActive) return
    this.isActive = false
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  /**
   * Refresh the list of navigable items
   */
  refreshItems(): void {
    this.items = Array.from(
      this.container.querySelectorAll<HTMLElement>(this.itemSelector)
    ).filter(el => !el.hidden && !el.hasAttribute('disabled'))

    // Clamp current index
    if (this.currentIndex >= this.items.length) {
      this.currentIndex = Math.max(0, this.items.length - 1)
    }
  }

  /**
   * Focus a specific index
   */
  focusIndex(index: number): void {
    if (index < 0 || index >= this.items.length) return
    this.currentIndex = index
    this.focusCurrentItem()
  }

  /**
   * Get currently focused item
   */
  getCurrentItem(): HTMLElement | null {
    return this.items[this.currentIndex] || null
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isActive) return

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        this.moveFocus(-1)
        break

      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        this.moveFocus(1)
        break

      case 'Home':
        e.preventDefault()
        this.focusIndex(0)
        break

      case 'End':
        e.preventDefault()
        this.focusIndex(this.items.length - 1)
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        this.selectCurrent()
        break

      case 'Escape':
        e.preventDefault()
        this.onEscape?.()
        break
    }
  }

  private moveFocus(delta: number): void {
    if (this.items.length === 0) return

    let newIndex = this.currentIndex + delta

    if (this.wrap) {
      // Wrap around
      if (newIndex < 0) newIndex = this.items.length - 1
      if (newIndex >= this.items.length) newIndex = 0
    } else {
      // Clamp
      newIndex = Math.max(0, Math.min(this.items.length - 1, newIndex))
    }

    this.currentIndex = newIndex
    this.focusCurrentItem()
  }

  private focusCurrentItem(): void {
    const item = this.items[this.currentIndex]
    if (item) {
      item.focus()
      // Scroll into view if needed
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }

  private selectCurrent(): void {
    const item = this.items[this.currentIndex]
    if (item) {
      // Trigger click
      item.click()
      this.onSelect?.(item, this.currentIndex)
    }
  }
}

/**
 * Create a simple keyboard navigation for a container
 */
export function enableKeyboardNavigation(
  container: HTMLElement,
  options: Partial<KeyboardNavigationOptions> = {}
): KeyboardNavigation {
  const nav = new KeyboardNavigation({ container, ...options })
  nav.enable()
  return nav
}
