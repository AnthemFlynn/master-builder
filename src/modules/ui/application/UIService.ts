import { EventBus } from '../../game/infrastructure/EventBus'
import { CommandBus } from '../../game/infrastructure/CommandBus'
import { UIState } from '../domain/UIState'
import { IUIQuery } from '../ports/IUIQuery'
import { HUDManager } from './HUDManager'
import { MenuManager } from './MenuManager'
import { RadialMenuManager } from './components/RadialMenuManager'
import { CreativeModalManager } from './components/CreativeModalManager'
import { SaveLoadModal } from '../components/SaveLoadModal'
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
}

export class UIService implements IUIQuery {
  private state: UIState = UIState.SPLASH
  private hudManager: HUDManager
  private menuManager: MenuManager
  private radialMenuManager: RadialMenuManager
  private creativeModalManager: CreativeModalManager
  private saveLoadModal: SaveLoadModal | null = null
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
        this.onPlay()
      },
      () => {
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

    this.debugOverlay = new DebugOverlay(performanceMonitor, options.getPlayerPosition)

    // Wire up the "Load Game" button (modal will be set later)
    this.setupSaveLoadButton()

    // Listen for mouse movements for the radial menu
    this.eventBus.on('input', 'InputMouseMoveEvent', (e: any) => {
        if (this.state === UIState.RADIAL_MENU) {
            this.radialMenuManager.updateMouse(e.x, e.y)
        }
    })

    // Start in menu state (HTML shows menu by default)
    this.setState(UIState.MENU)
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
}
