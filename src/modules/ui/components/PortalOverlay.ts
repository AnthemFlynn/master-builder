// src/modules/ui/components/PortalOverlay.ts

/**
 * Portal Aperture Effect - Simple circular opening that reveals the world
 * Like walking out of a portal gate, looking forward as it opens
 */
export class PortalOverlay {
  private container: HTMLDivElement
  private isVisible = false
  private progress = 0
  private static stylesInjected = false

  constructor() {
    this.container = this.createContainer()
    document.body.appendChild(this.container)
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'portal-aperture'

    // Only inject styles once to avoid conflicts
    if (PortalOverlay.stylesInjected) {
      container.innerHTML = `<div class="progress-text">Entering world...</div>`
      return container
    }
    PortalOverlay.stylesInjected = true

    const style = document.createElement('style')
    style.id = 'portal-overlay-styles'
    style.textContent = `
      .portal-aperture {
        position: fixed;
        inset: 0;
        z-index: 1000;
        pointer-events: none;
        display: none;

        /* Radial gradient mask - black edges, transparent center */
        /* The transparent circle grows as loading progresses */
        background: radial-gradient(
          circle at center,
          transparent 0%,
          transparent var(--aperture-size, 0%),
          rgba(20, 10, 30, 0.95) calc(var(--aperture-size, 0%) + 5%),
          rgba(10, 5, 20, 1) calc(var(--aperture-size, 0%) + 15%),
          rgb(5, 2, 10) 100%
        );

        --aperture-size: 0%;
      }

      .portal-aperture.visible {
        display: block;
        opacity: 1;
      }

      /* Subtle inner glow at the aperture edge */
      .portal-aperture::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(
          circle at center,
          transparent 0%,
          transparent calc(var(--aperture-size, 0%) - 2%),
          rgba(147, 51, 234, 0.3) var(--aperture-size, 0%),
          rgba(88, 28, 135, 0.2) calc(var(--aperture-size, 0%) + 3%),
          transparent calc(var(--aperture-size, 0%) + 8%)
        );
        pointer-events: none;
      }

      /* Progress text at bottom */
      .portal-aperture .progress-text {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.7);
        font-family: 'Segoe UI', sans-serif;
        font-size: 14px;
        text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
        transition: opacity 0.5s ease;
      }

      .portal-aperture.fading .progress-text {
        opacity: 0;
      }

      .portal-aperture.fading {
        display: block;
        opacity: 0;
        transition: opacity 0.8s ease;
      }
    `
    document.head.appendChild(style)

    container.innerHTML = `<div class="progress-text">Entering world...</div>`

    return container
  }

  show(message = 'Entering world...'): void {
    if (this.isVisible) return
    this.isVisible = true
    this.progress = 0
    this.container.style.setProperty('--aperture-size', '0%')
    this.container.classList.add('visible')
    this.container.classList.remove('fading')
    this.updateStatus(message)
  }

  hide(): void {
    if (!this.isVisible) return
    this.isVisible = false
    this.container.classList.remove('visible')
    this.container.classList.remove('fading')
  }

  /**
   * Update loading progress (0-100)
   * Aperture opens from center as progress increases
   */
  updateProgress(current: number, total: number): void {
    const percent = Math.min(100, Math.round((current / total) * 100))
    this.progress = percent

    // Aperture size: 0% at start, 60% at full load (screen diagonal is ~70%)
    // This means at 100% load, the aperture covers most of the screen
    const apertureSize = (percent / 100) * 65

    this.container.style.setProperty('--aperture-size', `${apertureSize}%`)
    this.updateStatus(`${percent}%`)

    // Start fading at 80%
    if (percent >= 80 && !this.container.classList.contains('fading')) {
      this.container.classList.add('fading')
    }
  }

  /**
   * Collapse/fade out the overlay
   */
  collapse(onComplete?: () => void): void {
    this.container.classList.add('fading')

    setTimeout(() => {
      this.hide()
      onComplete?.()
    }, 800)
  }

  private updateStatus(message: string): void {
    const text = this.container.querySelector('.progress-text')
    if (text) {
      text.textContent = message
    }
  }

  getIsVisible(): boolean {
    return this.isVisible
  }
}
