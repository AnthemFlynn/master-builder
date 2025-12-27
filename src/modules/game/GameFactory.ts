// src/modules/game/GameFactory.ts
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
import { MeshingService } from '../rendering/meshing-application/MeshingService'
import { RenderingService } from '../rendering/application/RenderingService'
import { PlayerService } from '../player/application/PlayerService'
import { PhysicsService } from '../physics/application/PhysicsService'
import { InputService } from '../input/application/InputService'
import { UIService } from '../ui/application/UIService'
import { AudioService } from '../audio/application/AudioService'
import { InteractionService } from '../interaction/application/InteractionService'
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
}

/**
 * Callbacks that GameOrchestrator provides to services
 */
export interface OrchestratorCallbacks {
  requestPointerLock: () => void
  exitPointerLock: () => void
  getPlayerPosition: () => THREE.Vector3
  onStartNewGame: () => void
}

/**
 * Creates and wires all game services
 */
export function createGameServices(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  callbacks: OrchestratorCallbacks
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
  const worldService = new WorldService(eventBus)
  const renderingService = new RenderingService(scene, eventBus)
  const playerService = new PlayerService(eventBus)
  const physicsService = new PhysicsService(worldService, playerService)
  const inputService = new InputService(eventBus)
  const inventoryService = new InventoryService(eventBus)

  const uiService = new UIService(eventBus, {
    requestPointerLock: callbacks.requestPointerLock,
    exitPointerLock: callbacks.exitPointerLock,
    getPlayerPosition: callbacks.getPlayerPosition,
    onStartNewGame: callbacks.onStartNewGame
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
      eventBus
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
    modificationTracker
  }
}

/**
 * Initialize async services (call after createGameServices)
 */
export async function initializeAsyncServices(
  services: GameServices
): Promise<void> {
  // Initialize IndexedDB
  await services.persistenceService.initialize()
  console.log('✅ Persistence module initialized')

  // Wire up save/load modal now that persistence is ready
  services.uiService.setPersistence(services.commandBus, services.persistenceService)

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
