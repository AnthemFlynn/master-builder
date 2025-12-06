import { UIState } from '../domain/UIState'

export class MenuManager {
  private menuElement: HTMLElement | null
  private splashElement: HTMLElement | null

  constructor(
    private onPlay: () => void,
    private onResume: () => void,
    private onExit: () => void
  ) {
    this.menuElement = document.querySelector('.menu')
    this.splashElement = document.querySelector('#splash')

    this.setupButtonListeners()
  }

  private setupButtonListeners(): void {
    // Play button (on splash and menu)
    const playButton = document.querySelector('#play-button')
    playButton?.addEventListener('click', () => {
      document.body.requestPointerLock()
      this.onPlay()
    })

    // Resume button (pause menu)
    const resumeButton = document.querySelector('#resume-button')
    resumeButton?.addEventListener('click', () => {
      document.body.requestPointerLock()
      this.onResume()
    })

    // Exit button (pause menu)
    const exitButton = document.querySelector('#exit-button')
    exitButton?.addEventListener('click', () => {
      this.onExit()
    })

    // Splash screen - any click to go to menu
    this.splashElement?.addEventListener('click', () => {
      this.showMenu()
    })
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
