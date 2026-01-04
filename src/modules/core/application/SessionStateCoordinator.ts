// src/modules/core/application/SessionStateCoordinator.ts
/**
 * SessionStateCoordinator - Coordinates state synchronization between services
 *
 * Extracted from GameOrchestrator to centralize state synchronization logic.
 * Handles UI state → Input state → Session state → Pointer lock coordination.
 */
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { InputService } from '../../input/application/InputService'
import { UIService } from '../../ui/application/UIService'
import { SessionManager } from '../../persistence/application/SessionManager'
import { GameState } from '../../../shared/domain/GameState'
import { SessionState } from '../../ui/domain/Session'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'

export interface SessionStateCoordinatorDependencies {
  uiService: UIService
  inputService: InputService
  sessionManager: SessionManager
  cameraControls: PointerLockControls
  eventBus: EventBus
  isLoading: () => boolean
  getIgnoreUnlockUntil: () => number
}

export class SessionStateCoordinator {
  private uiService: UIService
  private inputService: InputService
  private sessionManager: SessionManager
  private cameraControls: PointerLockControls
  private eventBus: EventBus
  private isLoading: () => boolean
  private getIgnoreUnlockUntil: () => number

  constructor(deps: SessionStateCoordinatorDependencies) {
    this.uiService = deps.uiService
    this.inputService = deps.inputService
    this.sessionManager = deps.sessionManager
    this.cameraControls = deps.cameraControls
    this.eventBus = deps.eventBus
    this.isLoading = deps.isLoading
    this.getIgnoreUnlockUntil = deps.getIgnoreUnlockUntil
  }

  /**
   * Initialize all state coordination - call from orchestrator constructor
   */
  initialize(): void {
    this.setupUIStateSync()
    this.setupSessionListeners()
    this.setupPointerLockListeners()
  }

  /**
   * Keep input service state in sync with UI state
   */
  private setupUIStateSync(): void {
    this.eventBus.on('ui', 'UIStateChangedEvent', (event: any) => {
      const stateMap: Record<string, GameState> = {
        SPLASH: GameState.SPLASH,
        MAIN_MENU: GameState.MAIN_MENU,
        PLAYING: GameState.PLAYING,
        PAUSE: GameState.PAUSE,
        RADIAL_MENU: GameState.RADIAL_MENU,
        CREATIVE_INVENTORY: GameState.CREATIVE_INVENTORY
      }
      const mapped = stateMap[event.newState]
      if (mapped) {
        this.inputService.setState(mapped)
      }

      // Manage pointer lock based on state
      if (event.newState === GameState.PLAYING) {
        if (!document.pointerLockElement) {
          this.cameraControls.lock()
        }
      } else if (event.newState !== GameState.RADIAL_MENU && event.newState !== GameState.CREATIVE_INVENTORY) {
        this.cameraControls.unlock()
      }
    })
  }

  /**
   * Listen for session state changes - sync both UI and Input services
   * This is the SINGLE SOURCE OF TRUTH for state synchronization
   */
  private setupSessionListeners(): void {
    // Listen for block changes to mark unsaved
    this.eventBus.on('world', 'BlockPlacedEvent', () => {
      this.sessionManager.markUnsavedChanges()
    })
    this.eventBus.on('world', 'BlockRemovedEvent', () => {
      this.sessionManager.markUnsavedChanges()
    })

    // Session state changes
    this.eventBus.on('session', 'SessionStateChangedEvent', (event: any) => {
      this.handleSessionStateChange(event)
    })
  }

  private handleSessionStateChange(event: { newState: SessionState; previousState: SessionState }): void {
    if (event.newState === SessionState.PLAYING) {
      this.inputService.setState(GameState.PLAYING)
      // Only call onPlay when resuming from PAUSED (not during initial load)
      if (event.previousState === SessionState.PAUSED) {
        this.uiService.onPlay()
      }
    } else if (event.newState === SessionState.PAUSED) {
      this.inputService.setState(GameState.PAUSE)
      this.uiService.onPause()
    } else if (event.newState === SessionState.NO_SESSION) {
      this.inputService.setState(GameState.MAIN_MENU)
      this.uiService.onMenu()
    }
  }

  /**
   * Setup pointer lock event listeners
   */
  private setupPointerLockListeners(): void {
    this.cameraControls.addEventListener('lock', () => {
      console.log('Pointer locked')
    })

    this.cameraControls.addEventListener('unlock', () => {
      if (this.isLoading()) return

      if (Date.now() < this.getIgnoreUnlockUntil()) {
        setTimeout(() => this.cameraControls.lock(), 100)
        return
      }

      // Don't pause when in inventory/radial menu states
      const currentState = this.uiService.getState()
      if (currentState === GameState.CREATIVE_INVENTORY || currentState === GameState.RADIAL_MENU) {
        return
      }

      // Use SessionManager for pause if we have an active session
      if (this.sessionManager.isPlaying()) {
        this.sessionManager.pauseSession()
      }
    })
  }
}
