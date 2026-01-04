import { EventBus } from '../../../shared/infrastructure/EventBus'
import { CommandBus } from '../../../shared/infrastructure/CommandBus'
import { GameState } from '../../../shared/domain/GameState'
import { IUIQuery } from '../ports/IUIQuery'
import { HUDManager } from './HUDManager'
import { MenuUIManager, MenuUICallbacks } from './MenuUIManager'
import { RadialMenuManager } from '../components/RadialMenuManager'
import { CreativeModalManager } from '../components/CreativeModalManager'
import { SaveLoadModal } from '../components/SaveLoadModal'
import { PortalOverlay } from '../components/PortalOverlay'
import { ControlHints } from '../components/ControlHints'
import { InventoryService } from '../../inventory/application/InventoryService'
import { InventoryBank } from '../../inventory/domain/InventoryState'
import { DebugOverlay } from './DebugOverlay'
import { PerformanceMonitor } from '../../game/infrastructure/PerformanceMonitor'
import { IPersistenceQuery } from '../../persistence/ports/IPersistenceQuery'
import { PersistenceService } from '../../persistence/application/PersistenceService'
import { WorldManager } from '../../persistence/application/WorldManager'
import { SaveGameCommand } from '../../persistence/domain/commands/SaveGameCommand'
import { LoadGameCommand } from '../../persistence/domain/commands/LoadGameCommand'

interface Position {
  x: number
  y: number
  z: number
}

export interface UIServiceOptions {
  requestPointerLock?: () => void
  exitPointerLock?: () => void
  getPlayerPosition?: () => Position
  onStartNewGame?: (worldId?: string) => void  // Called when Play button clicked (triggers loading)
  onResumeGame?: () => void    // Called when Resume button clicked (no loading, preserves chunks)
  onExitToMenu?: () => void    // Called when Exit to Menu clicked (ends session)
  onSaveGame?: (slotId: string) => void  // Called when save requested
  onLoadGame?: (worldId: string, slotId: string) => void  // Called when load requested
}

export class UIService implements IUIQuery {
  private state: GameState = GameState.SPLASH
  private hudManager: HUDManager
  private menuUIManager: MenuUIManager
  private radialMenuManager: RadialMenuManager
  private creativeModalManager: CreativeModalManager
  private saveLoadModal: SaveLoadModal | null = null
  private portalOverlay: PortalOverlay
  private controlHints: ControlHints
  private debugOverlay: DebugOverlay
  private commandBus: CommandBus | null = null
  private hasShownHints = false  // Track if hints were shown this session

  constructor(
    private eventBus: EventBus,
    private options: UIServiceOptions = {},
    private inventory: InventoryService,
    performanceMonitor: PerformanceMonitor
  ) {
    this.hudManager = new HUDManager()
    // Initialize hotbar with current inventory
    this.hudManager.updateHotbar(this.inventory.getActiveBank())

    // Initialize component-based menu system
    const callbacks: MenuUICallbacks = {
      onStartNewGame: (worldId) => {
        if (this.options.onStartNewGame) {
          this.options.onStartNewGame(worldId)
        } else {
          this.onPlay()
        }
      },
      onResume: () => {
        if (this.options.onResumeGame) {
          this.options.onResumeGame()
        } else {
          this.onPlay()
        }
      },
      onSave: async (slotId) => {
        // Use CommandBus directly for saves (more reliable than options callback)
        if (this.commandBus) {
          this.commandBus.send(new SaveGameCommand(slotId, slotId, false))
        } else {
          // Fallback to options callback if commandBus not yet set
          this.options.onSaveGame?.(slotId)
        }
      },
      onLoad: (worldId, slotId) => {
        this.options.onLoadGame?.(worldId, slotId)
      },
      onExitToMenu: () => {
        if (this.options.onExitToMenu) {
          this.options.onExitToMenu()
        } else {
          this.options.exitPointerLock?.()
          this.onMenu()
        }
      },
      onOpenSaveModal: () => {
        this.openSaveLoadModal('save')
      }
    }
    this.menuUIManager = new MenuUIManager(eventBus, callbacks)

    // Hide old HTML menu elements (legacy system)
    this.hideOldMenuElements()

    this.radialMenuManager = new RadialMenuManager(inventory)
    this.creativeModalManager = new CreativeModalManager(inventory, () => {
        // When modal closes itself, return to playing
        this.onPlay()
    })

    this.portalOverlay = new PortalOverlay()
    this.controlHints = new ControlHints({ autoHideMs: 10000 })
    this.debugOverlay = new DebugOverlay(performanceMonitor, options.getPlayerPosition)

    // Wire up the "Load Game" button (modal will be set later)
    this.setupSaveLoadButton()

    // Listen for mouse movements for the radial menu
    this.eventBus.on('input', 'InputMouseMoveEvent', (e: any) => {
        if (this.state === GameState.RADIAL_MENU) {
            this.radialMenuManager.updateMouse(e.x, e.y)
        }
    })

    // Start in splash state (HTML shows splash by default)
    this.setState(GameState.SPLASH)
  }

  private setupSaveLoadButton(): void {
    // Main menu: Load Game button
    const loadButton = document.querySelector('#save')
    loadButton?.addEventListener('click', () => {
      this.openSaveLoadModal('load')
    })

    // Pause menu: Save Game button
    const pauseSaveButton = document.querySelector('#pause-save')
    pauseSaveButton?.addEventListener('click', () => {
      this.openSaveLoadModal('save')
    })

    // Pause menu: Load Game button
    const pauseLoadButton = document.querySelector('#pause-load')
    pauseLoadButton?.addEventListener('click', () => {
      this.openSaveLoadModal('load')
    })
  }

  openSaveLoadModal(mode: 'save' | 'load' = 'load'): void {
    if (this.saveLoadModal) {
      this.saveLoadModal.open(mode)
    }
  }

  /**
   * Set up persistence for save/load modal (called after persistence is initialized)
   */
  setPersistence(commandBus: CommandBus, persistenceService: PersistenceService): void {
    this.commandBus = commandBus
    this.saveLoadModal = new SaveLoadModal({
      onSave: async (slotId) => {
        commandBus.send(new SaveGameCommand(slotId, slotId, false))
      },
      onLoad: async (slotId) => {
        // DON'T lock pointer here - will be locked when user clicks "Enter World"
        // Browser releases pointer lock during DOM changes
        commandBus.send(new LoadGameCommand(slotId))
      },
      onDelete: async (slotId) => {
        await persistenceService.deleteSaveSlot(slotId)
        console.log(`[UIService] Deleted save slot: ${slotId}`)
      },
      onClose: () => {
        // Return to previous state (menu or pause)
      },
      listSlots: () => persistenceService.listSaveSlots()
    })
  }

  setState(newState: GameState): void {
    const oldState = this.state
    this.state = newState

    // Update UI components
    this.hudManager.updateState(newState)
    this.updateMenuUIManager(newState)

    // Radial Menu Control
    if (newState === GameState.RADIAL_MENU) {
        this.radialMenuManager.show()
    } else {
        this.radialMenuManager.hide()
    }

    // Creative Modal Control
    if (newState === GameState.CREATIVE_INVENTORY) {
        this.creativeModalManager.show()
    } else {
        this.creativeModalManager.hide()
    }

    // Control Hints - show once when first entering game
    if (newState === GameState.PLAYING && !this.hasShownHints) {
        // Delay slightly to let the game fully load
        setTimeout(() => {
          this.controlHints.show()
        }, 1000)
        this.hasShownHints = true
    } else if (newState !== GameState.PLAYING) {
        this.controlHints.hide()
    }

    // Emit event
    this.eventBus.emit('ui', {
      type: 'UIStateChangedEvent',
      timestamp: Date.now(),
      oldState,
      newState
    })

    console.log(`🎮 UI State: ${oldState} → ${newState}`)
  }

  // ... (rest of the file)

  getState(): GameState {
    return this.state
  }

  isPlaying(): boolean {
    return this.state === GameState.PLAYING
  }

  isPaused(): boolean {
    return this.state === GameState.PAUSE
  }

  // State transition methods
  onPlay(): void {
    this.setState(GameState.PLAYING)
  }

  onPause(): void {
    this.setState(GameState.PAUSE)
  }

  onMenu(): void {
    this.setState(GameState.MAIN_MENU)
  }

  onSplash(): void {
    this.setState(GameState.SPLASH)
  }

  setSelectedSlot(index: number): void {
    this.hudManager.setSelectedSlot(index)
  }

  updateHotbar(bank: InventoryBank): void {
    this.hudManager.updateHotbar(bank)
  }

  updateFPS(): void {
    this.hudManager.updateFPS()
  }

  update(): void {
    this.debugOverlay.update()
  }

  // Portal Overlay Methods
  showLoading(message = 'Entering World...'): void {
    this.portalOverlay.show(message)
  }

  hideLoading(): void {
    this.portalOverlay.hide()
  }

  /**
   * Collapse the portal with animation, then call callback
   */
  collapsePortal(onComplete?: () => void): void {
    this.portalOverlay.collapse(onComplete)
  }

  updateLoadingProgress(current: number, total: number, _phase = 'chunks'): void {
    this.portalOverlay.updateProgress(current, total)
  }

  isLoading(): boolean {
    return this.portalOverlay.getIsVisible()
  }

  // === Menu System Methods ===

  /**
   * Set WorldManager for menu system
   */
  setWorldManager(worldManager: WorldManager): void {
    this.menuUIManager.setWorldManager(worldManager)
  }

  /**
   * Set PostProcessingService for graphics settings
   * Wires up settings callbacks to the post-processing service
   */
  setPostProcessingService(postProcessingService: {
    setQualityPreset: (preset: 'ultra' | 'high' | 'medium' | 'low') => void
    setEnabled: (enabled: boolean) => void
    setBloomStrength: (strength: number) => void
    setBloomThreshold: (threshold: number) => void
    setSSAOEnabled: (enabled: boolean) => void
    setSSAOIntensity: (intensity: number) => void
    setVolumetricEnabled: (enabled: boolean) => void
    setVolumetricExposure: (exposure: number) => void
    setSaturation: (saturation: number) => void
    setContrast: (contrast: number) => void
    setBrightness: (brightness: number) => void
  }): void {
    // Update MenuUIManager callbacks to wire to PostProcessingService
    const manager = this.menuUIManager as any
    if (manager.callbacks) {
      manager.callbacks.onQualityPresetChange = (value: 'ultra' | 'high' | 'medium' | 'low') => {
        postProcessingService.setQualityPreset(value)
      }
      manager.callbacks.onPostProcessingChange = (key: string, value: number | boolean) => {
        switch (key) {
          case 'enabled':
            postProcessingService.setEnabled(value as boolean)
            break
          case 'bloomStrength':
            postProcessingService.setBloomStrength(value as number)
            break
          case 'bloomThreshold':
            postProcessingService.setBloomThreshold(value as number)
            break
          case 'ssaoEnabled':
            postProcessingService.setSSAOEnabled(value as boolean)
            break
          case 'ssaoIntensity':
            postProcessingService.setSSAOIntensity(value as number)
            break
          case 'volumetricEnabled':
            postProcessingService.setVolumetricEnabled(value as boolean)
            break
          case 'volumetricExposure':
            postProcessingService.setVolumetricExposure(value as number)
            break
          case 'saturation':
            postProcessingService.setSaturation(value as number)
            break
          case 'contrast':
            postProcessingService.setContrast(value as number)
            break
          case 'brightness':
            postProcessingService.setBrightness(value as number)
            break
        }
        console.log(`🎨 Post-processing: ${key} = ${value}`)
      }
    }
    console.log('✅ Graphics settings wired to PostProcessingService')
  }

  /**
   * Get MenuUIManager (for direct access when needed)
   */
  getMenuUIManager(): MenuUIManager {
    return this.menuUIManager
  }

  /**
   * Map GameState to menu screens
   */
  private updateMenuUIManager(state: GameState): void {
    switch (state) {
      case GameState.SPLASH:
        this.menuUIManager.showSplash()
        break
      case GameState.MAIN_MENU:
        this.menuUIManager.showMainMenu()
        break
      case GameState.PLAYING:
        this.menuUIManager.enterPlaying()
        break
      case GameState.PAUSE:
        this.menuUIManager.showPause()
        break
      // Other states (RADIAL_MENU, CREATIVE_INVENTORY) don't affect menu screens
    }
  }

  /**
   * Hide old HTML menu elements when new menu system is active
   */
  private hideOldMenuElements(): void {
    const selectors = [
      '#splash',
      '.main-menu',
      '.pause-menu',
      '.features',
      '.settings'
    ]

    selectors.forEach(selector => {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        element.style.display = 'none'
      }
    })
  }
}
