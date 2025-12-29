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
import { InventoryService } from '../../inventory/application/InventoryService'
import { InventoryBank } from '../../inventory/domain/InventoryState'
import { DebugOverlay } from './DebugOverlay'
import { PerformanceMonitor } from '../../game/infrastructure/PerformanceMonitor'
import { IPersistenceQuery } from '../../persistence/ports/IPersistenceQuery'
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
  private debugOverlay: DebugOverlay

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
      onSave: (slotId) => {
        this.options.onSaveGame?.(slotId)
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
  setPersistence(commandBus: CommandBus, persistenceQuery: IPersistenceQuery): void {
    this.saveLoadModal = new SaveLoadModal({
      onSave: async (slotId) => {
        commandBus.send(new SaveGameCommand(slotId, slotId, false))
      },
      onLoad: async (slotId) => {
        // DON'T lock pointer here - will be locked when user clicks "Enter World"
        // Browser releases pointer lock during DOM changes
        commandBus.send(new LoadGameCommand(slotId))
      },
      onClose: () => {
        // Return to previous state (menu or pause)
      },
      listSlots: () => persistenceQuery.listSaveSlots()
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
