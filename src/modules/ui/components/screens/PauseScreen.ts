// src/modules/ui/components/screens/PauseScreen.ts

import { createPanel } from '../base/Panel'
import { createButton } from '../base/Button'
import { createRibbonTitle } from '../base/RibbonTitle'

/**
 * PauseScreen - In-game pause menu
 *
 * Distinct from MainMenuScreen - shows resume as primary action.
 */

export interface PauseScreenOptions {
  /** Called when Resume is clicked */
  onResume: () => void
  /** Called when Save Game is clicked */
  onSave: () => void
  /** Called when Settings is clicked */
  onSettings: () => void
  /** Called when Exit to Menu is clicked */
  onExitToMenu: () => void
}

export interface PauseScreenComponent {
  element: HTMLElement
  show: () => void
  hide: () => void
  destroy: () => void
}

export function createPauseScreen(options: PauseScreenOptions): PauseScreenComponent {
  const {
    onResume,
    onSave,
    onSettings,
    onExitToMenu
  } = options

  const container = document.createElement('div')
  container.className = 'kb-pause-screen'
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: var(--z-modal);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-fast), visibility var(--transition-fast);
  `

  // Main panel
  const panel = createPanel({
    width: '340px',
    padding: 'var(--space-lg)',
    corners: true
  })
  panel.style.cssText += `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    animation: kb-scale-in 0.2s ease-out;
  `

  // Title
  const title = createRibbonTitle({
    title: 'Paused',
    size: 'small'
  })

  // Buttons container
  const buttonsContainer = document.createElement('div')
  buttonsContainer.className = 'kb-pause-buttons'
  buttonsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    width: 100%;
    margin-top: var(--space-md);
  `

  // Resume button (primary action)
  const resumeBtn = createButton({
    label: 'Resume Game',
    variant: 'primary',
    size: 'large',
    fullWidth: true,
    icon: '▶',
    onClick: onResume
  })

  // Save button
  const saveBtn = createButton({
    label: 'Save Game',
    variant: 'secondary',
    size: 'medium',
    fullWidth: true,
    icon: '💾',
    onClick: onSave
  })

  // Settings button
  const settingsBtn = createButton({
    label: 'Settings',
    variant: 'ghost',
    size: 'medium',
    fullWidth: true,
    icon: '⚙️',
    onClick: onSettings
  })

  // Divider
  const divider = document.createElement('div')
  divider.style.cssText = `
    width: 100%;
    height: 2px;
    background: var(--wood-dark);
    margin: var(--space-sm) 0;
  `

  // Exit button
  const exitBtn = createButton({
    label: 'Save & Exit',
    variant: 'danger',
    size: 'medium',
    fullWidth: true,
    icon: '🚪',
    onClick: onExitToMenu
  })

  buttonsContainer.appendChild(resumeBtn)
  buttonsContainer.appendChild(saveBtn)
  buttonsContainer.appendChild(settingsBtn)
  buttonsContainer.appendChild(divider)
  buttonsContainer.appendChild(exitBtn)

  // Hint text
  const hint = document.createElement('div')
  hint.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-align: center;
    margin-top: var(--space-sm);
  `
  hint.textContent = 'Press ESC or click Resume to continue'

  panel.appendChild(title)
  panel.appendChild(buttonsContainer)
  panel.appendChild(hint)

  container.appendChild(panel)

  // ESC key handler with debounce to prevent immediate resume
  let showTime = 0
  const ESC_DEBOUNCE_MS = 300  // Ignore ESC for 300ms after showing

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      // Debounce: ignore ESC if screen just opened (prevents fullscreen exit conflict)
      if (Date.now() - showTime > ESC_DEBOUNCE_MS) {
        onResume()
      }
    }
  }

  const show = () => {
    showTime = Date.now()
    document.body.appendChild(container)
    void container.offsetHeight
    container.style.opacity = '1'
    container.style.visibility = 'visible'
    document.addEventListener('keydown', handleKeydown)

    // Focus the Resume button so user can interact with the menu
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      resumeBtn.focus()
    })
  }

  const hide = () => {
    container.style.opacity = '0'
    container.style.visibility = 'hidden'
    document.removeEventListener('keydown', handleKeydown)
    setTimeout(() => {
      if (container.parentElement) {
        container.parentElement.removeChild(container)
      }
    }, 150)
  }

  const destroy = () => {
    hide()
    document.removeEventListener('keydown', handleKeydown)
  }

  return {
    element: container,
    show,
    hide,
    destroy
  }
}
