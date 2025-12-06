import { UIState } from '../domain/UIState'

export class MenuManager {
  private menuElement: HTMLElement | null
  private splashElement: HTMLElement | null

  constructor() {
    this.menuElement = document.querySelector('.menu')
    this.splashElement = document.querySelector('#splash')
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
