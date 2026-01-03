import { GameState } from '../../../shared/domain/GameState'

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
    // Splash screen click - transition to menu
    this.splashElement?.addEventListener('click', () => {
      console.log('MenuManager: Splash clicked, showing menu')
      this.showMenu()
    })

    // Play button - matches HTML id="play"
    const playButton = document.querySelector('#play')
    playButton?.addEventListener('click', () => {
      console.log('MenuManager: Play button clicked')
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
    this.splashElement?.classList.add('hidden')
    this.menuElement?.classList.remove('hidden')
  }

  hideAll(): void {
    this.menuElement?.classList.add('hidden')
    this.splashElement?.classList.add('hidden')
  }

  updateState(state: GameState): void {
    switch (state) {
      case GameState.SPLASH:
        this.showSplash()
        break
      case GameState.MAIN_MENU:
        this.showMenu()
        break
      case GameState.PLAYING:
        this.hideAll()
        break
      case GameState.PAUSE:
        this.showMenu()
        break
    }
  }
}
