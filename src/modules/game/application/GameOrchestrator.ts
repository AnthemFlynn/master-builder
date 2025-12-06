// src/modules/game/application/GameOrchestrator.ts
import * as THREE from 'three'
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
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'

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

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
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

    // Register default input actions
    this.registerDefaultActions()

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

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const distance = this.renderDistance

    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const coord = new ChunkCoordinate(centerChunk.x + x, centerChunk.z + z)
        this.commandBus.send(new GenerateChunkCommand(coord, this.renderDistance))
      }
    }
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
