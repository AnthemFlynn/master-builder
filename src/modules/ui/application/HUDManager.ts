import { UIState } from '../domain/UIState'

export class HUDManager {
  private crosshair: HTMLDivElement
  private fpsDisplay: HTMLDivElement
  private bagDisplay: HTMLDivElement
  private lastFrameTime = performance.now()
  private fps = 60

  constructor() {
    // Create crosshair
    this.crosshair = document.createElement('div')
    this.crosshair.className = 'cross-hair hidden'
    this.crosshair.innerHTML = '+'
    document.body.appendChild(this.crosshair)

    // Create FPS display
    this.fpsDisplay = document.createElement('div')
    this.fpsDisplay.className = 'fps hidden'
    this.fpsDisplay.style.cssText = 'position: fixed; top: 10px; left: 10px; color: white; font-family: monospace; font-size: 14px; z-index: 1000;'
    document.body.appendChild(this.fpsDisplay)

    // Create bag/inventory display
    this.bagDisplay = document.createElement('div')
    this.bagDisplay.className = 'bag hidden'
    this.bagDisplay.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; z-index: 1000;'
    document.body.appendChild(this.bagDisplay)

    // Create inventory slots
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div')
      slot.className = 'bag-slot'
      slot.style.cssText = 'width: 50px; height: 50px; border: 2px solid #666; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white;'
      slot.textContent = String(i + 1)
      slot.dataset.index = String(i)
      this.bagDisplay.appendChild(slot)
    }

    // FPS will be updated by external call, not internal loop
    this.fpsDisplay.textContent = 'FPS: --'
  }

  updateFPS(): void {
    const now = performance.now()
    const delta = now - this.lastFrameTime
    this.lastFrameTime = now

    // Smooth FPS calculation
    this.fps = Math.round(1000 / delta)
    this.fpsDisplay.textContent = `FPS: ${this.fps}`
  }

  setSelectedSlot(index: number): void {
    // Highlight selected slot
    const slots = this.bagDisplay.querySelectorAll('.bag-slot')
    slots.forEach((slot, i) => {
      if (i === index) {
        (slot as HTMLElement).style.border = '2px solid yellow'
      } else {
        (slot as HTMLElement).style.border = '2px solid #666'
      }
    })
  }

  show(): void {
    this.crosshair.classList.remove('hidden')
    this.fpsDisplay?.classList.remove('hidden')
    this.bagDisplay?.classList.remove('hidden')
  }

  hide(): void {
    this.crosshair.classList.add('hidden')
    this.fpsDisplay?.classList.add('hidden')
    this.bagDisplay?.classList.add('hidden')
  }

  updateState(state: UIState): void {
    if (state === UIState.PLAYING) {
      this.show()
    } else {
      this.hide()
    }
  }
}
