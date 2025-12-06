// src/modules/game/application/GameOrchestrator.ts
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { WorldService } from '../../world/application/WorldService'
import { LightingService } from '../../world/lighting-application/LightingService'
import { MeshingService } from '../../rendering/meshing-application/MeshingService'
import { RenderingService } from '../../rendering/application/RenderingService'
import { PlayerService } from '../../player/application/PlayerService'
import { PhysicsService } from '../../physics/application/PhysicsService'
import { InputService } from '../../input/application/InputService'
import { UIService } from '../../ui/application/UIService'
import { AudioService } from '../../audio/application/AudioService'
import { InteractionService } from '../../interaction/application/InteractionService'
import { CommandBus } from '../infrastructure/CommandBus'
import { EventBus } from '../infrastructure/EventBus'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { NoiseGenerator } from '../../world/adapters/NoiseGenerator'
import { GenerateChunkHandler } from './handlers/GenerateChunkHandler'
import { PlaceBlockHandler } from './handlers/PlaceBlockHandler'
import { RemoveBlockHandler } from './handlers/RemoveBlockHandler'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'
import { MovementVector } from '../../physics/domain/MovementVector'
import { PlayerMode } from '../../player/domain/PlayerMode'

export class GameOrchestrator {
  // Infrastructure
  public commandBus: CommandBus
  public eventBus: EventBus

  // Services (all 9 hexagonal modules)
  private worldService: WorldService
  private lightingService: LightingService
  private meshingService: MeshingService
  private renderingService: RenderingService
  private playerService: PlayerService
  private physicsService: PhysicsService
  private inputService: InputService
  private uiService: UIService
  private audioService: AudioService
  private interactionService: InteractionService

  private currentChunk = new ChunkCoordinate(0, 0)
  private previousChunk = new ChunkCoordinate(0, 0)
  private renderDistance = 3
  private lastUpdateTime = performance.now()
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

    // Create all services (in dependency order)
    this.worldService = new WorldService()
    this.lightingService = new LightingService(this.worldService, this.eventBus)
    this.meshingService = new MeshingService(this.worldService, this.lightingService, this.eventBus)
    this.renderingService = new RenderingService(scene, this.eventBus)
    this.playerService = new PlayerService(this.eventBus)
    this.physicsService = new PhysicsService(this.worldService, this.playerService, scene)
    this.inputService = new InputService(this.eventBus)
    this.uiService = new UIService(this.eventBus)
    this.audioService = new AudioService(camera, this.eventBus)
    this.interactionService = new InteractionService(this.commandBus, this.eventBus, scene)

    // Register command handlers
    const terrainGenerator = new NoiseGenerator()
    this.commandBus.register(
      'GenerateChunkCommand',
      new GenerateChunkHandler(this.worldService, this.eventBus, terrainGenerator)
    )
    this.commandBus.register(
      'PlaceBlockCommand',
      new PlaceBlockHandler(this.worldService, this.eventBus)
    )
    this.commandBus.register(
      'RemoveBlockCommand',
      new RemoveBlockHandler(this.worldService, this.eventBus)
    )

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
    // Calculate delta time
    const now = performance.now()
    const deltaTime = Math.min((now - this.lastUpdateTime) / 1000, 0.1) // Cap at 100ms
    this.lastUpdateTime = now

    // Update physics and player movement
    this.updatePlayerMovement(deltaTime)

    // Update chunks based on camera position
    const newChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )

    if (!newChunk.equals(this.previousChunk)) {
      this.generateChunksInRenderDistance(newChunk)
      this.previousChunk = newChunk
    }

    // Process meshing queue
    this.meshingService.processDirtyQueue()
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
    if (this.inputService.isActionPressed('move_up')) {
      movement.vertical += 1
    }
    if (this.inputService.isActionPressed('move_down')) {
      movement.vertical -= 1
    }

    // Apply movement through physics
    const movementController = this.physicsService.getMovementController()
    const newPosition = movementController.applyMovement(movement, this.camera, deltaTime)

    // Update player position
    this.playerService.updatePosition(newPosition)

    // Sync camera to player position
    this.camera.position.copy(newPosition)
  }

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const distance = this.renderDistance

    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const coord = new ChunkCoordinate(centerChunk.x + x, centerChunk.z + z)
        this.commandBus.send(new GenerateChunkCommand(coord, this.renderDistance))
      }
    }
  }

  private setupInteractionListeners(): void {
    // Listen for block placement/removal from input system
    this.eventBus.on('input', 'InputActionEvent', (event: any) => {
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
      }
      if (event.action === 'pause' && event.eventType === 'pressed') {
        if (this.uiService.isPlaying()) {
          document.exitPointerLock()
        }
      }

      // Block selection (1-9 keys)
      for (let i = 1; i <= 9; i++) {
        if (event.action === `select_block_${i}` && event.eventType === 'pressed') {
          this.interactionService.setSelectedBlock(i - 1)
          this.uiService.setSelectedSlot(i - 1)
        }
      }
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

    this.inputService.registerAction({
      id: 'move_down',
      category: 'movement',
      description: 'Move down/Sneak',
      defaultKey: 'ShiftLeft'
    })

    // Interaction
    this.inputService.registerAction({
      id: 'place_block',
      category: 'building',
      description: 'Place block',
      defaultKey: 'mouse:right'
    })

    this.inputService.registerAction({
      id: 'remove_block',
      category: 'building',
      description: 'Remove block',
      defaultKey: 'mouse:left'
    })

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
      defaultKey: 'KeyQ'
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
  }

  private setupPointerLockListeners(): void {
    // Listen for pointer lock changes
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        // Pointer locked - enable camera controls
        this.cameraControls.lock()
      } else {
        // Pointer unlocked - trigger pause
        if (this.uiService.isPlaying()) {
          this.uiService.onPause()
        }
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
