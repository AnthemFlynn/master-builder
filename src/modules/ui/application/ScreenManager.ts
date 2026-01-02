// src/modules/ui/application/ScreenManager.ts

import { EventBus } from '../../../shared/infrastructure/EventBus'
import { GameState, ScreenParams } from '../../../shared/domain/GameState'

/**
 * Screen navigation event
 */
export interface ScreenNavigationEvent {
  type: 'ScreenNavigationEvent'
  timestamp: number
  from: GameState
  to: GameState
  params?: ScreenParams
}

/**
 * ScreenManager - Handles menu screen navigation
 *
 * Maintains a navigation stack for back navigation.
 * Emits events when screens change.
 */
export class ScreenManager {
  private currentScreen: GameState = GameState.SPLASH
  private screenStack: Array<{ screen: GameState; params?: ScreenParams }> = []
  private currentParams?: ScreenParams

  constructor(private eventBus: EventBus) {}

  /**
   * Get current screen
   */
  getCurrentScreen(): GameState {
    return this.currentScreen
  }

  /**
   * Get current screen parameters
   */
  getCurrentParams(): ScreenParams | undefined {
    return this.currentParams
  }

  /**
   * Navigate to a new screen
   * Pushes current screen to stack for back navigation
   */
  navigateTo(screen: GameState, params?: ScreenParams): void {
    const from = this.currentScreen

    // Don't push to stack if navigating to same screen
    if (screen !== from) {
      // Don't push PLAYING or LOADING to navigation stack
      if (from !== GameState.PLAYING && from !== GameState.LOADING) {
        this.screenStack.push({ screen: from, params: this.currentParams })
      }
    }

    this.currentScreen = screen
    this.currentParams = params

    this.emitNavigation(from, screen, params)
  }

  /**
   * Navigate back to previous screen
   * Returns false if at root (can't go back)
   */
  goBack(): boolean {
    if (this.screenStack.length === 0) {
      return false
    }

    const previous = this.screenStack.pop()!
    const from = this.currentScreen

    this.currentScreen = previous.screen
    this.currentParams = previous.params

    this.emitNavigation(from, previous.screen, previous.params)
    return true
  }

  /**
   * Clear navigation stack and go to a screen
   * Used for major transitions (exit to menu, start game)
   */
  resetTo(screen: GameState, params?: ScreenParams): void {
    const from = this.currentScreen

    this.screenStack = []
    this.currentScreen = screen
    this.currentParams = params

    this.emitNavigation(from, screen, params)
  }

  /**
   * Check if back navigation is available
   */
  canGoBack(): boolean {
    return this.screenStack.length > 0
  }

  /**
   * Get navigation stack depth
   */
  getStackDepth(): number {
    return this.screenStack.length
  }

  /**
   * Check if currently on a specific screen
   */
  isOn(screen: GameState): boolean {
    return this.currentScreen === screen
  }

  /**
   * Check if currently showing any menu (not playing or loading)
   */
  isInMenu(): boolean {
    return this.currentScreen !== GameState.PLAYING &&
           this.currentScreen !== GameState.LOADING
  }

  private emitNavigation(from: GameState, to: GameState, params?: ScreenParams): void {
    this.eventBus.emit('ui', {
      type: 'ScreenNavigationEvent',
      timestamp: Date.now(),
      from,
      to,
      params
    } as ScreenNavigationEvent)

    console.log(`[ScreenManager] ${from} -> ${to}`, params || '')
  }
}
