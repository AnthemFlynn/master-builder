// src/modules/game/application/GameOrchestrator.ts
import * as THREE from 'three'
import { WorldService } from '../../world/application/WorldService'
import { LightingService } from '../../world/lighting-application/LightingService'
import { MeshingService } from '../../rendering/meshing-application/MeshingService'
import { RenderingService } from '../../rendering/application/RenderingService'
import { CommandBus } from '../infrastructure/CommandBus'
import { EventBus } from '../infrastructure/EventBus'
import { GenerateChunkHandler } from './handlers/GenerateChunkHandler'
import { PlaceBlockHandler } from './handlers/PlaceBlockHandler'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'
import { PlaceBlockCommand } from '../domain/commands/PlaceBlockCommand'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { NoiseGenerator } from '../../world/adapters/NoiseGenerator'

export class GameOrchestrator {
  // Infrastructure
  public commandBus: CommandBus
  public eventBus: EventBus

  // Services
  private worldService: WorldService
  private lightingService: LightingService
  private meshingService: MeshingService
  private renderingService: RenderingService

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

    // Create services
    this.worldService = new WorldService()
    this.lightingService = new LightingService(this.worldService, this.eventBus)
    this.meshingService = new MeshingService(this.worldService, this.lightingService, this.eventBus)
    this.renderingService = new RenderingService(scene, this.eventBus)

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

    console.log('✅ GameOrchestrator initialized')

    // Generate initial chunks
    const initialChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )
    this.generateChunksInRenderDistance(initialChunk)
    this.previousChunk = initialChunk
  }

  update(): void {
    // Update chunks
    const newChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )

    if (!newChunk.equals(this.previousChunk)) {
      this.generateChunksInRenderDistance(newChunk)
      this.previousChunk = newChunk
    }

    this.meshingService.processDirtyQueue()
  }

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const distance = this.renderDistance

    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const coord = new ChunkCoordinate(
          centerChunk.x + x,
          centerChunk.z + z
        )

        this.commandBus.send(
          new GenerateChunkCommand(coord, this.renderDistance)
        )
      }
    }
  }

  // Expose services via getters (ports pattern)
  getWorldService(): WorldService {
    return this.worldService
  }

  // Debug
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
