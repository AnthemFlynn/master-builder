// src/modules/terrain/application/TerrainOrchestrator.ts
import * as THREE from 'three'
import { WorldService } from '../../world/application/WorldService'
import { LightingService } from '../../world/lighting-application/LightingService'
import { MeshingService } from '../../rendering/meshing-application/MeshingService'
import { RenderingService } from '../../rendering/application/RenderingService'
import { CommandBus } from './CommandBus'
import { EventBus } from './EventBus'
import { GenerateChunkHandler } from './handlers/GenerateChunkHandler'
import { PlaceBlockHandler } from './handlers/PlaceBlockHandler'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'
import { PlaceBlockCommand } from '../domain/commands/PlaceBlockCommand'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { NoiseGenerator } from '../../world/adapters/NoiseGenerator'

export class TerrainOrchestrator {
  private worldService: WorldService
  private lightingService: LightingService
  private meshingService: MeshingService
  private renderingService: RenderingService
  private commandBus: CommandBus
  private eventBus: EventBus

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

    // Create modules
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

    console.log('✅ TerrainOrchestrator initialized with hexagonal architecture')

    // Generate initial chunks on startup
    const initialChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )
    this.generateChunksInRenderDistance(initialChunk)
    this.previousChunk = initialChunk
    console.log(`🌍 Generating initial ${(this.renderDistance * 2 + 1) ** 2} chunks around player`)
  }

  update(): void {
    // Update current chunk based on camera
    const newChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )

    // Generate chunks when entering new area
    if (!newChunk.equals(this.previousChunk)) {
      this.generateChunksInRenderDistance(newChunk)
      this.previousChunk = newChunk
    }

    // Process dirty mesh rebuilds (budgeted)
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

        // Send command to generate
        this.commandBus.send(
          new GenerateChunkCommand(coord, this.renderDistance)
        )
      }
    }
  }

  // Public API for debugging
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
