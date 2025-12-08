import { UIState } from '../domain/UIState'

interface MenuManagerOptions {
  requestPointerLock?: () => void
  exitPointerLock?: () => void
}

export class MenuManager {
  private menuElement: HTMLElement | null
  private splashElement: HTMLElement | null

  constructor(
    private onPlay: () => void,
    private onResume: () => void,
    private onExit: () => void,
    private options: MenuManagerOptions = {}
  ) {
    this.menuElement = document.querySelector('.menu')
    this.splashElement = document.querySelector('#splash')

    this.setupButtonListeners()
  }

  private setupButtonListeners(): void {
    // Play button - matches HTML id="play"
    const playButton = document.querySelector('#play')
    playButton?.addEventListener('click', () => {
      this.options.requestPointerLock?.()
      this.onPlay()
    })

    // Exit button - matches HTML id="exit"
    const exitButton = document.querySelector('#exit')
    exitButton?.addEventListener('click', () => {
      this.options.exitPointerLock?.()
      this.onExit()
    })

    // Note: No resume button in current HTML - pause functionality handled by pointer lock
  }

  showSplash(): void {
    this.splashElement?.classList.remove('hidden')
    this.menuElement?.classList.add('hidden')
  }

  showMenu(): void {
    this.menuElement?.classList.remove('hidden')
    this.splashElement?.classList.add('hidden')
  }

  hideAll(): void {
    this.menuElement?.classList.add('hidden')
    this.splashElement?.classList.add('hidden')
  }

  updateState(state: UIState): void {
    switch (state) {
      case UIState.SPLASH:
        this.showSplash()
        break
      case UIState.MENU:
        this.showMenu()
        break
      case UIState.PLAYING:
        this.hideAll()
        break
      case UIState.PAUSE:
        this.showMenu()
        break
    }
  }
}
