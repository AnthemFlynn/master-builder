// src/modules/ui/components/screens/MainMenuScreen.ts

import { createPanel } from '../base/Panel'
import { createButton } from '../base/Button'
import { createRibbonTitle } from '../base/RibbonTitle'

/**
 * MainMenuScreen - Primary game menu
 *
 * Shows Continue (if save exists), New Game, Worlds, Settings, and Quit buttons.
 */

export interface MainMenuScreenOptions {
  /** Whether a continue save exists */
  hasContinue: boolean
  /** Called when Continue is clicked */
  onContinue: () => void
  /** Called when New Game is clicked */
  onNewGame: () => void
  /** Called when Worlds is clicked */
  onWorlds: () => void
  /** Called when Settings is clicked */
  onSettings: () => void
  /** Called when Quit is clicked (optional, for Electron apps) */
  onQuit?: () => void
}

export interface MainMenuScreenComponent {
  element: HTMLElement
  show: () => void
  hide: () => void
  destroy: () => void
  setHasContinue: (has: boolean) => void
}

export function createMainMenuScreen(options: MainMenuScreenOptions): MainMenuScreenComponent {
  const {
    hasContinue: initialHasContinue,
    onContinue,
    onNewGame,
    onWorlds,
    onSettings,
    onQuit
  } = options

  let hasContinue = initialHasContinue

  const container = document.createElement('div')
  container.className = 'kb-main-menu-screen'
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
    z-index: var(--z-modal);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-normal), visibility var(--transition-normal);
  `

  // Decorative background
  const bgDecor = document.createElement('div')
  bgDecor.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at 30% 70%, rgba(76, 175, 80, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 70% 30%, rgba(123, 94, 173, 0.08) 0%, transparent 50%);
    pointer-events: none;
  `

  // Main panel
  const panel = createPanel({
    width: '380px',
    padding: 'var(--space-xl)',
    corners: true
  })
  panel.style.cssText += `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
    animation: kb-scale-in 0.3s ease-out;
  `

  // Title ribbon
  const title = createRibbonTitle({
    title: 'Kingdom Builder',
    size: 'medium'
  })
  title.style.marginBottom = 'var(--space-md)'

  // Buttons container
  const buttonsContainer = document.createElement('div')
  buttonsContainer.className = 'kb-main-menu-buttons'
  buttonsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    width: 100%;
  `

  // New Game button (always primary)
  const newGameBtn = createButton({
    label: 'New Game',
    variant: 'primary',
    size: 'large',
    fullWidth: true,
    icon: '✨',
    onClick: onNewGame
  })

  // Load Game / Worlds button
  const worldsBtn = createButton({
    label: 'Load Game',
    variant: 'secondary',
    size: 'large',
    fullWidth: true,
    icon: '🌍',
    onClick: onWorlds
  })

  // Continue button (only shown if there's a recent session)
  const continueBtn = createButton({
    label: 'Continue',
    variant: 'ghost',
    size: 'medium',
    fullWidth: true,
    icon: '▶',
    onClick: onContinue
  })
  continueBtn.style.display = hasContinue ? 'flex' : 'none'

  // Settings button
  const settingsBtn = createButton({
    label: 'Settings',
    variant: 'ghost',
    size: 'medium',
    fullWidth: true,
    icon: '⚙️',
    onClick: onSettings
  })

  buttonsContainer.appendChild(newGameBtn)
  buttonsContainer.appendChild(worldsBtn)
  buttonsContainer.appendChild(continueBtn)
  buttonsContainer.appendChild(settingsBtn)

  // Quit button (optional, for desktop apps)
  if (onQuit) {
    const quitBtn = createButton({
      label: 'Quit',
      variant: 'ghost',
      size: 'small',
      onClick: onQuit
    })
    quitBtn.style.marginTop = 'var(--space-md)'
    quitBtn.style.opacity = '0.7'
    buttonsContainer.appendChild(quitBtn)
  }

  panel.appendChild(title)
  panel.appendChild(buttonsContainer)

  container.appendChild(bgDecor)
  container.appendChild(panel)

  const show = () => {
    document.body.appendChild(container)
    void container.offsetHeight
    container.style.opacity = '1'
    container.style.visibility = 'visible'

    // Focus the primary button so user can interact with the menu
    requestAnimationFrame(() => {
      newGameBtn.focus()
    })
  }

  const hide = () => {
    container.style.opacity = '0'
    container.style.visibility = 'hidden'
    setTimeout(() => {
      if (container.parentElement) {
        container.parentElement.removeChild(container)
      }
    }, 250)
  }

  const destroy = () => {
    hide()
  }

  const setHasContinue = (has: boolean) => {
    hasContinue = has
    continueBtn.style.display = has ? 'flex' : 'none'
  }

  return {
    element: container,
    show,
    hide,
    destroy,
    setHasContinue
  }
}
