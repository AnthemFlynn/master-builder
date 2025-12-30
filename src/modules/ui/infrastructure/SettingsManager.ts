/**
 * Manages the Settings modal visibility and interactions
 */
export class SettingsManager {
  private settingsElement: HTMLElement | null
  private menuElement: HTMLElement | null
  private featuresElement: HTMLElement | null

  constructor() {
    this.settingsElement = document.querySelector('.settings')
    this.menuElement = document.querySelector('.menu')
    this.featuresElement = document.querySelector('.features')

    this.setupButtonListeners()
  }

  private setupButtonListeners(): void {
    // Settings button - show settings modal
    const settingButton = document.querySelector('#setting')
    settingButton?.addEventListener('click', () => {
      this.showSettings()
    })

    // Setting back button - hide settings modal
    const settingBackButton = document.querySelector('#setting-back')
    settingBackButton?.addEventListener('click', () => {
      this.hideSettings()
    })

    // Features/Guide button - show features modal
    const featureButton = document.querySelector('#feature')
    featureButton?.addEventListener('click', () => {
      this.showFeatures()
    })

    // Back button in features - hide features modal
    const backButton = document.querySelector('#back')
    backButton?.addEventListener('click', () => {
      this.hideFeatures()
    })

    // Save button - show load game modal (handled elsewhere, but we can add handler if needed)
    const saveButton = document.querySelector('#save')
    saveButton?.addEventListener('click', () => {
      // Load game functionality - this would trigger the load modal
      console.log('Load Game button clicked')
    })
  }

  private showSettings(): void {
    this.menuElement?.classList.add('hidden')
    this.settingsElement?.classList.remove('hidden')
  }

  private hideSettings(): void {
    this.settingsElement?.classList.add('hidden')
    this.menuElement?.classList.remove('hidden')
  }

  private showFeatures(): void {
    this.menuElement?.classList.add('hidden')
    this.featuresElement?.classList.remove('hidden')
  }

  private hideFeatures(): void {
    this.featuresElement?.classList.add('hidden')
    this.menuElement?.classList.remove('hidden')
  }
}
