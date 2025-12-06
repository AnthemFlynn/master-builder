import { EventBus } from '../../game/infrastructure/EventBus'
import { UIState } from '../domain/UIState'
import { IUIQuery } from '../ports/IUIQuery'
import { HUDManager } from './HUDManager'
import { MenuManager } from './MenuManager'

export class UIService implements IUIQuery {
  private state: UIState = UIState.SPLASH
  private hudManager: HUDManager
  private menuManager: MenuManager

  constructor(private eventBus: EventBus) {
    this.hudManager = new HUDManager()
    this.menuManager = new MenuManager()

    // Start in splash state
    this.setState(UIState.SPLASH)
  }

  setState(newState: UIState): void {
    const oldState = this.state
    this.state = newState

    // Update UI components
    this.hudManager.updateState(newState)
    this.menuManager.updateState(newState)

    // Emit event
    this.eventBus.emit('ui', {
      type: 'UIStateChangedEvent',
      timestamp: Date.now(),
      oldState,
      newState
    })

    console.log(`🎮 UI State: ${oldState} → ${newState}`)
  }

  getState(): UIState {
    return this.state
  }

  isPlaying(): boolean {
    return this.state === UIState.PLAYING
  }

  isPaused(): boolean {
    return this.state === UIState.PAUSE
  }

  // State transition methods
  onPlay(): void {
    this.setState(UIState.PLAYING)
  }

  onPause(): void {
    this.setState(UIState.PAUSE)
  }

  onMenu(): void {
    this.setState(UIState.MENU)
  }

  onSplash(): void {
    this.setState(UIState.SPLASH)
  }
}
