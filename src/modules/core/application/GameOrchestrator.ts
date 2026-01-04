// src/modules/core/application/GameOrchestrator.ts
/**
 * GameOrchestrator - Game Loop & State Management (Refactored)
 *
 * Core responsibilities:
 * - Game loop (physics, interaction, meshing)
 * - Chunk loading/unloading based on player position
 * - Performance metrics recording
 *
 * Delegated to extracted managers:
 * - WorldLoadingManager: Loading state machine, player placement
 * - InputSetupManager: Input actions and event listeners
 * - SessionStateCoordinator: State synchronization
 */
import * as THREE from 'three'
import { CommandBus } from '../../../shared/infrastructure/CommandBus'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GameServices, createGameServices, setupDebugHelpers } from '../GameFactory'
import { MovementVector } from '../../physics/domain/MovementVector'
import { GameState } from '../../../shared/domain/GameState'
import { SaveGameCommand } from '../../persistence/domain/commands/SaveGameCommand'
import { LoadGameCommand } from '../../persistence/domain/commands/LoadGameCommand'
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../../../shared/constants/ChunkConstants'

// Extracted managers
import { WorldLoadingManager } from './WorldLoadingManager'
import { InputSetupManager } from './InputSetupManager'
import { SessionStateCoordinator } from './SessionStateCoordinator'
import { PerformanceConfig } from '../infrastructure/PerformanceConfig'

export class GameOrchestrator {
  // Infrastructure (public for external access)
  public commandBus: CommandBus
  public eventBus: EventBus

  // All services from factory
  private services: GameServices

  // Extracted managers (public for direct access by consumers)
  public loadingManager: WorldLoadingManager
  public inputManager: InputSetupManager
  public stateCoordinator: SessionStateCoordinator

  // Game state
  private renderDistance = 8  // Increased from 4 for larger visible world
  private lastUpdateTime = performance.now()

  // FPS smoothing
  private frameTimeHistory: number[] = []
  private readonly FPS_SAMPLE_SIZE = 60

  // LOD configuration
  private performanceConfig = new PerformanceConfig()
  private lastLODUpdateTime = 0
  private lodUpdateInterval = 500 // Update LOD levels every 500ms

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private renderer: THREE.WebGLRenderer
  ) {
    // Create all services via factory (pass performance config for worker pool sizing)
    this.services = createGameServices(scene, camera, renderer, {
      requestPointerLock: () => this.services.cameraControls.lock(),
      exitPointerLock: () => this.services.cameraControls.unlock(),
      getPlayerPosition: () => this.services.playerService.getPosition(),
      onStartNewGame: (worldId?: string) => this.loadingManager.startNewGame(worldId),
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
          const chunkX = Math.floor(x / CHUNK_WIDTH)
          const chunkZ = Math.floor(z / CHUNK_DEPTH)
          // Use WorldStreamer via WorldService
          this.services.worldService.getStreamer().loadChunksAround(new ChunkCoordinate(chunkX, chunkZ))
        },
        hasLoadedChunks: () => this.services.worldService.getLoadedChunkCount() > 0,
        getCurrentWorldId: () => 'default'
      }
    }, this.performanceConfig)

    // Expose buses for external access
    this.commandBus = this.services.commandBus
    this.eventBus = this.services.eventBus

    // Setup debug helpers
    setupDebugHelpers(this.services)

    // Initialize player position from camera
    this.services.playerService.updatePosition(this.camera.position)

    // Create extracted managers
    this.loadingManager = new WorldLoadingManager({
      worldService: this.services.worldService,
      uiService: this.services.uiService,
      playerService: this.services.playerService,
      sessionManager: this.services.sessionManager,
      cameraControls: this.services.cameraControls,
      worldManager: this.services.worldManager,
      eventBus: this.services.eventBus,
      commandBus: this.services.commandBus,
      camera: this.camera
    })
    // Configure WorldStreamer with render distance
    this.services.worldService.setRenderDistance(this.renderDistance)
    this.loadingManager.setRenderDistance(this.renderDistance)

    this.inputManager = new InputSetupManager({
      inputService: this.services.inputService,
      interactionService: this.services.interactionService,
      uiService: this.services.uiService,
      inventoryService: this.services.inventoryService,
      playerService: this.services.playerService,
      physicsService: this.services.physicsService,
      cameraControls: this.services.cameraControls,
      eventBus: this.services.eventBus,
      camera: this.camera,
      getIgnoreUnlockUntil: () => this.loadingManager.getIgnoreUnlockUntil(),
      setIgnoreUnlockUntil: (ts: number) => this.loadingManager.setIgnoreUnlockUntil(ts)
    })

    this.stateCoordinator = new SessionStateCoordinator({
      uiService: this.services.uiService,
      inputService: this.services.inputService,
      sessionManager: this.services.sessionManager,
      cameraControls: this.services.cameraControls,
      eventBus: this.services.eventBus,
      isLoading: () => this.loadingManager.isLoading(),
      getIgnoreUnlockUntil: () => this.loadingManager.getIgnoreUnlockUntil()
    })

    // Initialize input service state
    this.services.inputService.setState(GameState.SPLASH)

    // Initialize managers
    this.inputManager.initialize()
    this.stateCoordinator.initialize()

    console.log('GameOrchestrator: All modules initialized')
  }

  /**
   * Resume from pause - NO chunk regeneration, instant resume
   */
  resumeGame(): void {
    if (!this.services.sessionManager.hasActiveSession()) {
      console.warn('Cannot resume - no active session')
      return
    }

    console.log('Resuming game (no regeneration)...')
    this.loadingManager.setIgnoreUnlockUntil(Date.now() + 500)
    this.services.sessionManager.resumeSession()
  }

  /**
   * Exit to main menu - ends the current session
   */
  async exitToMenu(): Promise<void> {
    console.log('Exiting to main menu...')
    this.services.worldService.clearAllChunks()
    this.services.modificationTracker.clear()
    await this.services.sessionManager.endSession()
  }

  /**
   * Main game loop update
   */
  update(skipHeavyProcessing = false): void {
    const frameStart = performance.now()

    // Calculate delta time
    const now = performance.now()
    const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1)
    this.lastUpdateTime = now

    // Skip heavy updates when not playing
    const isPlaying = this.services.uiService.isPlaying()
    if (!isPlaying) {
      return
    }

    // Skip physics during world loading
    if (!this.loadingManager.isLoading()) {
      this.updatePlayerMovement(deltaTime)
    }
    this.services.interactionService.updateHighlight(this.camera)
    this.services.environmentService.update()

    if (skipHeavyProcessing) {
      const meshingResult = this.services.meshingService.processDirtyQueue(1)
      this.recordFrameMetrics(frameStart, meshingResult)
      return
    }

    // Update chunk streaming via WorldStreamer
    // This handles loading new chunks around player and unloading distant ones
    const chunkX = Math.floor(this.camera.position.x / CHUNK_WIDTH)
    const chunkZ = Math.floor(this.camera.position.z / CHUNK_DEPTH)
    this.services.worldService.updatePlayerChunk(chunkX, chunkZ, now)

    // Periodically update LOD levels for all loaded chunks
    if (now - this.lastLODUpdateTime > this.lodUpdateInterval) {
      this.updateChunkLODLevels()
      this.lastLODUpdateTime = now
    }

    // Process meshing queue
    const meshingResult = this.services.meshingService.processDirtyQueue()
    this.recordFrameMetrics(frameStart, meshingResult)
  }

  // === Private Methods ===

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

  /**
   * Update LOD levels for all loaded chunks based on distance from camera.
   * Uses hysteresis to prevent thrashing at LOD boundaries.
   */
  private updateChunkLODLevels(): void {
    // Get camera chunk position
    const cameraChunkX = Math.floor(this.camera.position.x / CHUNK_WIDTH)
    const cameraChunkZ = Math.floor(this.camera.position.z / CHUNK_DEPTH)

    // LOD thresholds from config
    const lod0Max = this.performanceConfig.lodLevel0Max
    const lod1Max = this.performanceConfig.lodLevel1Max
    const lod2Max = this.performanceConfig.lodLevel2Max
    const hysteresis = this.performanceConfig.lodHysteresis

    // Iterate all loaded chunks
    const chunks = this.services.worldService.getAllChunks()
    for (const chunk of chunks) {
      const coord = chunk.coord

      // Calculate distance in chunks (Chebyshev distance for chunk grid)
      const dx = Math.abs(coord.x - cameraChunkX)
      const dz = Math.abs(coord.z - cameraChunkZ)
      const distance = Math.max(dx, dz)

      // Get current LOD level
      const currentLevel = this.services.meshingService.getChunkLODLevel(coord) ?? 0

      // Determine target LOD level with hysteresis
      // When moving away (increasing LOD), use threshold
      // When moving closer (decreasing LOD), use threshold + hysteresis
      let targetLevel: 0 | 1 | 2 | 3

      if (distance <= lod0Max) {
        targetLevel = 0
      } else if (distance <= lod1Max) {
        // Check hysteresis when transitioning from 0 to 1
        if (currentLevel === 0 && distance < lod0Max + hysteresis) {
          targetLevel = 0
        } else {
          targetLevel = 1
        }
      } else if (distance <= lod2Max) {
        // Check hysteresis when transitioning from 1 to 2
        if (currentLevel === 1 && distance < lod1Max + hysteresis) {
          targetLevel = 1
        } else {
          targetLevel = 2
        }
      } else {
        // Check hysteresis when transitioning from 2 to 3
        if (currentLevel === 2 && distance < lod2Max + hysteresis) {
          targetLevel = 2
        } else {
          targetLevel = 3
        }
      }

      // Only update if level changed
      if (targetLevel !== currentLevel) {
        this.services.meshingService.setChunkLODLevel(coord, targetLevel)
      }
    }
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
  getPostProcessingService() { return this.services.postProcessingService }

  // Debug methods
  enableEventTracing(): void { this.services.eventBus.enableTracing() }
  replayCommands(fromIndex: number): void { this.services.commandBus.replay(fromIndex) }
  getCommandLog(): readonly any[] { return this.services.commandBus.getLog() }

  // Performance metrics (used by main.ts debug helpers)
  getLODMetrics(): any { return this.services.performanceMonitor.getFrameMetrics() }
  setLODThresholds(_thresholds: any): void { /* LOD not implemented */ }
  getMetrics(): any { return this.services.performanceMonitor.getFrameMetrics() }
  getLastChunk(): any { return this.services.performanceMonitor.getLastChunkMetrics() }

  // Renderer setup for thumbnail capture
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.services.thumbnailCapture.setRenderer(renderer)
    console.log('ThumbnailCapture renderer set')
  }

  // World management access
  getWorldManager() { return this.services.worldManager }
  getThumbnailCapture() { return this.services.thumbnailCapture }

  // Services access (for async initialization)
  getServices() { return this.services }
}
