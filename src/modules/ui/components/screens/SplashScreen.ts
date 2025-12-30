// src/modules/ui/components/screens/SplashScreen.ts

/**
 * SplashScreen - Initial game splash with logo and "Press any key"
 *
 * Full-screen overlay with animated title and prompt.
 */

export interface SplashScreenOptions {
  /** Called when user interacts (key press or click) */
  onContinue: () => void
}

export interface SplashScreenComponent {
  element: HTMLElement
  show: () => void
  hide: () => void
  destroy: () => void
}

export function createSplashScreen(options: SplashScreenOptions): SplashScreenComponent {
  const { onContinue } = options

  const container = document.createElement('div')
  container.className = 'kb-splash-screen'
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
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
    z-index: var(--z-modal);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-slow), visibility var(--transition-slow);
  `

  // Decorative background elements
  const bgDecor = document.createElement('div')
  bgDecor.className = 'kb-splash-decor'
  bgDecor.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at 20% 80%, rgba(76, 175, 80, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 80% 20%, rgba(123, 94, 173, 0.1) 0%, transparent 40%);
    pointer-events: none;
  `

  // Title container
  const titleContainer = document.createElement('div')
  titleContainer.className = 'kb-splash-title-container'
  titleContainer.style.cssText = `
    text-align: center;
    animation: kb-scale-in 0.8s ease-out;
  `

  // Main title
  const title = document.createElement('h1')
  title.className = 'kb-splash-title'
  title.textContent = 'Kingdom Builder'
  title.style.cssText = `
    font-family: var(--font-family);
    font-size: 64px;
    font-weight: bold;
    color: var(--text-light);
    text-shadow:
      0 0 20px rgba(76, 175, 80, 0.5),
      0 4px 8px rgba(0, 0, 0, 0.5);
    margin: 0 0 var(--space-md) 0;
    letter-spacing: 4px;
  `

  // Subtitle
  const subtitle = document.createElement('div')
  subtitle.className = 'kb-splash-subtitle'
  subtitle.textContent = 'A Voxel Adventure'
  subtitle.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-lg);
    color: var(--text-muted);
    letter-spacing: 8px;
    text-transform: uppercase;
  `

  titleContainer.appendChild(title)
  titleContainer.appendChild(subtitle)

  // Press any key prompt
  const prompt = document.createElement('div')
  prompt.className = 'kb-splash-prompt'
  prompt.textContent = 'Press any key to continue'
  prompt.style.cssText = `
    position: absolute;
    bottom: 80px;
    font-family: var(--font-family);
    font-size: var(--font-size-md);
    color: var(--text-light);
    opacity: 0.8;
    animation: kb-pulse 2s ease-in-out infinite;
  `

  // Version
  const version = document.createElement('div')
  version.className = 'kb-splash-version'
  version.textContent = 'Alpha 0.4.0'
  version.style.cssText = `
    position: absolute;
    bottom: var(--space-lg);
    right: var(--space-lg);
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    opacity: 0.5;
  `

  container.appendChild(bgDecor)
  container.appendChild(titleContainer)
  container.appendChild(prompt)
  container.appendChild(version)

  // Event handlers
  let hasTriggered = false

  const handleInteraction = (e: Event) => {
    if (hasTriggered) return
    hasTriggered = true
    e.preventDefault()
    onContinue()
  }

  const keyHandler = (e: KeyboardEvent) => handleInteraction(e)
  const clickHandler = (e: MouseEvent) => handleInteraction(e)

  const show = () => {
    hasTriggered = false
    document.body.appendChild(container)
    // Force reflow
    void container.offsetHeight
    container.style.opacity = '1'
    container.style.visibility = 'visible'

    // Add event listeners
    document.addEventListener('keydown', keyHandler)
    container.addEventListener('click', clickHandler)
  }

  const hide = () => {
    container.style.opacity = '0'
    container.style.visibility = 'hidden'

    // Remove event listeners
    document.removeEventListener('keydown', keyHandler)
    container.removeEventListener('click', clickHandler)

    setTimeout(() => {
      if (container.parentElement) {
        container.parentElement.removeChild(container)
      }
    }, 400)
  }

  const destroy = () => {
    hide()
    document.removeEventListener('keydown', keyHandler)
    container.removeEventListener('click', clickHandler)
  }

  return {
    element: container,
    show,
    hide,
    destroy
  }
}
