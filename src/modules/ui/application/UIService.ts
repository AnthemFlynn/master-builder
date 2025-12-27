import { EventBus } from '../../game/infrastructure/EventBus'
import { CommandBus } from '../../game/infrastructure/CommandBus'
import { UIState } from '../domain/UIState'
import { IUIQuery } from '../ports/IUIQuery'
import { HUDManager } from './HUDManager'
import { MenuManager } from './MenuManager'
import { RadialMenuManager } from './components/RadialMenuManager'
import { CreativeModalManager } from './components/CreativeModalManager'
import { SaveLoadModal } from '../components/SaveLoadModal'
import { PortalOverlay } from '../components/PortalOverlay'
import { InventoryService } from '../../inventory/application/InventoryService'
import { InventoryBank } from '../../inventory/domain/InventoryState'
import { DebugOverlay } from './DebugOverlay'
import { PerformanceMonitor } from '../../game/infrastructure/PerformanceMonitor'
import { IPersistenceQuery } from '../../persistence/ports/IPersistenceQuery'
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
  onStartNewGame?: () => void  // Called when Play button clicked (triggers loading)
}

export class UIService implements IUIQuery {
  private state: UIState = UIState.SPLASH
  private hudManager: HUDManager
  private menuManager: MenuManager
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

    this.menuManager = new MenuManager(
      () => {
        // Play button - start new game with loading screen
        if (this.options.onStartNewGame) {
          this.options.onStartNewGame()
        } else {
          this.onPlay() // Fallback if no callback provided
        }
      },
      () => {
        // Resume - no loading needed, chunks already exist
        this.onPlay()
      },
      () => {
        this.options.exitPointerLock?.()
        this.onMenu()
      },
      {
        requestPointerLock: this.options.requestPointerLock,
        exitPointerLock: this.options.exitPointerLock
      }
    )

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
        if (this.state === UIState.RADIAL_MENU) {
            this.radialMenuManager.updateMouse(e.x, e.y)
        }
    })

    // Start in splash state (HTML shows splash by default)
    this.setState(UIState.SPLASH)
  }

  private setupSaveLoadButton(): void {
    const saveButton = document.querySelector('#save')
    saveButton?.addEventListener('click', () => {
      this.openSaveLoadModal()
    })
  }

  openSaveLoadModal(): void {
    if (this.saveLoadModal) {
      this.saveLoadModal.open()
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

  setState(newState: UIState): void {
    const oldState = this.state
    this.state = newState

    // Update UI components
    this.hudManager.updateState(newState)
    this.menuManager.updateState(newState)

    // Radial Menu Control
    if (newState === UIState.RADIAL_MENU) {
        this.radialMenuManager.show()
    } else {
        this.radialMenuManager.hide()
    }

    // Creative Modal Control
    if (newState === UIState.CREATIVE_INVENTORY) {
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
}
