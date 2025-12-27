// src/modules/ui/components/LoadingScreen.ts

/**
 * HUD-style loading progress bar - shown at bottom of screen during world generation
 * Player is already in-game and falling, can see world rendering around them
 */
export class LoadingScreen {
  private container: HTMLDivElement
  private progressFill: HTMLDivElement
  private statusText: HTMLDivElement
  private isVisible = false

  constructor() {
    this.container = this.createContainer()
    this.progressFill = this.container.querySelector('.hud-progress-fill')!
    this.statusText = this.container.querySelector('.hud-loading-status')!
    document.body.appendChild(this.container)
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div')
    container.className = 'hud-loading-bar'
    container.innerHTML = `
      <div class="hud-loading-content">
        <div class="hud-progress-bar">
          <div class="hud-progress-fill"></div>
        </div>
        <div class="hud-loading-status">Generating world...</div>
      </div>
    `

    const style = document.createElement('style')
    style.textContent = `
      .hud-loading-bar {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s ease;
      }

      .hud-loading-bar.visible {
        opacity: 1;
      }

      .hud-loading-bar.fading {
        opacity: 0;
        transition: opacity 1s ease;
      }

      .hud-loading-content {
        background: rgba(0, 0, 0, 0.7);
        border-radius: 8px;
        padding: 12px 24px;
        min-width: 300px;
        text-align: center;
      }

      .hud-progress-bar {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .hud-progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #4ade80, #22c55e);
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .hud-loading-status {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        font-family: 'Segoe UI', sans-serif;
      }
    `
    document.head.appendChild(style)

    return container
  }

  show(message = 'Generating world...'): void {
    if (this.isVisible) return
    this.isVisible = true
    this.container.classList.add('visible')
    this.container.classList.remove('fading')
    this.statusText.textContent = message
    this.progressFill.style.width = '0%'
  }

  hide(): void {
    if (!this.isVisible) return
    this.isVisible = false
    this.container.classList.remove('visible')
    this.container.classList.remove('fading')
  }

  /**
   * Start fading the progress bar (called around 70%)
   */
  startFade(): void {
    this.container.classList.add('fading')
  }

  updateProgress(current: number, total: number, phase = 'chunks'): void {
    const percent = Math.min(100, Math.round((current / total) * 100))
    this.progressFill.style.width = `${percent}%`
    this.statusText.textContent = `${percent}%`

    // Start fading at 70%
    if (percent >= 70 && !this.container.classList.contains('fading')) {
      this.startFade()
    }
  }

  setStatus(message: string): void {
    this.statusText.textContent = message
  }

  // Legacy methods for compatibility
  showClickToStart(_onStart: () => void): void {
    // Not used in HUD mode
  }

  getIsVisible(): boolean {
    return this.isVisible
  }
}
