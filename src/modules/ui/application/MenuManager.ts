import { UIState } from '../domain/UIState'

interface MenuManagerOptions {
  requestPointerLock?: () => void
  exitPointerLock?: () => void
}

export class MenuManager {
  private mainMenuElement: HTMLElement | null
  private pauseMenuElement: HTMLElement | null
  private splashElement: HTMLElement | null
  private settingsElement: HTMLElement | null
  private featuresElement: HTMLElement | null

  constructor(
    private onPlay: () => void,
    private onResume: () => void,
    private onExit: () => void,
    private options: MenuManagerOptions = {}
  ) {
    this.mainMenuElement = document.querySelector('.main-menu')
    this.pauseMenuElement = document.querySelector('.pause-menu')
    this.splashElement = document.querySelector('#splash')
    this.settingsElement = document.querySelector('.settings')
    this.featuresElement = document.querySelector('.features')

    this.setupButtonListeners()
  }

  private setupButtonListeners(): void {
    // Splash screen click - transition to menu
    this.splashElement?.addEventListener('click', () => {
      console.log('MenuManager: Splash clicked, showing menu')
      this.showMainMenu()
    })

    // === Main Menu Buttons ===

    // Play button (New Game)
    const playButton = document.querySelector('#play')
    playButton?.addEventListener('click', () => {
      console.log('MenuManager: Play button clicked')
      this.onPlay()
    })

    // Load Game button (main menu)
    const loadButton = document.querySelector('#save')
    // Note: This is handled by UIService.setupSaveLoadButton()

    // Settings button (main menu)
    const settingButton = document.querySelector('#setting')
    settingButton?.addEventListener('click', () => {
      this.showSettings()
    })

    // Controls/Guide button
    const featureButton = document.querySelector('#feature')
    featureButton?.addEventListener('click', () => {
      this.showFeatures()
    })

    // === Pause Menu Buttons ===

    // Resume button
    const resumeButton = document.querySelector('#resume')
    resumeButton?.addEventListener('click', () => {
      console.log('MenuManager: Resume button clicked')
      this.onResume()
    })

    // Save Game button (pause menu)
    const pauseSaveButton = document.querySelector('#pause-save')
    // Note: This will be handled by UIService

    // Load Game button (pause menu)
    const pauseLoadButton = document.querySelector('#pause-load')
    // Note: This will be handled by UIService

    // Settings button (pause menu)
    const pauseSettingButton = document.querySelector('#pause-setting')
    pauseSettingButton?.addEventListener('click', () => {
      this.showSettings()
    })

    // Exit to Menu button
    const exitToMenuButton = document.querySelector('#exit-to-menu')
    exitToMenuButton?.addEventListener('click', () => {
      console.log('MenuManager: Exit to Menu clicked')
      this.options.exitPointerLock?.()
      this.onExit()
    })

    // === Settings/Features Back Buttons ===

    const settingBackButton = document.querySelector('#setting-back')
    settingBackButton?.addEventListener('click', () => {
      this.hideSettings()
    })

    const featureBackButton = document.querySelector('#back')
    featureBackButton?.addEventListener('click', () => {
      this.hideFeatures()
    })
  }

  // Track which menu to return to after settings/features
  private returnToMenu: 'main' | 'pause' = 'main'

  showSplash(): void {
    this.splashElement?.classList.remove('hidden')
    this.mainMenuElement?.classList.add('hidden')
    this.pauseMenuElement?.classList.add('hidden')
    this.settingsElement?.classList.add('hidden')
    this.featuresElement?.classList.add('hidden')
  }

  showMainMenu(): void {
    this.splashElement?.classList.add('hidden')
    this.mainMenuElement?.classList.remove('hidden')
    this.pauseMenuElement?.classList.add('hidden')
    this.settingsElement?.classList.add('hidden')
    this.featuresElement?.classList.add('hidden')
    this.returnToMenu = 'main'
  }

  showPauseMenu(): void {
    this.splashElement?.classList.add('hidden')
    this.mainMenuElement?.classList.add('hidden')
    this.pauseMenuElement?.classList.remove('hidden')
    this.settingsElement?.classList.add('hidden')
    this.featuresElement?.classList.add('hidden')
    this.returnToMenu = 'pause'
  }

  showSettings(): void {
    this.mainMenuElement?.classList.add('hidden')
    this.pauseMenuElement?.classList.add('hidden')
    this.settingsElement?.classList.remove('hidden')
    this.featuresElement?.classList.add('hidden')
  }

  hideSettings(): void {
    this.settingsElement?.classList.add('hidden')
    if (this.returnToMenu === 'pause') {
      this.pauseMenuElement?.classList.remove('hidden')
    } else {
      this.mainMenuElement?.classList.remove('hidden')
    }
  }

  showFeatures(): void {
    this.mainMenuElement?.classList.add('hidden')
    this.pauseMenuElement?.classList.add('hidden')
    this.featuresElement?.classList.remove('hidden')
    this.settingsElement?.classList.add('hidden')
  }

  hideFeatures(): void {
    this.featuresElement?.classList.add('hidden')
    if (this.returnToMenu === 'pause') {
      this.pauseMenuElement?.classList.remove('hidden')
    } else {
      this.mainMenuElement?.classList.remove('hidden')
    }
  }

  hideAll(): void {
    this.mainMenuElement?.classList.add('hidden')
    this.pauseMenuElement?.classList.add('hidden')
    this.splashElement?.classList.add('hidden')
    this.settingsElement?.classList.add('hidden')
    this.featuresElement?.classList.add('hidden')
  }

  updateState(state: UIState): void {
    switch (state) {
      case UIState.SPLASH:
        this.showSplash()
        break
      case UIState.MENU:
        this.showMainMenu()
        break
      case UIState.PLAYING:
        this.hideAll()
        break
      case UIState.PAUSE:
        this.showPauseMenu()
        break
    }
  }
}
