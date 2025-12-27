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
import { ModificationTracker } from '../../persistence/application/ModificationTracker'
import { CommandBus } from '../../../shared/infrastructure/CommandBus'
import { EventBus } from '../../../shared/infrastructure/EventBus'
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
import { generateSpiralOrder } from '../../world/infrastructure/ChunkPriorityQueue'

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
  private modificationTracker: ModificationTracker
  private worldPreset = getWorldPreset(DEFAULT_WORLD_PRESET_ID)

  private currentChunk = new ChunkCoordinate(0, 0)
  private previousChunk = new ChunkCoordinate(0, 0)
  private renderDistance = 6  // Increased to see more islands
  private lastUpdateTime = performance.now()
  private lastChunkUnloadTime = performance.now()
  private chunkUnloadInterval = 10000 // Unload chunks every 10 seconds (less aggressive)
  private lastChunkFillTime = performance.now()
  private chunkFillInterval = 30000 // Check for missing chunks every 30 seconds (was 1s - caused CPU overload)
  private cameraControls: PointerLockControls

  // FPS smoothing
  private frameTimeHistory: number[] = []
  private readonly FPS_SAMPLE_SIZE = 60

  // Loading tracking
  private isLoadingWorld = false
  private loadingChunksTarget = 0
  private loadingChunksReady = new Set<string>()
  private loadingSpawnChunk: string = '0,0' // Track spawn chunk key
  private readonly LOAD_THRESHOLD = 0.80 // Portal fades at 80%
  private hasFoundGround = false // Track if we've placed player on ground
  private ignoreUnlockUntil = 0 // Timestamp to ignore pointer unlocks (grace period)

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

    // Create modification tracker (listens to block events)
    this.modificationTracker = new ModificationTracker(this.eventBus)

    // Make it available on window.debug
    ;(window as any).debug = {
      ...(window as any).debug,
      getMetrics: () => this.performanceMonitor.getFrameMetrics(),
      getLastChunk: () => this.performanceMonitor.getLastChunkMetrics(),

      // World switching
      loadWorld: async (worldPath: string) => {
        // This will require reloading all chunks
        // For now, just log - full implementation in follow-up
        console.log(`🌍 Switching to world: ${worldPath}`)
        console.log('Note: Reload page after changing world file')
        return worldPath
      },

      listWorlds: () => {
        return [
          '/worlds/default.json - Sky Islands',
          '/worlds/caves.json - Massive Caves',
          '/worlds/forest.json - Giant Trees',
          '/worlds/crystals.json - Glowing Crystals',
          '/worlds/flat.json - Superflat Testing'
        ]
      }
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
      exitPointerLock: () => this.cameraControls.unlock(),
      getPlayerPosition: () => this.playerService.getPosition(),
      onStartNewGame: () => this.startNewGame()
    }, this.inventoryService, this.performanceMonitor)
    this.audioService = new AudioService(camera, this.eventBus)
    this.interactionService = new InteractionService(this.commandBus, this.eventBus, scene, this.worldService)
    this.environmentService = new EnvironmentService(scene, camera, this.eventBus)

    // Link services (resolve circular dependencies)
    this.worldService.setEnvironmentService(this.environmentService)
    this.worldService.setModificationTracker(this.modificationTracker)
    this.environmentService.setVoxelQuery(this.worldService) // For underwater detection

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
      // Check if already locked to avoid race conditions with double-lock calls
      if (event.newState === UIState.PLAYING) {
          if (!document.pointerLockElement) {
              this.cameraControls.lock()
          }
      } else if (event.newState !== UIState.RADIAL_MENU && event.newState !== UIState.CREATIVE_INVENTORY) {
          // Don't unlock for radial/creative - they handle their own pointer state
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
      // Now that persistence is ready, wire up the save/load modal
      this.uiService.setPersistence(this.commandBus, this.persistenceService)
    }).catch((error) => {
      console.error('❌ Failed to initialize persistence:', error)
    })

    // Register persistence command handlers
    this.commandBus.register(
      'SaveGameCommand',
      new SaveGameHandler(
        this.persistenceService,
        this.playerService,
        this.interactionService,
        this.environmentService,
        this.modificationTracker,
        this.eventBus
      )
    )
    this.commandBus.register(
      'LoadGameCommand',
      new LoadGameHandler(
        this.persistenceService,
        this.playerService,
        this.interactionService,
        this.environmentService,
        this.modificationTracker,
        this.worldService,
        this.eventBus
      )
    )

    // Start auto-save
    this.autoSaveManager.start()

    // Register default input actions
    this.registerDefaultActions()

    // Setup interaction event listeners
    this.setupInteractionListeners()

    // Setup pointer lock listeners
    this.setupPointerLockListeners()

    // Listen for game load events to regenerate chunks
    this.eventBus.on('persistence', 'GameLoadedEvent', (event: any) => {
      console.log('📂 Game loaded, regenerating chunks around player position')

      const playerPos = event.playerPosition
      const centerChunk = new ChunkCoordinate(
        Math.floor(playerPos.x / 24),
        Math.floor(playerPos.z / 24)
      )

      // For loaded games, spawn at saved position (already on ground)
      this.camera.position.set(playerPos.x, playerPos.y, playerPos.z)
      this.playerService.updatePosition(this.camera.position)
      this.playerService.setMode(PlayerMode.Walking)
      this.playerService.setVelocity({ x: 0, y: 0, z: 0 })
      this.hasFoundGround = true // Already at saved position

      // Enter playing state and lock pointer
      this.cameraControls.lock()
      this.uiService.onPlay()

      this.previousChunk = centerChunk
      // Start loading mode and generate chunks
      this.startLoadingMode(centerChunk, 'Returning to World...')
    })

    // Track chunk mesh completion for loading progress
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (event: any) => {
      if (this.isLoadingWorld) {
        const key = `${event.chunkCoord.x},${event.chunkCoord.z}`
        this.loadingChunksReady.add(key)
        this.uiService.updateLoadingProgress(
          this.loadingChunksReady.size,
          this.loadingChunksTarget,
          'chunks'
        )

        // When spawn chunk is ready, place player on actual ground
        if (!this.hasFoundGround && key === this.loadingSpawnChunk) {
          this.placePlayerOnGround()
        }

        // Check if loading threshold met
        const progress = this.loadingChunksReady.size / this.loadingChunksTarget
        if (progress >= this.LOAD_THRESHOLD) {
          this.finishLoading()
        }
      }
    })

    console.log('✅ GameOrchestrator: All 10 modules initialized')

    // Don't auto-generate chunks - wait for user to click Play
    // Chunks will be generated when user clicks Play button
    const initialChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )
    this.previousChunk = initialChunk
  }

  /**
   * Called when user clicks Play - enters game immediately with loading overlay
   */
  startNewGame(): void {
    console.log('🆕 Starting new game...')

    // Clear any existing state from previous session
    this.worldService.clearAllChunks()
    this.modificationTracker.clear() // Fresh world with no modifications
    this.hasFoundGround = false

    // Spawn at default ground level - will adjust when spawn chunk loads
    // Portal overlay covers the view until world is ready
    this.camera.position.set(12, 45, 12)
    this.playerService.updatePosition(this.camera.position)
    this.playerService.setMode(PlayerMode.Walking)
    this.playerService.setVelocity({ x: 0, y: 0, z: 0 })

    // Enter PLAYING state IMMEDIATELY (before async loading)
    // This way pointer lock happens in user gesture context
    this.cameraControls.lock()
    this.uiService.onPlay()

    const centerChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )

    // Start loading with overlay (player is already in-game, can look around)
    this.startLoadingMode(centerChunk, 'Generating world...')
  }

  update(skipHeavyProcessing = false): void {
    const frameStart = performance.now()

    // Calculate delta time
    const now = performance.now()
    const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1) // Cap at 100ms
    this.lastUpdateTime = now

    // Update physics and player movement (always runs - essential for gameplay)
    this.updatePlayerMovement(deltaTime)
    this.interactionService.updateHighlight(this.camera)
    this.environmentService.update()

    // Skip heavy processing if we're severely behind schedule
    if (skipHeavyProcessing) {
      // Still process minimal meshing to prevent visual glitches
      const meshingResult = this.meshingService.processDirtyQueue(1) // Reduced budget
      this.recordFrameMetrics(frameStart, meshingResult)
      return
    }

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

    // Periodically check for and regenerate missing chunks within render distance
    // Only runs if there are actually missing chunks (prevents CPU overload from constant regeneration)
    if (now - this.lastChunkFillTime > this.chunkFillInterval) {
      if (this.hasMissingChunks(newChunk)) {
        this.generateChunksInRenderDistance(newChunk)
      }
      this.lastChunkFillTime = now
    }

    // Process meshing queue
    const meshingResult = this.meshingService.processDirtyQueue()

    // Record frame metrics and update UI
    this.recordFrameMetrics(frameStart, meshingResult)
  }

  private recordFrameMetrics(
    frameStart: number,
    meshingResult: { chunksProcessed: number; budgetUsedMs: number }
  ): void {
    // Record frame metrics with rolling average for FPS
    const frameEnd = performance.now()
    const frameTime = frameEnd - frameStart

    // Update rolling average
    this.frameTimeHistory.push(frameTime)
    if (this.frameTimeHistory.length > this.FPS_SAMPLE_SIZE) {
      this.frameTimeHistory.shift()
    }

    // Calculate average FPS from recent frames
    const avgFrameTime = this.frameTimeHistory.reduce((sum, ft) => sum + ft, 0) / this.frameTimeHistory.length
    const fps = 1000 / avgFrameTime

    this.performanceMonitor.recordFrameMetrics({
      fps,
      frameTimeMs: avgFrameTime,
      chunksProcessed: meshingResult.chunksProcessed,
      budgetUsedMs: meshingResult.budgetUsedMs
    })

    this.performanceMonitor.setQueueDepth('meshing', this.meshingService.getQueueDepth())
    this.performanceMonitor.setWorkerUtilization(
      'generation',
      this.worldService.getWorkerUtilization().busy,
      this.worldService.getWorkerUtilization().total
    )
    this.performanceMonitor.setWorkerUtilization(
      'lighting',
      this.environmentService.getWorkerUtilization().busy,
      this.environmentService.getWorkerUtilization().total
    )
    this.performanceMonitor.setWorkerUtilization(
      'meshing',
      this.meshingService.getWorkerUtilization().busy,
      this.meshingService.getWorkerUtilization().total
    )

    // Update UI (including debug overlay)
    this.uiService.update()
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
    // Use spiral ordering: center chunk first, then outward in rings
    // This ensures the player's immediate area loads before distant chunks
    const spiralOrder = generateSpiralOrder(centerChunk, this.renderDistance)

    // Send commands in spiral order (center first)
    for (const coord of spiralOrder) {
      this.commandBus.send(new GenerateChunkCommand(coord, this.renderDistance))
    }
  }

  /**
   * Start loading mode - shows loading screen and tracks chunk progress
   */
  private startLoadingMode(centerChunk: ChunkCoordinate, message = 'Loading world...'): void {
    this.isLoadingWorld = true
    this.loadingChunksReady.clear()

    // Track spawn chunk - MUST be ready before game starts
    this.loadingSpawnChunk = `${centerChunk.x},${centerChunk.z}`
    console.log(`📍 Spawn chunk: ${this.loadingSpawnChunk}`)

    // Calculate total chunks in render distance (circular area approximation)
    const diameter = this.renderDistance * 2 + 1
    this.loadingChunksTarget = diameter * diameter

    // Show loading screen
    this.uiService.showLoading(message)
    this.uiService.updateLoadingProgress(0, this.loadingChunksTarget, 'chunks')

    // Generate chunks
    this.generateChunksInRenderDistance(centerChunk)
  }

  /**
   * Place player on actual ground level when spawn chunk is ready
   */
  private placePlayerOnGround(): void {
    const x = this.camera.position.x
    const z = this.camera.position.z
    const groundY = this.findGroundLevel(x, z)
    // Spawn 3 blocks above ground - gravity will settle the player
    // This avoids edge cases where collision detection differs from our check
    const finalY = groundY + 3

    this.camera.position.y = finalY
    this.playerService.updatePosition(this.camera.position)
    this.hasFoundGround = true

    console.log(`📍 Placed player above ground at y=${finalY.toFixed(1)} (ground=${groundY})`)
  }

  /**
   * Finish loading mode - fade out portal overlay
   */
  private finishLoading(): void {
    if (!this.isLoadingWorld) return

    this.isLoadingWorld = false

    // Grace period: ignore pointer unlocks for 1.5 seconds after loading
    // Browser sometimes releases lock during animations
    this.ignoreUnlockUntil = Date.now() + 1500

    console.log(`✅ World loaded: ${this.loadingChunksReady.size}/${this.loadingChunksTarget} chunks ready`)

    // Fade out portal overlay (player is already on ground and in walking mode)
    this.uiService.collapsePortal(() => {
      console.log(`🎮 Portal faded, gameplay active`)
      // Re-lock pointer if it was lost during animation
      if (!document.pointerLockElement) {
        this.cameraControls.lock()
      }
    })

    console.log(`🎮 Loading complete, pointer locked: ${!!document.pointerLockElement}`)
  }

  /**
   * Find a safe spawn level (solid block with 2+ air blocks above)
   */
  private findGroundLevel(x: number, z: number): number {
    const chunkX = Math.floor(x / 24)
    const chunkZ = Math.floor(z / 24)
    const chunk = this.worldService.getChunk(new ChunkCoordinate(chunkX, chunkZ))

    if (!chunk) {
      console.warn(`⚠️ Spawn chunk not found, using default height`)
      return 64
    }

    // Local coordinates within chunk
    const localX = Math.floor(x) - chunkX * 24
    const localZ = Math.floor(z) - chunkZ * 24

    // Scan from top down to find solid block with 2 air blocks above (player headroom)
    for (let y = 253; y >= 0; y--) {
      const blockHere = chunk.getBlockId(localX, y, localZ)
      const blockAbove1 = chunk.getBlockId(localX, y + 1, localZ)
      const blockAbove2 = chunk.getBlockId(localX, y + 2, localZ)

      // Found solid ground with enough headroom
      if (blockHere !== 0 && blockAbove1 === 0 && blockAbove2 === 0) {
        return y + 1 // Stand on top of the block
      }
    }

    // No safe spot found, use default
    console.warn(`⚠️ No safe spawn found at (${x}, ${z}), using default height`)
    return 64
  }

  private hasMissingChunks(centerChunk: ChunkCoordinate): boolean {
    const distance = this.renderDistance
    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const coord = new ChunkCoordinate(centerChunk.x + x, centerChunk.z + z)
        if (!this.worldService.getChunk(coord)) {
          return true
        }
      }
    }
    return false
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
    // Lock event: Log for debugging
    this.cameraControls.addEventListener('lock', () => {
      console.log('🔒 Pointer locked')
    })

    // Unlock event: If unlocked externally (ESC), pause game.
    this.cameraControls.addEventListener('unlock', () => {
      console.log(`🔓 Pointer unlocked (UI state: ${this.uiService.getState()}, loading: ${this.isLoadingWorld})`)

      // During loading, ignore spurious unlocks from browser
      if (this.isLoadingWorld) {
        console.log('⏳ Ignoring unlock during loading')
        return
      }

      // Grace period after loading - browser releases lock during animations
      if (Date.now() < this.ignoreUnlockUntil) {
        console.log('⏳ Ignoring unlock during grace period, re-locking...')
        setTimeout(() => this.cameraControls.lock(), 100)
        return
      }

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
