// src/modules/ui/application/MenuUIManager.ts

import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ScreenManager } from './ScreenManager'
import { GameState } from '../../../shared/domain/GameState'
import { World, CreateWorldParams } from '../../persistence/domain/World'
import { WorldManager } from '../../persistence/application/WorldManager'

// Screen components
import {
  createSplashScreen,
  createMainMenuScreen,
  createWorldSelectScreen,
  createCreateWorldScreen,
  createPauseScreen,
  createLoadingScreen,
  createSettingsScreen,
  SplashScreenComponent,
  MainMenuScreenComponent,
  WorldSelectScreenComponent,
  CreateWorldScreenComponent,
  PauseScreenComponent,
  LoadingScreenComponent,
  SettingsScreenComponent
} from '../components/screens'
import { showDeleteConfirm } from '../components/base/ConfirmDialog'

import { QualityPreset, PostProcessingSettings } from '../components/screens'

/**
 * Callbacks for game actions
 */
export interface MenuUICallbacks {
  /** Start a new game with a world */
  onStartNewGame: (worldId: string) => void
  /** Resume from pause */
  onResume: () => void
  /** Save current game */
  onSave: (slotId: string) => Promise<void>
  /** Load a save slot */
  onLoad: (worldId: string, slotId: string) => void
  /** Exit to main menu */
  onExitToMenu: () => void
  /** Open save modal */
  onOpenSaveModal: () => void
  /** Settings changed */
  onRenderDistanceChange?: (value: number) => void
  onFovChange?: (value: number) => void
  onVolumeChange?: (value: number) => void
  onQualityPresetChange?: (value: QualityPreset) => void
  /** Post-processing setting changed */
  onPostProcessingChange?: (key: keyof PostProcessingSettings, value: number | boolean) => void
}

/**
 * MenuUIManager - Coordinates all menu screens
 *
 * Creates and manages screen components, handles navigation,
 * and communicates with the game via callbacks.
 */
export class MenuUIManager {
  private screenManager: ScreenManager
  private worldManager: WorldManager | null = null

  // Screen instances (lazy-created)
  private splashScreen: SplashScreenComponent | null = null
  private mainMenuScreen: MainMenuScreenComponent | null = null
  private worldSelectScreen: WorldSelectScreenComponent | null = null
  private createWorldScreen: CreateWorldScreenComponent | null = null
  private pauseScreen: PauseScreenComponent | null = null
  private loadingScreen: LoadingScreenComponent | null = null
  private settingsScreen: SettingsScreenComponent | null = null

  // Track which screen is currently visible
  private visibleScreen: GameState | null = null

  constructor(
    private eventBus: EventBus,
    private callbacks: MenuUICallbacks
  ) {
    this.screenManager = new ScreenManager(eventBus)

    // Listen for navigation events
    this.eventBus.on('ui', 'ScreenNavigationEvent', (event: any) => {
      this.onScreenChange(event.from, event.to, event.params)
    })
  }

  /**
   * Set WorldManager (called after initialization)
   */
  setWorldManager(worldManager: WorldManager): void {
    this.worldManager = worldManager
  }

  /**
   * Navigate to a screen
   */
  navigateTo(screen: GameState, params?: any): void {
    this.screenManager.navigateTo(screen, params)
  }

  /**
   * Go back to previous screen
   */
  goBack(): boolean {
    return this.screenManager.goBack()
  }

  /**
   * Get current screen
   */
  getCurrentScreen(): GameState {
    return this.screenManager.getCurrentScreen()
  }

  /**
   * Show splash screen (initial state)
   */
  showSplash(): void {
    this.screenManager.resetTo(GameState.SPLASH)
  }

  /**
   * Show main menu
   */
  showMainMenu(): void {
    this.screenManager.navigateTo(GameState.MAIN_MENU)
  }

  /**
   * Show pause screen
   */
  showPause(): void {
    this.screenManager.navigateTo(GameState.PAUSE)
  }

  /**
   * Show loading screen
   */
  showLoading(worldName = 'Loading...', message = 'Generating terrain...'): void {
    if (!this.loadingScreen) {
      this.loadingScreen = createLoadingScreen({ worldName, message })
    } else {
      this.loadingScreen.setWorldName(worldName)
      this.loadingScreen.setMessage(message)
    }
    this.screenManager.navigateTo(GameState.LOADING, { loadingMessage: message })
  }

  /**
   * Update loading progress
   */
  updateLoadingProgress(current: number, total: number, unit = 'chunks'): void {
    this.loadingScreen?.setProgress(current, total, unit)
  }

  /**
   * Hide loading with animation
   */
  collapseLoading(onComplete?: () => void): void {
    this.loadingScreen?.hideWithAnimation(() => {
      this.screenManager.navigateTo(GameState.PLAYING)
      onComplete?.()
    })
  }

  /**
   * Hide all screens (entering gameplay)
   */
  enterPlaying(): void {
    this.hideCurrentScreen()
    this.screenManager.resetTo(GameState.PLAYING)
    this.visibleScreen = null
  }

  // === Private Methods ===

  private onScreenChange(from: GameState, to: GameState, params?: any): void {
    // Hide previous screen
    this.hideScreen(from)

    // Show new screen
    this.showScreen(to, params)
  }

  private hideCurrentScreen(): void {
    if (this.visibleScreen) {
      this.hideScreen(this.visibleScreen)
    }
  }

  private hideScreen(screen: GameState): void {
    switch (screen) {
      case GameState.SPLASH:
        this.splashScreen?.hide()
        break
      case GameState.MAIN_MENU:
        this.mainMenuScreen?.hide()
        break
      case GameState.WORLD_SELECT:
        this.worldSelectScreen?.hide()
        break
      case GameState.CREATE_WORLD:
        this.createWorldScreen?.hide()
        break
      case GameState.PAUSE:
        this.pauseScreen?.hide()
        break
      case GameState.LOADING:
        this.loadingScreen?.hide()
        break
      case GameState.SETTINGS:
        this.settingsScreen?.hide()
        break
    }
  }

  private async showScreen(screen: GameState, params?: any): Promise<void> {
    this.visibleScreen = screen

    switch (screen) {
      case GameState.SPLASH:
        this.ensureSplashScreen().show()
        break

      case GameState.MAIN_MENU:
        const hasContinue = await this.checkHasContinue()
        this.ensureMainMenuScreen(hasContinue).show()
        break

      case GameState.WORLD_SELECT:
        const worlds = await this.loadWorlds()
        this.ensureWorldSelectScreen(worlds).show()
        break

      case GameState.CREATE_WORLD:
        this.ensureCreateWorldScreen().show()
        break

      case GameState.PAUSE:
        this.ensurePauseScreen().show()
        break

      case GameState.LOADING:
        this.ensureLoadingScreen(params?.loadingMessage).show()
        break

      case GameState.SETTINGS:
        this.ensureSettingsScreen().show()
        break

      case GameState.PLAYING:
        // No screen to show - game is active
        break
    }
  }

  private async checkHasContinue(): Promise<boolean> {
    if (!this.worldManager) return false
    const world = await this.worldManager.getMostRecentWorld()
    return world !== null
  }

  private async loadWorlds(): Promise<World[]> {
    if (!this.worldManager) return []
    return this.worldManager.listWorlds()
  }

  // === Screen Factory Methods ===

  private ensureSplashScreen(): SplashScreenComponent {
    if (!this.splashScreen) {
      this.splashScreen = createSplashScreen({
        onContinue: () => this.navigateTo(GameState.MAIN_MENU)
      })
    }
    return this.splashScreen
  }

  private ensureMainMenuScreen(hasContinue: boolean): MainMenuScreenComponent {
    if (!this.mainMenuScreen) {
      this.mainMenuScreen = createMainMenuScreen({
        hasContinue,
        onContinue: async () => {
          const world = await this.worldManager?.getMostRecentWorld()
          if (world) {
            this.callbacks.onStartNewGame(world.id)
          }
        },
        onNewGame: () => this.navigateTo(GameState.CREATE_WORLD),
        onWorlds: () => this.navigateTo(GameState.WORLD_SELECT),
        onSettings: () => {
          this.navigateTo(GameState.SETTINGS)
        }
      })
    } else {
      this.mainMenuScreen.setHasContinue(hasContinue)
    }
    return this.mainMenuScreen
  }

  private ensureWorldSelectScreen(worlds: World[]): WorldSelectScreenComponent {
    if (!this.worldSelectScreen) {
      this.worldSelectScreen = createWorldSelectScreen({
        worlds,
        onSelectWorld: (world) => {
          // TODO: Navigate to world detail
          console.log('Selected world:', world.name)
        },
        onPlayWorld: (world) => {
          this.callbacks.onStartNewGame(world.id)
        },
        onDeleteWorld: (world) => {
          // Show styled confirmation dialog
          showDeleteConfirm(world.name, async () => {
            if (this.worldManager) {
              await this.worldManager.deleteWorld(world.id)
              // Refresh the world list
              const updatedWorlds = await this.loadWorlds()
              this.worldSelectScreen?.setWorlds(updatedWorlds)
            }
          })
        },
        onCreateWorld: () => this.navigateTo(GameState.CREATE_WORLD),
        onBack: () => this.goBack()
      })
    } else {
      this.worldSelectScreen.setWorlds(worlds)
    }
    return this.worldSelectScreen
  }

  private ensureCreateWorldScreen(): CreateWorldScreenComponent {
    if (!this.createWorldScreen) {
      this.createWorldScreen = createCreateWorldScreen({
        onCreate: async (params: CreateWorldParams) => {
          if (!this.worldManager) {
            console.error('[MenuUIManager] No WorldManager available!')
            return
          }

          const world = await this.worldManager.createWorld(params)
          this.callbacks.onStartNewGame(world.id)
        },
        onCancel: () => this.goBack()
      })
    }
    return this.createWorldScreen
  }

  private ensurePauseScreen(): PauseScreenComponent {
    if (!this.pauseScreen) {
      this.pauseScreen = createPauseScreen({
        onResume: () => {
          this.enterPlaying()
          this.callbacks.onResume()
        },
        onSave: () => {
          // Open save modal for user to choose slot
          this.callbacks.onOpenSaveModal()
        },
        onSettings: () => {
          this.navigateTo(GameState.SETTINGS)
        },
        onExitToMenu: async () => {
          // Save to autosave before exiting
          await this.callbacks.onSave('autosave')
          // Then exit - SessionStateChangedEvent handler will show main menu
          this.callbacks.onExitToMenu()
        }
      })
    }
    return this.pauseScreen
  }

  private ensureLoadingScreen(message?: string): LoadingScreenComponent {
    if (!this.loadingScreen) {
      this.loadingScreen = createLoadingScreen({
        message: message || 'Generating terrain...'
      })
    } else if (message) {
      this.loadingScreen.setMessage(message)
    }
    return this.loadingScreen
  }

  private ensureSettingsScreen(): SettingsScreenComponent {
    if (!this.settingsScreen) {
      this.settingsScreen = createSettingsScreen({
        renderDistance: 4,
        fov: 50,
        volume: 0.5,
        qualityPreset: 'high',
        postProcessing: {
          enabled: true,
          bloomStrength: 0.15,
          bloomThreshold: 0.9,
          ssaoEnabled: true,
          ssaoIntensity: 8,
          volumetricEnabled: false,  // Keep disabled - causes instability
          volumetricExposure: 0.02,
          saturation: 1.05,
          contrast: 1.02,
          brightness: 1.0
        },
        onRenderDistanceChange: (value) => {
          this.callbacks.onRenderDistanceChange?.(value)
        },
        onFovChange: (value) => {
          this.callbacks.onFovChange?.(value)
        },
        onVolumeChange: (value) => {
          this.callbacks.onVolumeChange?.(value)
        },
        onQualityPresetChange: (value) => {
          this.callbacks.onQualityPresetChange?.(value)
        },
        onPostProcessingChange: (key, value) => {
          this.callbacks.onPostProcessingChange?.(key, value)
        },
        onBack: () => this.goBack()
      })
    }
    return this.settingsScreen
  }

  /**
   * Clean up all screens
   */
  destroy(): void {
    this.splashScreen?.destroy()
    this.mainMenuScreen?.destroy()
    this.worldSelectScreen?.destroy()
    this.createWorldScreen?.destroy()
    this.pauseScreen?.destroy()
    this.loadingScreen?.destroy()
    this.settingsScreen?.destroy()
  }
}
