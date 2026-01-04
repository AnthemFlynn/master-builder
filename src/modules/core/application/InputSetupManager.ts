// src/modules/core/application/InputSetupManager.ts
/**
 * InputSetupManager - Handles input action registration and event listeners
 *
 * Extracted from GameOrchestrator to separate input configuration from
 * the main game loop. Manages action registration, keybindings, and
 * input event handling.
 */
import * as THREE from 'three'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { InputService } from '../../input/application/InputService'
import { InteractionService } from '../../building/application/InteractionService'
import { UIService } from '../../ui/application/UIService'
import { InventoryService } from '../../inventory/application/InventoryService'
import { PlayerService } from '../../player/application/PlayerService'
import { PhysicsService } from '../../physics/application/PhysicsService'
import { GameState } from '../../../shared/domain/GameState'
import { PlayerMode } from '../../player/domain/PlayerMode'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'

export interface InputSetupDependencies {
  inputService: InputService
  interactionService: InteractionService
  uiService: UIService
  inventoryService: InventoryService
  playerService: PlayerService
  physicsService: PhysicsService
  cameraControls: PointerLockControls
  eventBus: EventBus
  camera: THREE.PerspectiveCamera
  getIgnoreUnlockUntil: () => number
  setIgnoreUnlockUntil: (timestamp: number) => void
}

export class InputSetupManager {
  private inputService: InputService
  private interactionService: InteractionService
  private uiService: UIService
  private inventoryService: InventoryService
  private playerService: PlayerService
  private cameraControls: PointerLockControls
  private eventBus: EventBus
  private camera: THREE.PerspectiveCamera
  private getIgnoreUnlockUntil: () => number
  private setIgnoreUnlockUntil: (timestamp: number) => void

  constructor(deps: InputSetupDependencies) {
    this.inputService = deps.inputService
    this.interactionService = deps.interactionService
    this.uiService = deps.uiService
    this.inventoryService = deps.inventoryService
    this.playerService = deps.playerService
    this.cameraControls = deps.cameraControls
    this.eventBus = deps.eventBus
    this.camera = deps.camera
    this.getIgnoreUnlockUntil = deps.getIgnoreUnlockUntil
    this.setIgnoreUnlockUntil = deps.setIgnoreUnlockUntil
  }

  /**
   * Initialize all input - call this from orchestrator constructor
   */
  initialize(): void {
    this.registerDefaultActions()
    this.setupInteractionListeners()
    this.setupInventoryListeners()
  }

  /**
   * Register all default input actions
   */
  registerDefaultActions(): void {
    const input = this.inputService

    // Movement
    input.registerAction({ id: 'move_forward', category: 'movement', description: 'Move forward', defaultKey: 'KeyW' })
    input.registerAction({ id: 'move_backward', category: 'movement', description: 'Move backward', defaultKey: 'KeyS' })
    input.registerAction({ id: 'move_left', category: 'movement', description: 'Move left', defaultKey: 'KeyA' })
    input.registerAction({ id: 'move_right', category: 'movement', description: 'Move right', defaultKey: 'KeyD' })
    input.registerAction({ id: 'move_up', category: 'movement', description: 'Move up/Jump', defaultKey: 'Space' })
    input.addBinding('move_up', { key: 'KeyQ', ctrl: false, shift: false, alt: false })
    input.registerAction({ id: 'move_down', category: 'movement', description: 'Move down/Sneak', defaultKey: 'ShiftLeft' })
    input.addBinding('move_down', { key: 'KeyE', ctrl: false, shift: false, alt: false })
    input.registerAction({ id: 'toggle_flying', category: 'movement', description: 'Toggle flying mode', defaultKey: 'KeyF' })

    // Building
    input.registerAction({ id: 'place_block', category: 'building', description: 'Place block', defaultKey: 'mouse:right' })
    input.addBinding('place_block', { key: 'KeyC', ctrl: false, shift: false, alt: false })
    input.registerAction({ id: 'remove_block', category: 'building', description: 'Remove block', defaultKey: 'mouse:left' })
    input.addBinding('remove_block', { key: 'KeyN', ctrl: false, shift: false, alt: false })

    // UI
    input.registerAction({ id: 'pause', category: 'ui', description: 'Pause menu', defaultKey: 'Escape' })
    input.registerAction({ id: 'open_radial_menu', category: 'inventory', description: 'Open Radial Menu', defaultKey: 'Tab' })
    input.registerAction({ id: 'open_creative_inventory', category: 'inventory', description: 'Open Creative Inventory', defaultKey: 'KeyB' })

    // Block selection (1-9, 0)
    for (let i = 1; i <= 9; i++) {
      input.registerAction({ id: 'select_block_' + i, category: 'inventory', description: 'Select block ' + i, defaultKey: 'Digit' + i })
    }
    input.registerAction({ id: 'select_block_0', category: 'inventory', description: 'Select block 10', defaultKey: 'Digit0' })
  }

  /**
   * Setup listeners for input events
   */
  private setupInteractionListeners(): void {
    this.eventBus.on('input', 'InputActionEvent', (event: any) => {
      this.handleInputAction(event)
    })
  }

  private handleInputAction(event: { action: string; eventType: string }): void {
    // Radial Menu (Tab)
    if (event.action === 'open_radial_menu') {
      if (event.eventType === 'pressed' && this.uiService.isPlaying()) {
        this.uiService.setState(GameState.RADIAL_MENU)
        document.exitPointerLock()
      } else if (event.eventType === 'released' && this.uiService.getState() === GameState.RADIAL_MENU) {
        this.setIgnoreUnlockUntil(Date.now() + 500)
        this.cameraControls.lock()
        this.uiService.setState(GameState.PLAYING)
      }
    }

    // Creative Inventory (B)
    if (event.action === 'open_creative_inventory' && event.eventType === 'pressed') {
      if (this.uiService.isPlaying()) {
        this.uiService.setState(GameState.CREATIVE_INVENTORY)
        document.exitPointerLock()
      } else if (this.uiService.getState() === GameState.CREATIVE_INVENTORY) {
        this.setIgnoreUnlockUntil(Date.now() + 500)
        this.cameraControls.lock()
        this.uiService.setState(GameState.PLAYING)
      }
    }

    // Block placement/removal
    if (event.action === 'place_block' && event.eventType === 'pressed') {
      const selectedBlock = this.interactionService.getSelectedBlock()
      this.interactionService.placeBlock(this.camera, selectedBlock)
    }
    if (event.action === 'remove_block' && event.eventType === 'pressed') {
      this.interactionService.removeBlock(this.camera)
    }

    // Flying toggle
    if (event.action === 'toggle_flying' && event.eventType === 'pressed') {
      const currentMode = this.playerService.getMode()
      const newMode = currentMode === PlayerMode.Flying ? PlayerMode.Walking : PlayerMode.Flying
      this.playerService.setMode(newMode)
    }

    // Pause
    if (event.action === 'pause' && event.eventType === 'pressed') {
      if (this.uiService.isPlaying()) {
        document.exitPointerLock()
      }
    }

    // Block selection (1-9)
    for (let i = 1; i <= 9; i++) {
      if (event.action === 'select_block_' + i && event.eventType === 'pressed') {
        this.inventoryService.selectSlot(i - 1)
      }
    }
    if (event.action === 'select_block_0' && event.eventType === 'pressed') {
      this.inventoryService.selectSlot(9)
    }
  }

  /**
   * Setup inventory change listeners
   */
  private setupInventoryListeners(): void {
    this.eventBus.on('inventory', 'InventoryChangedEvent', (event: any) => {
      this.interactionService.setSelectedBlock(event.selectedBlock)
      this.uiService.setSelectedSlot(event.selectedSlot)
      const activeBank = this.inventoryService.getActiveBank()
      this.uiService.updateHotbar(activeBank)
    })
  }
}
