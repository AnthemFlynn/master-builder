// src/modules/ui/components/screens/LoadingScreen.ts

import { createProgressBar } from '../base/ProgressBar'

/**
 * LoadingScreen - World loading with progress bar
 *
 * Shows world name, progress bar, and status text.
 * Portal collapse animation when loading completes.
 */

export interface LoadingScreenOptions {
  /** World name being loaded */
  worldName?: string
  /** Initial message */
  message?: string
}

export interface LoadingScreenComponent {
  element: HTMLElement
  show: () => void
  hide: () => void
  hideWithAnimation: (onComplete?: () => void) => void
  destroy: () => void
  setProgress: (current: number, total: number, unit?: string) => void
  setMessage: (message: string) => void
  setWorldName: (name: string) => void
}

export function createLoadingScreen(options: LoadingScreenOptions = {}): LoadingScreenComponent {
  const {
    worldName = 'Loading...',
    message = 'Generating terrain...'
  } = options

  const container = document.createElement('div')
  container.className = 'kb-loading-screen'
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at center, #2a1f5e 0%, #0a0a1a 100%);
    z-index: var(--z-loading);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-normal), visibility var(--transition-normal);
  `

  // Portal effect (concentric rings)
  const portal = document.createElement('div')
  portal.className = 'kb-loading-portal'
  portal.style.cssText = `
    position: absolute;
    width: 400px;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.6s ease-in, opacity 0.6s ease-in;
  `

  // Create portal rings
  for (let i = 0; i < 4; i++) {
    const ring = document.createElement('div')
    ring.className = `kb-loading-ring kb-loading-ring-${i}`
    const size = 200 + i * 60
    ring.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border: 3px solid rgba(123, 94, 173, ${0.6 - i * 0.1});
      border-radius: 50%;
      animation: kb-portal-spin ${4 + i}s linear infinite ${i % 2 === 0 ? '' : 'reverse'};
    `
    portal.appendChild(ring)
  }

  // Inner glow
  const glow = document.createElement('div')
  glow.className = 'kb-loading-glow'
  glow.style.cssText = `
    position: absolute;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(123, 94, 173, 0.4) 0%, transparent 70%);
    animation: kb-pulse 2s ease-in-out infinite;
  `
  portal.appendChild(glow)

  // Content container
  const content = document.createElement('div')
  content.className = 'kb-loading-content'
  content.style.cssText = `
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
    width: 320px;
  `

  // World name
  const worldNameEl = document.createElement('h2')
  worldNameEl.className = 'kb-loading-world-name'
  worldNameEl.textContent = worldName
  worldNameEl.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-xl);
    font-weight: bold;
    color: var(--text-light);
    text-align: center;
    text-shadow: 0 0 20px rgba(123, 94, 173, 0.5);
    margin: 0;
  `

  // Progress bar
  const progressBar = createProgressBar({
    progress: 0,
    variant: 'purple',
    height: '20px',
    animated: true
  })
  progressBar.element.style.width = '100%'

  // Status message
  const messageEl = document.createElement('div')
  messageEl.className = 'kb-loading-message'
  messageEl.textContent = message
  messageEl.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    text-align: center;
  `

  // Tip (optional flavor text)
  const tip = document.createElement('div')
  tip.className = 'kb-loading-tip'
  tip.style.cssText = `
    position: absolute;
    bottom: var(--space-xxl);
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    opacity: 0.6;
    text-align: center;
  `
  tip.textContent = getRandomTip()

  content.appendChild(worldNameEl)
  content.appendChild(progressBar.element)
  content.appendChild(messageEl)

  container.appendChild(portal)
  container.appendChild(content)
  container.appendChild(tip)

  // Inject portal animation styles
  injectLoadingStyles()

  const show = () => {
    tip.textContent = getRandomTip()
    portal.style.transform = 'scale(1)'
    portal.style.opacity = '1'
    document.body.appendChild(container)
    void container.offsetHeight
    container.style.opacity = '1'
    container.style.visibility = 'visible'
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

  const hideWithAnimation = (onComplete?: () => void) => {
    // Portal collapse animation
    portal.style.transform = 'scale(0)'
    portal.style.opacity = '0'
    content.style.opacity = '0'
    content.style.transform = 'scale(0.9)'

    setTimeout(() => {
      hide()
      onComplete?.()
    }, 600)
  }

  const destroy = () => {
    hide()
  }

  const setProgress = (current: number, total: number, unit = 'chunks') => {
    const percent = total > 0 ? (current / total) * 100 : 0
    progressBar.setProgress(percent)
    messageEl.textContent = `Loading ${current}/${total} ${unit}...`
  }

  const setMessage = (msg: string) => {
    messageEl.textContent = msg
  }

  const setWorldName = (name: string) => {
    worldNameEl.textContent = name
  }

  return {
    element: container,
    show,
    hide,
    hideWithAnimation,
    destroy,
    setProgress,
    setMessage,
    setWorldName
  }
}

function getRandomTip(): string {
  const tips = [
    'Tip: Press F to toggle flying mode',
    'Tip: Use Tab to open the block picker',
    'Tip: Press B for the creative inventory',
    'Tip: Hold Shift to sneak (slow movement)',
    'Tip: Use 1-9 to select hotbar slots',
    'Tip: Right-click to place blocks',
    'Tip: Left-click to break blocks',
    'Tip: Press ESC to pause the game'
  ]
  return tips[Math.floor(Math.random() * tips.length)]
}

function injectLoadingStyles(): void {
  if (document.getElementById('kb-loading-styles')) return

  const style = document.createElement('style')
  style.id = 'kb-loading-styles'
  style.textContent = `
    @keyframes kb-portal-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .kb-loading-content {
      transition: opacity 0.4s ease-out, transform 0.4s ease-out;
    }
  `
  document.head.appendChild(style)
}
