import { UIState } from '../domain/UIState'

export class HUDManager {
  private crosshair: HTMLDivElement
  private fpsDisplay: HTMLDivElement
  private bagDisplay: HTMLDivElement

  constructor() {
    // Create crosshair
    this.crosshair = document.createElement('div')
    this.crosshair.className = 'cross-hair hidden'
    this.crosshair.innerHTML = '+'
    document.body.appendChild(this.crosshair)

    // FPS display (created by FPS class)
    this.fpsDisplay = document.querySelector('.fps') as HTMLDivElement

    // Bag display (created by Bag class)
    this.bagDisplay = document.querySelector('.bag') as HTMLDivElement
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
