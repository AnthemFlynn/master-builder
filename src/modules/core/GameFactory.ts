// src/modules/core/GameFactory.ts
/**
 * GameFactory - Composition Root
 *
 * Responsible for creating and wiring all game services.
 * Separates dependency injection from game orchestration logic.
 */
import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

// Shared infrastructure
import { CommandBus } from '../../shared/infrastructure/CommandBus'
import { EventBus } from '../../shared/infrastructure/EventBus'

// Services (all hexagonal modules)
import { WorldService } from '../world/application/WorldService'
import { MeshingService } from '../meshing/application/MeshingService'
import { RenderingService } from '../rendering/application/RenderingService'
import { PlayerService } from '../player/application/PlayerService'
import { PhysicsService } from '../physics/application/PhysicsService'
import { InputService } from '../input/application/InputService'
import { UIService } from '../ui/application/UIService'
import { AudioService } from '../audio/application/AudioService'
import { InteractionService } from '../building/application/InteractionService'
import { EnvironmentService } from '../environment/application/EnvironmentService'
import { InventoryService } from '../inventory/application/InventoryService'
import { PersistenceService } from '../persistence/application/PersistenceService'
import { AutoSaveManager } from '../persistence/application/AutoSaveManager'
import { ModificationTracker } from '../persistence/application/ModificationTracker'

// Infrastructure adapters
import { IndexedDBAdapter } from '../persistence/adapters/IndexedDBAdapter'
import { PerformanceMonitor } from './infrastructure/PerformanceMonitor'

// Command handlers
import { GenerateChunkHandler } from './application/handlers/GenerateChunkHandler'
import { PlaceBlockHandler } from './application/handlers/PlaceBlockHandler'
import { RemoveBlockHandler } from './application/handlers/RemoveBlockHandler'
import { SaveGameHandler } from '../persistence/application/handlers/SaveGameHandler'
import { LoadGameHandler } from '../persistence/application/handlers/LoadGameHandler'
import { SessionManager, SessionManagerCallbacks } from '../persistence/application/SessionManager'
import { WorldManager } from '../persistence/application/WorldManager'
import { ThumbnailCapture } from '../persistence/application/ThumbnailCapture'
import { PerformanceConfig } from './infrastructure/PerformanceConfig'

/**
 * All services and infrastructure created by the factory
 */
export interface GameServices {
  // Infrastructure
  commandBus: CommandBus
  eventBus: EventBus
  performanceMonitor: PerformanceMonitor
  cameraControls: PointerLockControls

  // Core services
  worldService: WorldService
  meshingService: MeshingService
  renderingService: RenderingService
  playerService: PlayerService
  physicsService: PhysicsService
  inputService: InputService
  uiService: UIService
  audioService: AudioService
  interactionService: InteractionService
  environmentService: EnvironmentService
  inventoryService: InventoryService

  // Persistence
  persistenceService: PersistenceService
  autoSaveManager: AutoSaveManager
  modificationTracker: ModificationTracker

  // World management
  worldManager: WorldManager
  thumbnailCapture: ThumbnailCapture

  // Session management
  sessionManager: SessionManager
}

/**
 * Callbacks that GameOrchestrator provides to services
 */
export interface OrchestratorCallbacks {
  requestPointerLock: () => void
  exitPointerLock: () => void
  getPlayerPosition: () => THREE.Vector3
  onStartNewGame: () => void
  onResumeGame: () => void
  onExitToMenu: () => void
  // Session manager callbacks
  sessionCallbacks: SessionManagerCallbacks
}

/**
 * Creates and wires all game services
 */
export function createGameServices(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  callbacks: OrchestratorCallbacks,
  performanceConfig?: PerformanceConfig
): GameServices {
  // Create camera controls
  const cameraControls = new PointerLockControls(camera, document.body)

  // Create infrastructure buses
  const commandBus = new CommandBus()
  const eventBus = new EventBus()
  const performanceMonitor = new PerformanceMonitor()

  // Create modification tracker (listens to block events)
  const modificationTracker = new ModificationTracker(eventBus)

  // Create core services (in dependency order)
  // Pass worker pool size from config (or use hardware-based default)
  const workerPoolSize = performanceConfig?.workerPoolSize ?? PerformanceConfig.getOptimalWorkerCount()
  const worldService = new WorldService(eventBus, workerPoolSize)
  const renderingService = new RenderingService(scene, eventBus)
  const playerService = new PlayerService(eventBus)
  const physicsService = new PhysicsService(worldService, playerService, eventBus)
  const inputService = new InputService(eventBus)
  const inventoryService = new InventoryService(eventBus)

  const uiService = new UIService(eventBus, {
    requestPointerLock: callbacks.requestPointerLock,
    exitPointerLock: callbacks.exitPointerLock,
    getPlayerPosition: callbacks.getPlayerPosition,
    onStartNewGame: callbacks.onStartNewGame,
    onResumeGame: callbacks.onResumeGame,
    onExitToMenu: callbacks.onExitToMenu
  }, inventoryService, performanceMonitor)

  const audioService = new AudioService(camera, eventBus)
  const interactionService = new InteractionService(commandBus, eventBus, scene, worldService)
  const environmentService = new EnvironmentService(scene, camera, eventBus)

  // Link services (resolve circular dependencies)
  worldService.setEnvironmentService(environmentService)
  worldService.setModificationTracker(modificationTracker)
  environmentService.setVoxelQuery(worldService)

  // MeshingService depends on World (voxels) and Environment (lighting)
  const meshingService = new MeshingService(
    worldService,
    environmentService,
    eventBus
  )

  // Create persistence infrastructure
  const indexedDBAdapter = new IndexedDBAdapter()
  const persistenceService = new PersistenceService(indexedDBAdapter)
  const autoSaveManager = new AutoSaveManager(commandBus)

  // Create world management (shares DB with persistence)
  const worldManager = new WorldManager(eventBus, indexedDBAdapter)
  const thumbnailCapture = new ThumbnailCapture()

  // Create session manager
  const sessionManager = new SessionManager(eventBus, callbacks.sessionCallbacks)

  // Register command handlers
  commandBus.register(
    'GenerateChunkCommand',
    new GenerateChunkHandler(worldService, eventBus)
  )
  commandBus.register(
    'PlaceBlockCommand',
    new PlaceBlockHandler(worldService, eventBus, playerService)
  )
  commandBus.register(
    'RemoveBlockCommand',
    new RemoveBlockHandler(worldService, eventBus)
  )
  commandBus.register(
    'SaveGameCommand',
    new SaveGameHandler(
      persistenceService,
      playerService,
      interactionService,
      environmentService,
      modificationTracker,
      eventBus,
      callbacks.sessionCallbacks.getCurrentWorldId
    )
  )
  commandBus.register(
    'LoadGameCommand',
    new LoadGameHandler(
      persistenceService,
      playerService,
      interactionService,
      environmentService,
      modificationTracker,
      worldService,
      eventBus
    )
  )

  return {
    commandBus,
    eventBus,
    performanceMonitor,
    cameraControls,
    worldService,
    meshingService,
    renderingService,
    playerService,
    physicsService,
    inputService,
    uiService,
    audioService,
    interactionService,
    environmentService,
    inventoryService,
    persistenceService,
    autoSaveManager,
    modificationTracker,
    worldManager,
    thumbnailCapture,
    sessionManager
  }
}

/**
 * Initialize async services (call after createGameServices)
 */
export async function initializeAsyncServices(
  services: GameServices,
  renderer?: THREE.WebGLRenderer
): Promise<void> {
  // Initialize IndexedDB
  await services.persistenceService.initialize()
  console.log('✅ Persistence module initialized')

  // Initialize WorldManager (uses same DB, handles migration)
  await services.worldManager.initialize()

  // Wire up UI services immediately after persistence is ready
  // (before rendering, so UI works even if rendering fails)
  services.uiService.setPersistence(services.commandBus, services.persistenceService)
  services.uiService.setWorldManager(services.worldManager)

  // Initialize rendering (loads texture arrays)
  // Wrapped in try-catch so rendering failures don't break the game
  try {
    await services.renderingService.initialize()
    console.log('✅ RenderingService initialized (texture arrays loaded)')
  } catch (error) {
    console.error('⚠️ RenderingService initialization failed (game will continue):', error)
  }

  // Set up thumbnail capture with renderer
  if (renderer) {
    services.thumbnailCapture.setRenderer(renderer)
    console.log('✅ ThumbnailCapture initialized')
  }

  // Start auto-save
  services.autoSaveManager.start()
}

/**
 * Setup debug helpers on window object
 */
export function setupDebugHelpers(
  services: GameServices
): void {
  (window as any).debug = {
    ...(window as any).debug,
    getMetrics: () => services.performanceMonitor.getFrameMetrics(),
    getLastChunk: () => services.performanceMonitor.getLastChunkMetrics(),

    loadWorld: async (worldPath: string) => {
      console.log(`🌍 Switching to world: ${worldPath}`)
      console.log('Note: Reload page after changing world file')
      return worldPath
    },

    listWorlds: () => [
      '/worlds/default.json - Sky Islands',
      '/worlds/caves.json - Massive Caves',
      '/worlds/forest.json - Giant Trees',
      '/worlds/crystals.json - Glowing Crystals',
      '/worlds/flat.json - Superflat Testing'
    ],

    // Event tracing
    enableTracing: () => services.eventBus.enableTracing(),
    disableTracing: () => services.eventBus.disableTracing(),

    // Command replay
    replayCommands: (fromIndex: number) => services.commandBus.replay(fromIndex),
    getCommandLog: () => services.commandBus.getLog()
  }
}
