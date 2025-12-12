// src/modules/game/application/GameOrchestrator.ts
import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { WorldService } from '../../world/application/WorldService'
import { MeshingService } from '../../rendering/meshing-application/MeshingService'
import { RenderingService } from '../../rendering/application/RenderingService'
import { PlayerService } from '../../player/application/PlayerService'
import { PhysicsService } from '../../physics/application/PhysicsService'
import { InputService } from '../../input/application/InputService'
import { UIService } from '../../ui/application/UIService'
import { AudioService } from '../../audio/application/AudioService'
import { InteractionService } from '../../interaction/application/InteractionService'
import { EnvironmentService } from '../../environment/application/EnvironmentService'
import { InventoryService } from '../../inventory/application/InventoryService'
import { PersistenceService } from '../../persistence/application/PersistenceService'
import { AutoSaveManager } from '../../persistence/application/AutoSaveManager'
import { IndexedDBAdapter } from '../../persistence/adapters/IndexedDBAdapter'
import { SaveGameHandler } from '../../persistence/application/handlers/SaveGameHandler'
import { LoadGameHandler } from '../../persistence/application/handlers/LoadGameHandler'
import { CommandBus } from '../infrastructure/CommandBus'
import { EventBus } from '../infrastructure/EventBus'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GenerateChunkHandler } from './handlers/GenerateChunkHandler'
import { PlaceBlockHandler } from './handlers/PlaceBlockHandler'
import { RemoveBlockHandler } from './handlers/RemoveBlockHandler'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'
import { MovementVector } from '../../physics/domain/MovementVector'
import { PlayerMode } from '../../player/domain/PlayerMode'
import { DEFAULT_WORLD_PRESET_ID } from '../../world/domain/WorldConfig'
import { getWorldPreset } from '../../world/domain/WorldPreset'
import { GameState } from '../../input/domain/InputState'
import { UIState } from '../../ui/domain/UIState'
import { PerformanceMonitor } from '../infrastructure/PerformanceMonitor'

export class GameOrchestrator {
  // Infrastructure
  public commandBus: CommandBus
  public eventBus: EventBus
  private performanceMonitor: PerformanceMonitor

  // Services (all 11 hexagonal modules - persistence added)
  private worldService: WorldService
  private meshingService: MeshingService
  private renderingService: RenderingService
  private playerService: PlayerService
  private physicsService: PhysicsService
  private inputService: InputService
  private uiService: UIService
  private audioService: AudioService
  private interactionService: InteractionService
  private environmentService: EnvironmentService
  private inventoryService: InventoryService
  private persistenceService: PersistenceService
  private autoSaveManager: AutoSaveManager
  private worldPreset = getWorldPreset(DEFAULT_WORLD_PRESET_ID)

  private currentChunk = new ChunkCoordinate(0, 0)
  private previousChunk = new ChunkCoordinate(0, 0)
  private renderDistance = 3
  private lastUpdateTime = performance.now()
  private lastChunkUnloadTime = performance.now()
  private chunkUnloadInterval = 5000 // Unload chunks every 5 seconds
  private cameraControls: PointerLockControls

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    // Create camera controls (camera already in scene from Core)
    this.cameraControls = new PointerLockControls(camera, document.body)

    // Create infrastructure
    this.commandBus = new CommandBus()
    this.eventBus = new EventBus()
    this.performanceMonitor = new PerformanceMonitor()

    // Make it available on window.debug
    ;(window as any).debug = {
      ...(window as any).debug,
      getMetrics: () => this.performanceMonitor.getFrameMetrics(),
      getLastChunk: () => this.performanceMonitor.getLastChunkMetrics()
    }

    // Create all services (in dependency order)
    this.worldService = new WorldService(this.eventBus)
    this.renderingService = new RenderingService(scene, this.eventBus)
    this.playerService = new PlayerService(this.eventBus)
    this.physicsService = new PhysicsService(this.worldService, this.playerService)
    this.inputService = new InputService(this.eventBus)
    this.inventoryService = new InventoryService(this.eventBus)
    this.uiService = new UIService(this.eventBus, {
      requestPointerLock: () => this.cameraControls.lock(),
      exitPointerLock: () => this.cameraControls.unlock()
    }, this.inventoryService)
    this.audioService = new AudioService(camera, this.eventBus)
    this.interactionService = new InteractionService(this.commandBus, this.eventBus, scene, this.worldService)
    this.environmentService = new EnvironmentService(scene, camera, this.eventBus)
    
    // Link services (resolve circular dependency)
    this.worldService.setEnvironmentService(this.environmentService)

    // Initialize player position from camera (ensure spawning above ground)
    this.playerService.updatePosition(this.camera.position)

    // MeshingService depends on World (voxels) and Environment (lighting)
    // EnvironmentService will now implement ILightingQuery/Storage (TODO)
    this.meshingService = new MeshingService(
        this.worldService, 
        this.environmentService, // Acts as ILightingQuery & ILightStorage
        this.eventBus
    )

    // Keep input service state in sync with UI state
    this.inputService.setState(GameState.MENU)
    this.eventBus.on('ui', 'UIStateChangedEvent', (event: any) => {
      const stateMap: Record<string, GameState> = {
        SPLASH: GameState.SPLASH,
        MENU: GameState.MENU,
        PLAYING: GameState.PLAYING,
        PAUSE: GameState.PAUSE,
        RADIAL_MENU: GameState.RADIAL_MENU,
        CREATIVE_INVENTORY: GameState.CREATIVE_INVENTORY
      }
      const mapped = stateMap[event.newState]
      if (mapped) {
        this.inputService.setState(mapped)
      }
      
      // Manage Pointer Lock based on State (Single Source of Truth)
      if (event.newState === UIState.PLAYING) {
          this.cameraControls.lock()
      } else {
          this.cameraControls.unlock()
      }
    })

    // Register command handlers
    this.commandBus.register(
      'GenerateChunkCommand',
      new GenerateChunkHandler(this.worldService, this.eventBus)
    )
    this.commandBus.register(
      'PlaceBlockCommand',
      new PlaceBlockHandler(this.worldService, this.eventBus, this.playerService)
    )
    this.commandBus.register(
      'RemoveBlockCommand',
      new RemoveBlockHandler(this.worldService, this.eventBus)
    )

    // Initialize persistence module (11th module)
    const indexedDBAdapter = new IndexedDBAdapter()
    this.persistenceService = new PersistenceService(indexedDBAdapter)
    this.autoSaveManager = new AutoSaveManager(this.commandBus)

    // Initialize IndexedDB (async operation, but don't block initialization)
    this.persistenceService.initialize().then(() => {
      console.log('✅ Persistence module initialized')
    }).catch((error) => {
      console.error('❌ Failed to initialize persistence:', error)
    })

    // Register persistence command handlers
    this.commandBus.register(
      'SaveGameCommand',
      new SaveGameHandler(this.persistenceService, this.playerService, this.eventBus)
    )
    this.commandBus.register(
      'LoadGameCommand',
      new LoadGameHandler(this.persistenceService, this.playerService, this.eventBus)
    )

    // Start auto-save
    this.autoSaveManager.start()

    // Register default input actions
    this.registerDefaultActions()

    // Setup interaction event listeners
    this.setupInteractionListeners()

    // Setup pointer lock listeners
    this.setupPointerLockListeners()

    console.log('✅ GameOrchestrator: All 10 modules initialized')

    // Generate initial chunks
    const initialChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )
    this.generateChunksInRenderDistance(initialChunk)
    this.previousChunk = initialChunk
  }

  update(): void {
    const frameStart = performance.now()

    // Calculate delta time
    const now = performance.now()
    const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1) // Cap at 100ms
    this.lastUpdateTime = now

    // Update physics and player movement
    this.updatePlayerMovement(deltaTime)
    this.interactionService.updateHighlight(this.camera)
    this.environmentService.update()

    // Update chunks based on camera position
    const newChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )

    if (!newChunk.equals(this.previousChunk)) {
      this.generateChunksInRenderDistance(newChunk)
      this.previousChunk = newChunk
    }

    // Periodically unload chunks that are outside render distance
    if (now - this.lastChunkUnloadTime > this.chunkUnloadInterval) {
      const unloadedCount = this.worldService.unloadChunksOutsideRadius(newChunk, this.renderDistance)
      if (unloadedCount > 0) {
        console.log(`🗑️ Unloaded ${unloadedCount} chunks outside render distance`)
      }
      this.lastChunkUnloadTime = now
    }

    // Process meshing queue
    this.meshingService.processDirtyQueue()

    // Record frame metrics
    const frameEnd = performance.now()
    const frameTime = frameEnd - frameStart
    const fps = 1000 / frameTime

    this.performanceMonitor.recordFrameMetrics({
      fps,
      frameTimeMs: frameTime,
      chunksProcessed: 0, // Will be updated in Phase 2
      budgetUsedMs: 0 // Will be updated in Phase 2
    })
  }

  private updatePlayerMovement(deltaTime: number): void {
    // Build movement vector from input state
    const movement: MovementVector = {
      forward: 0,
      strafe: 0,
      vertical: 0,
      jump: false,
      sneak: false
    }

    if (this.inputService.isActionPressed('move_forward')) {
      movement.forward += 1
    }
    if (this.inputService.isActionPressed('move_backward')) {
      movement.forward -= 1
    }
    if (this.inputService.isActionPressed('move_right')) {
      movement.strafe += 1
    }
    if (this.inputService.isActionPressed('move_left')) {
      movement.strafe -= 1
    }
    const moveUpPressed = this.inputService.isActionPressed('move_up')
    const moveDownPressed = this.inputService.isActionPressed('move_down')

    if (moveUpPressed) {
      movement.vertical += 1
      movement.jump = true
    }
    if (moveDownPressed) {
      movement.vertical -= 1
      movement.sneak = true
    }

    // Apply movement through physics worker
    this.physicsService.update(movement, this.camera, deltaTime)

    // PlayerService is updated by PhysicsService directly (via worker message)
    // Sync camera to player position (after physics update)
    this.camera.position.copy(this.playerService.getPosition())
  }

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const distance = this.renderDistance
    const chunksToLoad: ChunkCoordinate[] = []

    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        chunksToLoad.push(new ChunkCoordinate(centerChunk.x + x, centerChunk.z + z))
      }
    }

    // Sort by distance from center (Radial Loading)
    chunksToLoad.sort((a, b) => {
        const distA = Math.pow(a.x - centerChunk.x, 2) + Math.pow(a.z - centerChunk.z, 2)
        const distB = Math.pow(b.x - centerChunk.x, 2) + Math.pow(b.z - centerChunk.z, 2)
        return distA - distB
    })

    for (const coord of chunksToLoad) {
        this.commandBus.send(new GenerateChunkCommand(coord, this.renderDistance))
    }
  }

  private setupInteractionListeners(): void {
    // Listen for all input actions in one place
    this.eventBus.on('input', 'InputActionEvent', (event: any) => {
      // DEBUG: Trace events reaching the orchestrator
      if (['open_radial_menu', 'open_creative_inventory', 'place_block'].includes(event.action)) {
          console.log(`[Game] Input Received: ${event.action} (${event.eventType})`)
      }

      // Toggle Radial Menu (Tab)
      if (event.action === 'open_radial_menu') {
          if (event.eventType === 'pressed') {
              if (this.uiService.isPlaying()) {
                  this.uiService.setState(UIState.RADIAL_MENU) // Set state BEFORE unlocking
                  document.exitPointerLock()
              }
          } else if (event.eventType === 'released') {
              if (this.uiService.getState() === UIState.RADIAL_MENU) {
                  this.cameraControls.lock()
                  this.uiService.setState(UIState.PLAYING)
              }
          }
      }
      
      // Toggle Creative Inventory (B)
      if (event.action === 'open_creative_inventory' && event.eventType === 'pressed') {
          if (this.uiService.isPlaying()) {
              this.uiService.setState(UIState.CREATIVE_INVENTORY) // Set state BEFORE unlocking
              document.exitPointerLock()
          } else if (this.uiService.getState() === UIState.CREATIVE_INVENTORY) {
              this.cameraControls.lock()
              this.uiService.setState(UIState.PLAYING)
          }
      }

      if (event.action === 'place_block' && event.eventType === 'pressed') {
        const selectedBlock = this.interactionService.getSelectedBlock()
        this.interactionService.placeBlock(this.camera, selectedBlock)
      }
      if (event.action === 'remove_block' && event.eventType === 'pressed') {
        this.interactionService.removeBlock(this.camera)
      }
      if (event.action === 'toggle_flying' && event.eventType === 'pressed') {
        const currentMode = this.playerService.getMode()
        const newMode = currentMode === PlayerMode.Flying ? PlayerMode.Walking : PlayerMode.Flying
        this.playerService.setMode(newMode)
        console.log(`✈️ Player mode toggled: ${currentMode} -> ${newMode}`)
      }
      if (event.action === 'pause' && event.eventType === 'pressed') {
        if (this.uiService.isPlaying()) {
          document.exitPointerLock()
        }
      }

      // Block selection (1-9 keys)
      for (let i = 1; i <= 9; i++) {
        if (event.action === `select_block_${i}` && event.eventType === 'pressed') {
          this.inventoryService.selectSlot(i - 1)
        }
      }
      
      // Block selection (0 key -> 10th slot)
      if (event.action === 'select_block_0' && event.eventType === 'pressed') {
          this.inventoryService.selectSlot(9)
      }
    })
    
    // Listen for Inventory Changes
    this.eventBus.on('inventory', 'InventoryChangedEvent', (event: any) => {
        this.interactionService.setSelectedBlock(event.selectedBlock)
        this.uiService.setSelectedSlot(event.selectedSlot)
        
        // Update Hotbar UI
        const activeBank = this.inventoryService.getActiveBank()
        this.uiService.updateHotbar(activeBank)
    })
  }

  private registerDefaultActions(): void {
    // Movement
    this.inputService.registerAction({
      id: 'move_forward',
      category: 'movement',
      description: 'Move forward',
      defaultKey: 'KeyW'
    })

    this.inputService.registerAction({
      id: 'move_backward',
      category: 'movement',
      description: 'Move backward',
      defaultKey: 'KeyS'
    })

    this.inputService.registerAction({
      id: 'move_left',
      category: 'movement',
      description: 'Move left',
      defaultKey: 'KeyA'
    })

    this.inputService.registerAction({
      id: 'move_right',
      category: 'movement',
      description: 'Move right',
      defaultKey: 'KeyD'
    })

    this.inputService.registerAction({
      id: 'move_up',
      category: 'movement',
      description: 'Move up/Jump',
      defaultKey: 'Space'
    })
    this.inputService.addBinding('move_up', { key: 'KeyQ', ctrl: false, shift: false, alt: false })

    this.inputService.registerAction({
      id: 'move_down',
      category: 'movement',
      description: 'Move down/Sneak',
      defaultKey: 'ShiftLeft'
    })
    this.inputService.addBinding('move_down', { key: 'KeyE', ctrl: false, shift: false, alt: false })

    // Interaction
    this.inputService.registerAction({
      id: 'place_block',
      category: 'building',
      description: 'Place block',
      defaultKey: 'mouse:right'
    })
    this.inputService.addBinding('place_block', { key: 'KeyC', ctrl: false, shift: false, alt: false })

    this.inputService.registerAction({
      id: 'remove_block',
      category: 'building',
      description: 'Remove block',
      defaultKey: 'mouse:left'
    })
    this.inputService.addBinding('remove_block', { key: 'KeyN', ctrl: false, shift: false, alt: false })

    // UI
    this.inputService.registerAction({
      id: 'pause',
      category: 'ui',
      description: 'Pause menu',
      defaultKey: 'Escape'
    })

    this.inputService.registerAction({
      id: 'toggle_flying',
      category: 'movement',
      description: 'Toggle flying mode',
      defaultKey: 'KeyF'
    })

    // Inventory / Radial Menu
    this.inputService.registerAction({
      id: 'open_radial_menu',
      category: 'inventory',
      description: 'Open Radial Menu',
      defaultKey: 'Tab'
    })

    this.inputService.registerAction({
      id: 'open_creative_inventory',
      category: 'inventory',
      description: 'Open Creative Inventory',
      defaultKey: 'KeyB'
    })

    // Block selection (1-9)
    for (let i = 1; i <= 9; i++) {
      this.inputService.registerAction({
        id: `select_block_${i}`,
        category: 'inventory',
        description: `Select block ${i}`,
        defaultKey: `Digit${i}`
      })
    }
    
    // Block selection (0)
    this.inputService.registerAction({
        id: 'select_block_0',
        category: 'inventory',
        description: 'Select block 10',
        defaultKey: 'Digit0'
    })
  }

  private setupPointerLockListeners(): void {
    // Unlock event: If unlocked externally (ESC), pause game.
    this.cameraControls.addEventListener('unlock', () => {
      if (this.uiService.isPlaying()) {
        this.uiService.onPause()
      }
    })
  }

  // Expose services via getters (ports pattern)
  getWorldService() { return this.worldService }
  getPlayerService() { return this.playerService }
  getInteractionService() { return this.interactionService }
  getUIService() { return this.uiService }
  getInputService() { return this.inputService }
  getAudioService() { return this.audioService }
  getEnvironmentService() { return this.environmentService }
  getInventoryService() { return this.inventoryService }
  getPersistenceService() { return this.persistenceService }

  // Debug methods
  enableEventTracing(): void {
    this.eventBus.enableTracing()
  }

  replayCommands(fromIndex: number): void {
    this.commandBus.replay(fromIndex)
  }

  getCommandLog(): readonly any[] {
    return this.commandBus.getLog()
  }
}
