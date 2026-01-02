// src/modules/ui/components/base/Panel.ts

/**
 * Panel - Wooden frame container with optional stone corner decorations
 *
 * Used as the primary container for menu screens and dialogs.
 * Features a wood grain texture background with beveled edges.
 */

export interface PanelOptions {
  /** Panel width in CSS units */
  width?: string
  /** Panel height in CSS units (default: auto) */
  height?: string
  /** Maximum height (for scrollable content) */
  maxHeight?: string
  /** Add stone corner decorations */
  corners?: boolean
  /** Inner padding */
  padding?: string
  /** Additional CSS classes */
  className?: string
}

export function createPanel(options: PanelOptions = {}): HTMLElement {
  const {
    width = '400px',
    height = 'auto',
    maxHeight,
    corners = true,
    padding = 'var(--space-lg)',
    className = ''
  } = options

  const panel = document.createElement('div')
  panel.className = `kb-panel ${className}`.trim()

  panel.style.cssText = `
    position: relative;
    width: ${width};
    height: ${height};
    ${maxHeight ? `max-height: ${maxHeight};` : ''}
    padding: ${padding};
    background: var(--wood-grain);
    background-color: var(--wood-medium);
    border: var(--border-wood-thick);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-panel);
    overflow: ${maxHeight ? 'auto' : 'visible'};
    box-sizing: border-box;
  `

  // Add corner decorations
  if (corners) {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    positions.forEach(pos => {
      const corner = document.createElement('div')
      corner.className = `kb-panel-corner kb-panel-corner--${pos}`

      const [vertical, horizontal] = pos.split('-')
      corner.style.cssText = `
        position: absolute;
        width: 24px;
        height: 24px;
        background: var(--stone-blue);
        border: 3px solid var(--stone-blue-dark);
        border-radius: 4px;
        ${vertical}: -6px;
        ${horizontal}: -6px;
        z-index: 1;
      `
      panel.appendChild(corner)
    })
  }

  return panel
}

/**
 * Inject Panel component styles into the document
 */
export function injectPanelStyles(): void {
  if (document.getElementById('kb-panel-styles')) return

  const style = document.createElement('style')
  style.id = 'kb-panel-styles'
  style.textContent = `
    .kb-panel {
      font-family: var(--font-family);
      color: var(--text-light);
    }

    .kb-panel::-webkit-scrollbar {
      width: 12px;
    }

    .kb-panel::-webkit-scrollbar-track {
      background: var(--wood-dark);
      border-radius: 6px;
    }

    .kb-panel::-webkit-scrollbar-thumb {
      background: var(--wood-light);
      border-radius: 6px;
      border: 2px solid var(--wood-dark);
    }

    .kb-panel::-webkit-scrollbar-thumb:hover {
      background: var(--parchment);
    }
  `
  document.head.appendChild(style)
}
