// src/modules/core/application/GameOrchestrator.ts
/**
 * GameOrchestrator - Game Loop & State Management
 *
 * Orchestrates the game loop, handles state transitions, and coordinates
 * between services. Service creation is delegated to GameFactory.
 */
import * as THREE from 'three'
import { CommandBus } from '../../../shared/infrastructure/CommandBus'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GameServices, createGameServices, setupDebugHelpers } from '../GameFactory'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'
import { MovementVector } from '../../physics/domain/MovementVector'
import { PlayerMode } from '../../player/domain/PlayerMode'
import { GameState } from '../../../shared/domain/GameState'
import { generateSpiralOrder } from '../../world/infrastructure/ChunkPriorityQueue'
import { SessionState } from '../../ui/domain/Session'
import { SaveGameCommand } from '../../persistence/domain/commands/SaveGameCommand'
import { LoadGameCommand } from '../../persistence/domain/commands/LoadGameCommand'
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_HEIGHT } from '../../../shared/constants/ChunkConstants'

export class GameOrchestrator {
  // Infrastructure (public for external access)
  public commandBus: CommandBus
  public eventBus: EventBus

  // All services from factory
  private services: GameServices

  // Game state
  private previousChunk = new ChunkCoordinate(0, 0)
  private renderDistance = 6
  private lastUpdateTime = performance.now()
  private lastChunkUnloadTime = performance.now()
  private chunkUnloadInterval = 10000
  private lastChunkFillTime = performance.now()
  private chunkFillInterval = 30000

  // FPS smoothing
  private frameTimeHistory: number[] = []
  private readonly FPS_SAMPLE_SIZE = 60

  // Loading state
  private isLoadingWorld = false
  private loadingChunksTarget = 0
  private loadingChunksReady = new Set<string>()
  private loadingSpawnChunk: string = '0,0'
  private readonly LOAD_THRESHOLD = 0.80
  private hasFoundGround = false
  private ignoreUnlockUntil = 0

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    // Create all services via factory
    this.services = createGameServices(scene, camera, {
      requestPointerLock: () => this.services.cameraControls.lock(),
      exitPointerLock: () => this.services.cameraControls.unlock(),
      getPlayerPosition: () => this.services.playerService.getPosition(),
      onStartNewGame: (worldId?: string) => this.startNewGame(worldId),
      onResumeGame: () => this.resumeGame(),
      onExitToMenu: () => this.exitToMenu(),
      sessionCallbacks: {
        lockPointer: () => this.services.cameraControls.lock(),
        unlockPointer: () => this.services.cameraControls.unlock(),
        isPointerLocked: () => !!document.pointerLockElement,
        saveToSlot: async (slotId: string) => {
          this.services.commandBus.send(new SaveGameCommand(slotId, slotId, false))
        },
        loadFromSlot: async (slotId: string) => {
          this.services.commandBus.send(new LoadGameCommand(slotId))
        },
        clearWorld: () => {
          this.services.worldService.clearAllChunks()
          this.services.modificationTracker.clear()
        },
        generateChunksAround: (x: number, z: number) => {
          const centerChunk = new ChunkCoordinate(Math.floor(x / CHUNK_WIDTH), Math.floor(z / CHUNK_DEPTH))
          this.generateChunksInRenderDistance(centerChunk)
        },
        hasLoadedChunks: () => this.services.worldService.getLoadedChunkCount() > 0,
        getCurrentWorldId: () => 'default' // See #33 for multi-world support
      }
    })

    // Expose buses for external access
    this.commandBus = this.services.commandBus
    this.eventBus = this.services.eventBus

    // Setup debug helpers
    setupDebugHelpers(this.services)

    // Initialize player position from camera
    this.services.playerService.updatePosition(this.camera.position)

    // Keep input service state in sync with UI state
    this.services.inputService.setState(GameState.SPLASH)
    this.setupUIStateSync()

    // Register input actions
    this.registerDefaultActions()

    // Setup event listeners
    this.setupInteractionListeners()
    this.setupPointerLockListeners()
    this.setupLoadingListeners()
    this.setupSessionListeners()

    console.log('GameOrchestrator: All modules initialized')

    // Set initial chunk reference
    this.previousChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / CHUNK_WIDTH),
      Math.floor(this.camera.position.z / CHUNK_DEPTH)
    )
  }

  /**
   * Called when user clicks Play - enters game immediately with loading overlay
   */
  startNewGame(worldId?: string): void {
    const targetWorldId = worldId || 'default'
    console.log(`Starting new game with world: ${targetWorldId}`)

    // Start session (this handles the state management)
    this.services.sessionManager.startNewSession(targetWorldId)

    // Clear any existing state (also done by session, but explicit here)
    this.services.worldService.clearAllChunks()
    this.services.modificationTracker.clear()
    this.hasFoundGround = false

    // Spawn at default position
    this.camera.position.set(12, 45, 12)
    this.services.playerService.updatePosition(this.camera.position)
    this.services.playerService.setMode(PlayerMode.Walking)
    this.services.playerService.setVelocity({ x: 0, y: 0, z: 0 })

    // Enter PLAYING state immediately (pointer lock in user gesture context)
    this.services.cameraControls.lock()
    this.services.uiService.onPlay()

    const centerChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / CHUNK_WIDTH),
      Math.floor(this.camera.position.z / CHUNK_DEPTH)
    )

    this.startLoadingMode(centerChunk, 'Generating world...')
  }

  /**
   * Resume from pause - NO chunk regeneration, instant resume
   * This is the key fix for the clunky menu experience
   */
  resumeGame(): void {
    if (!this.services.sessionManager.hasActiveSession()) {
      console.warn('Cannot resume - no active session')
      return
    }

    console.log('Resuming game (no regeneration)...')

    // Ignore unlock events briefly - pointer lock may fail after tab switch
    // and we don't want that to immediately pause the game again
    this.ignoreUnlockUntil = Date.now() + 500

    // SessionManager handles the state transition, pointer lock, and emits event
    // SessionStateChangedEvent handler will call uiService.onPlay()
    this.services.sessionManager.resumeSession()
  }

  /**
   * Exit to main menu - ends the current session
   * UI state change is handled by SessionStateChangedEvent handler
   */
  async exitToMenu(): Promise<void> {
    console.log('Exiting to main menu...')

    // Clear world and modifications BEFORE ending session
    // This ensures the world is cleared before menu appears
    this.services.worldService.clearAllChunks()
    this.services.modificationTracker.clear()

    // End session (auto-saves if there are unsaved changes)
    // SessionStateChangedEvent handler will call uiService.onMenu()
    await this.services.sessionManager.endSession()
  }

  update(skipHeavyProcessing = false): void {
    const frameStart = performance.now()

    // Calculate delta time
    const now = performance.now()
    const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1)
    this.lastUpdateTime = now

    // Skip heavy updates when not playing (paused, menu, etc.)
    const isPlaying = this.services.uiService.isPlaying()
    if (!isPlaying) {
      // Still render but skip game logic
      return
    }

    // Update physics and player movement
    this.updatePlayerMovement(deltaTime)
    this.services.interactionService.updateHighlight(this.camera)
    this.services.environmentService.update()

    if (skipHeavyProcessing) {
      const meshingResult = this.services.meshingService.processDirtyQueue(1)
      this.recordFrameMetrics(frameStart, meshingResult)
      return
    }

    // Update chunks based on camera position
    const newChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / CHUNK_WIDTH),
      Math.floor(this.camera.position.z / CHUNK_DEPTH)
    )

    if (!newChunk.equals(this.previousChunk)) {
      this.generateChunksInRenderDistance(newChunk)
      this.previousChunk = newChunk
    }

    // Periodically unload distant chunks
    if (now - this.lastChunkUnloadTime > this.chunkUnloadInterval) {
      const unloadedCount = this.services.worldService.unloadChunksOutsideRadius(newChunk, this.renderDistance)
      if (unloadedCount > 0) {
        console.log('Unloaded ' + unloadedCount + ' chunks')
      }
      this.lastChunkUnloadTime = now
    }

    // Periodically fill missing chunks
    if (now - this.lastChunkFillTime > this.chunkFillInterval) {
      if (this.hasMissingChunks(newChunk)) {
        this.generateChunksInRenderDistance(newChunk)
      }
      this.lastChunkFillTime = now
    }

    // Process meshing queue
    const meshingResult = this.services.meshingService.processDirtyQueue()
    this.recordFrameMetrics(frameStart, meshingResult)
  }

  // === Private Methods ===

  private setupUIStateSync(): void {
    this.services.eventBus.on('ui', 'UIStateChangedEvent', (event: any) => {
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
        this.services.inputService.setState(mapped)
      }

      // Manage pointer lock based on state
      if (event.newState === GameState.PLAYING) {
        if (!document.pointerLockElement) {
          this.services.cameraControls.lock()
        }
      } else if (event.newState !== GameState.RADIAL_MENU && event.newState !== GameState.CREATIVE_INVENTORY) {
        this.services.cameraControls.unlock()
      }
    })
  }

  private setupLoadingListeners(): void {
    // Listen for game load events
    this.services.eventBus.on('persistence', 'GameLoadedEvent', (event: any) => {
      console.log('Game loaded, regenerating chunks')

      const playerPos = event.playerPosition
      const centerChunk = new ChunkCoordinate(
        Math.floor(playerPos.x / CHUNK_WIDTH),
        Math.floor(playerPos.z / CHUNK_DEPTH)
      )

      this.camera.position.set(playerPos.x, playerPos.y, playerPos.z)
      this.services.playerService.updatePosition(this.camera.position)
      this.services.playerService.setMode(PlayerMode.Walking)
      this.services.playerService.setVelocity({ x: 0, y: 0, z: 0 })
      this.hasFoundGround = true

      this.services.cameraControls.lock()
      this.services.uiService.onPlay()

      this.previousChunk = centerChunk
      this.startLoadingMode(centerChunk, 'Returning to World...')
    })

    // Track chunk mesh completion
    this.services.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (event: any) => {
      if (this.isLoadingWorld) {
        const key = event.chunkCoord.x + ',' + event.chunkCoord.z
        this.loadingChunksReady.add(key)
        this.services.uiService.updateLoadingProgress(
          this.loadingChunksReady.size,
          this.loadingChunksTarget,
          'chunks'
        )

        if (!this.hasFoundGround && key === this.loadingSpawnChunk) {
          this.placePlayerOnGround()
        }

        const progress = this.loadingChunksReady.size / this.loadingChunksTarget
        if (progress >= this.LOAD_THRESHOLD) {
          this.finishLoading()
        }
      }
    })
  }

  private recordFrameMetrics(
    frameStart: number,
    meshingResult: { chunksProcessed: number; budgetUsedMs: number }
  ): void {
    const frameEnd = performance.now()
    const frameTime = frameEnd - frameStart

    this.frameTimeHistory.push(frameTime)
    if (this.frameTimeHistory.length > this.FPS_SAMPLE_SIZE) {
      this.frameTimeHistory.shift()
    }

    const avgFrameTime = this.frameTimeHistory.reduce((sum, ft) => sum + ft, 0) / this.frameTimeHistory.length
    const fps = 1000 / avgFrameTime

    this.services.performanceMonitor.recordFrameMetrics({
      fps,
      frameTimeMs: avgFrameTime,
      chunksProcessed: meshingResult.chunksProcessed,
      budgetUsedMs: meshingResult.budgetUsedMs
    })

    this.services.performanceMonitor.setQueueDepth('meshing', this.services.meshingService.getQueueDepth())
    this.services.performanceMonitor.setWorkerUtilization(
      'generation',
      this.services.worldService.getWorkerUtilization().busy,
      this.services.worldService.getWorkerUtilization().total
    )
    this.services.performanceMonitor.setWorkerUtilization(
      'lighting',
      this.services.environmentService.getWorkerUtilization().busy,
      this.services.environmentService.getWorkerUtilization().total
    )
    this.services.performanceMonitor.setWorkerUtilization(
      'meshing',
      this.services.meshingService.getWorkerUtilization().busy,
      this.services.meshingService.getWorkerUtilization().total
    )

    this.services.uiService.update()
  }

  private updatePlayerMovement(deltaTime: number): void {
    const movement: MovementVector = {
      forward: 0,
      strafe: 0,
      vertical: 0,
      jump: false,
      sneak: false
    }

    if (this.services.inputService.isActionPressed('move_forward')) movement.forward += 1
    if (this.services.inputService.isActionPressed('move_backward')) movement.forward -= 1
    if (this.services.inputService.isActionPressed('move_right')) movement.strafe += 1
    if (this.services.inputService.isActionPressed('move_left')) movement.strafe -= 1

    const moveUpPressed = this.services.inputService.isActionPressed('move_up')
    const moveDownPressed = this.services.inputService.isActionPressed('move_down')

    if (moveUpPressed) {
      movement.vertical += 1
      movement.jump = true
    }
    if (moveDownPressed) {
      movement.vertical -= 1
      movement.sneak = true
    }

    this.services.physicsService.update(movement, this.camera, deltaTime)
    this.camera.position.copy(this.services.playerService.getPosition())
  }

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const spiralOrder = generateSpiralOrder(centerChunk, this.renderDistance)
    for (const coord of spiralOrder) {
      this.services.commandBus.send(new GenerateChunkCommand(coord, this.renderDistance))
    }
  }

  private startLoadingMode(centerChunk: ChunkCoordinate, message = 'Loading world...'): void {
    this.isLoadingWorld = true
    this.loadingChunksReady.clear()
    this.loadingSpawnChunk = centerChunk.x + ',' + centerChunk.z

    const diameter = this.renderDistance * 2 + 1
    this.loadingChunksTarget = diameter * diameter

    this.services.uiService.showLoading(message)
    this.services.uiService.updateLoadingProgress(0, this.loadingChunksTarget, 'chunks')
    this.generateChunksInRenderDistance(centerChunk)
  }

  private placePlayerOnGround(): void {
    const x = this.camera.position.x
    const z = this.camera.position.z
    const groundY = this.findGroundLevel(x, z)
    const finalY = groundY + 3

    this.camera.position.y = finalY
    this.services.playerService.updatePosition(this.camera.position)
    this.hasFoundGround = true
    console.log('Placed player at y=' + finalY.toFixed(1))
  }

  private finishLoading(): void {
    if (!this.isLoadingWorld) return
    this.isLoadingWorld = false
    this.ignoreUnlockUntil = Date.now() + 1500

    console.log('World loaded: ' + this.loadingChunksReady.size + '/' + this.loadingChunksTarget + ' chunks')

    // Notify SessionManager that loading is complete
    this.services.sessionManager.onLoadingComplete()

    this.services.uiService.collapsePortal(() => {
      if (!document.pointerLockElement) {
        this.services.cameraControls.lock()
      }
    })
  }

  private findGroundLevel(x: number, z: number): number {
    const chunkX = Math.floor(x / CHUNK_WIDTH)
    const chunkZ = Math.floor(z / CHUNK_DEPTH)
    const chunk = this.services.worldService.getChunk(new ChunkCoordinate(chunkX, chunkZ))

    if (!chunk) return 64

    const localX = Math.floor(x) - chunkX * CHUNK_WIDTH
    const localZ = Math.floor(z) - chunkZ * CHUNK_DEPTH

    for (let y = CHUNK_HEIGHT - 3; y >= 0; y--) {
      const blockHere = chunk.getBlockId(localX, y, localZ)
      const blockAbove1 = chunk.getBlockId(localX, y + 1, localZ)
      const blockAbove2 = chunk.getBlockId(localX, y + 2, localZ)

      if (blockHere !== 0 && blockAbove1 === 0 && blockAbove2 === 0) {
        return y + 1
      }
    }

    return 64
  }

  private hasMissingChunks(centerChunk: ChunkCoordinate): boolean {
    const distance = this.renderDistance
    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const coord = new ChunkCoordinate(centerChunk.x + x, centerChunk.z + z)
        if (!this.services.worldService.getChunk(coord)) {
          return true
        }
      }
    }
    return false
  }

  private setupInteractionListeners(): void {
    this.services.eventBus.on('input', 'InputActionEvent', (event: any) => {
      // Radial Menu (Tab)
      if (event.action === 'open_radial_menu') {
        if (event.eventType === 'pressed' && this.services.uiService.isPlaying()) {
          this.services.uiService.setState(GameState.RADIAL_MENU)
          document.exitPointerLock()
        } else if (event.eventType === 'released' && this.services.uiService.getState() === GameState.RADIAL_MENU) {
          // Ignore unlock events briefly when closing radial menu
          this.ignoreUnlockUntil = Date.now() + 500
          this.services.cameraControls.lock()
          this.services.uiService.setState(GameState.PLAYING)
        }
      }

      // Creative Inventory (B)
      if (event.action === 'open_creative_inventory' && event.eventType === 'pressed') {
        if (this.services.uiService.isPlaying()) {
          this.services.uiService.setState(GameState.CREATIVE_INVENTORY)
          document.exitPointerLock()
        } else if (this.services.uiService.getState() === GameState.CREATIVE_INVENTORY) {
          // Ignore unlock events briefly when closing inventory
          this.ignoreUnlockUntil = Date.now() + 500
          this.services.cameraControls.lock()
          this.services.uiService.setState(GameState.PLAYING)
        }
      }

      // Block placement/removal
      if (event.action === 'place_block' && event.eventType === 'pressed') {
        const selectedBlock = this.services.interactionService.getSelectedBlock()
        this.services.interactionService.placeBlock(this.camera, selectedBlock)
      }
      if (event.action === 'remove_block' && event.eventType === 'pressed') {
        this.services.interactionService.removeBlock(this.camera)
      }

      // Flying toggle
      if (event.action === 'toggle_flying' && event.eventType === 'pressed') {
        const currentMode = this.services.playerService.getMode()
        const newMode = currentMode === PlayerMode.Flying ? PlayerMode.Walking : PlayerMode.Flying
        this.services.playerService.setMode(newMode)
      }

      // Pause
      if (event.action === 'pause' && event.eventType === 'pressed') {
        if (this.services.uiService.isPlaying()) {
          document.exitPointerLock()
        }
      }

      // Block selection (1-9)
      for (let i = 1; i <= 9; i++) {
        if (event.action === 'select_block_' + i && event.eventType === 'pressed') {
          this.services.inventoryService.selectSlot(i - 1)
        }
      }
      if (event.action === 'select_block_0' && event.eventType === 'pressed') {
        this.services.inventoryService.selectSlot(9)
      }
    })

    // Inventory changes
    this.services.eventBus.on('inventory', 'InventoryChangedEvent', (event: any) => {
      this.services.interactionService.setSelectedBlock(event.selectedBlock)
      this.services.uiService.setSelectedSlot(event.selectedSlot)
      const activeBank = this.services.inventoryService.getActiveBank()
      this.services.uiService.updateHotbar(activeBank)
    })
  }

  private registerDefaultActions(): void {
    const input = this.services.inputService

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

  private setupPointerLockListeners(): void {
    this.services.cameraControls.addEventListener('lock', () => {
      console.log('Pointer locked')
    })

    this.services.cameraControls.addEventListener('unlock', () => {
      if (this.isLoadingWorld) return

      if (Date.now() < this.ignoreUnlockUntil) {
        setTimeout(() => this.services.cameraControls.lock(), 100)
        return
      }

      // Don't pause when in inventory/radial menu states (intentional unlock)
      const currentState = this.services.uiService.getState()
      if (currentState === GameState.CREATIVE_INVENTORY || currentState === GameState.RADIAL_MENU) {
        return
      }

      // Use SessionManager for pause if we have an active session
      // SessionStateChangedEvent handler will sync UI state
      if (this.services.sessionManager.isPlaying()) {
        this.services.sessionManager.pauseSession()
      }
      // Note: No fallback needed - SessionManager is source of truth for game sessions
    })
  }

  private setupSessionListeners(): void {
    // Listen for block changes to mark unsaved
    this.services.eventBus.on('world', 'BlockPlacedEvent', () => {
      this.services.sessionManager.markUnsavedChanges()
    })
    this.services.eventBus.on('world', 'BlockRemovedEvent', () => {
      this.services.sessionManager.markUnsavedChanges()
    })

    // Listen for session state changes - sync both UI and Input services
    // This is the SINGLE SOURCE OF TRUTH for state synchronization
    this.services.eventBus.on('session', 'SessionStateChangedEvent', (event: any) => {
      if (event.newState === SessionState.PLAYING) {
        this.services.inputService.setState(GameState.PLAYING)
        // Only call onPlay when resuming from PAUSED (not during initial load)
        // Initial load uses collapsePortal() for proper animation sequence
        if (event.previousState === SessionState.PAUSED) {
          this.services.uiService.onPlay()
        }
      } else if (event.newState === SessionState.PAUSED) {
        this.services.inputService.setState(GameState.PAUSE)
        this.services.uiService.onPause()
      } else if (event.newState === SessionState.NO_SESSION) {
        this.services.inputService.setState(GameState.MAIN_MENU)
        this.services.uiService.onMenu()
      }
    })
  }

  // === Public Getters ===

  getWorldService() { return this.services.worldService }
  getPlayerService() { return this.services.playerService }
  getInteractionService() { return this.services.interactionService }
  getUIService() { return this.services.uiService }
  getInputService() { return this.services.inputService }
  getAudioService() { return this.services.audioService }
  getEnvironmentService() { return this.services.environmentService }
  getInventoryService() { return this.services.inventoryService }
  getPersistenceService() { return this.services.persistenceService }
  getSessionManager() { return this.services.sessionManager }

  // Debug methods
  enableEventTracing(): void { this.services.eventBus.enableTracing() }
  replayCommands(fromIndex: number): void { this.services.commandBus.replay(fromIndex) }
  getCommandLog(): readonly any[] { return this.services.commandBus.getLog() }

  // Renderer setup for thumbnail capture
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.services.thumbnailCapture.setRenderer(renderer)
    console.log('✅ ThumbnailCapture renderer set')
  }

  // World management access
  getWorldManager() { return this.services.worldManager }
  getThumbnailCapture() { return this.services.thumbnailCapture }

  // Services access (for async initialization)
  getServices() { return this.services }
}
