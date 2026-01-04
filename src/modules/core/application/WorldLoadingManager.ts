// src/modules/core/application/WorldLoadingManager.ts
/**
 * WorldLoadingManager - Handles world loading state machine
 *
 * Extracted from GameOrchestrator to separate the loading logic from
 * the main game loop. Manages chunk generation, player placement,
 * and loading progress tracking.
 */
import * as THREE from 'three'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { CommandBus } from '../../../shared/infrastructure/CommandBus'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { WorldService } from '../../world/application/WorldService'
import { UIService } from '../../ui/application/UIService'
import { PlayerService } from '../../player/application/PlayerService'
import { SessionManager } from '../../persistence/application/SessionManager'
import { PlayerMode } from '../../player/domain/PlayerMode'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'
import { generateSpiralOrder } from '../../world/infrastructure/ChunkPriorityQueue'
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_HEIGHT } from '../../../shared/constants/ChunkConstants'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { WorldManager } from '../../persistence/application/WorldManager'

export interface WorldLoadingDependencies {
  worldService: WorldService
  uiService: UIService
  playerService: PlayerService
  sessionManager: SessionManager
  cameraControls: PointerLockControls
  worldManager: WorldManager
  eventBus: EventBus
  commandBus: CommandBus
  camera: THREE.PerspectiveCamera
}

export class WorldLoadingManager {
  // Loading state
  private isLoadingWorld = false
  private loadingChunksTarget = 0
  private loadingChunksReady = new Set<string>()
  private loadingSpawnChunk = '0,0'
  private readonly LOAD_THRESHOLD = 0.80
  private hasFoundGround = false

  // Pointer lock ignore timer (shared with orchestrator via callback)
  private ignoreUnlockUntil = 0

  // Dependencies
  private worldService: WorldService
  private uiService: UIService
  private playerService: PlayerService
  private sessionManager: SessionManager
  private cameraControls: PointerLockControls
  private worldManager: WorldManager
  private eventBus: EventBus
  private commandBus: CommandBus
  private camera: THREE.PerspectiveCamera

  // Render distance (passed from orchestrator)
  private renderDistance = 4

  constructor(deps: WorldLoadingDependencies) {
    this.worldService = deps.worldService
    this.uiService = deps.uiService
    this.playerService = deps.playerService
    this.sessionManager = deps.sessionManager
    this.cameraControls = deps.cameraControls
    this.worldManager = deps.worldManager
    this.eventBus = deps.eventBus
    this.commandBus = deps.commandBus
    this.camera = deps.camera

    this.setupLoadingListeners()
  }

  /**
   * Set render distance (called by orchestrator)
   */
  setRenderDistance(distance: number): void {
    this.renderDistance = distance
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.isLoadingWorld
  }

  /**
   * Get the ignore unlock timer (used by orchestrator for pointer lock handling)
   */
  getIgnoreUnlockUntil(): number {
    return this.ignoreUnlockUntil
  }

  /**
   * Set ignore unlock timer (used when closing menus)
   */
  setIgnoreUnlockUntil(timestamp: number): void {
    this.ignoreUnlockUntil = timestamp
  }

  /**
   * Start a new game - handles world type lookup and loading mode
   */
  async startNewGame(worldId?: string): Promise<void> {
    const targetWorldId = worldId || 'default'
    console.log(`Starting new game with world: ${targetWorldId}`)

    // Get the world type from the world entity
    let worldType = 'default'
    if (worldId) {
      const world = await this.worldManager.getWorld(worldId)
      if (world) {
        worldType = world.worldType || 'default'
        console.log(`World type: ${worldType} (from world: ${world.name})`)
      }
    }

    // Start session
    this.sessionManager.startNewSession(targetWorldId)

    // Clear existing state
    this.worldService.clearAllChunks()
    this.hasFoundGround = false

    // Spawn at default position
    this.camera.position.set(12, 45, 12)
    this.camera.rotation.set(0, 0, 0)
    this.playerService.updatePosition(this.camera.position)
    this.playerService.setMode(PlayerMode.Walking)
    this.playerService.setVelocity({ x: 0, y: 0, z: 0 })

    // Enter PLAYING state immediately
    this.cameraControls.lock()
    this.uiService.onPlay()

    const centerChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / CHUNK_WIDTH),
      Math.floor(this.camera.position.z / CHUNK_DEPTH)
    )

    await this.startLoadingMode(centerChunk, 'Generating world...', worldType)
  }

  /**
   * Handle game loaded event - restore player position and start loading
   */
  async onGameLoaded(event: {
    playerPosition: { x: number; y: number; z: number }
    worldId?: string
  }): Promise<void> {
    console.log('Game loaded, regenerating chunks')

    const playerPos = event.playerPosition
    const centerChunk = new ChunkCoordinate(
      Math.floor(playerPos.x / CHUNK_WIDTH),
      Math.floor(playerPos.z / CHUNK_DEPTH)
    )

    this.camera.position.set(playerPos.x, playerPos.y, playerPos.z)
    this.playerService.updatePosition(this.camera.position)
    this.playerService.setMode(PlayerMode.Walking)
    this.playerService.setVelocity({ x: 0, y: 0, z: 0 })
    this.hasFoundGround = true

    this.cameraControls.lock()
    this.uiService.onPlay()

    // Get world type from the world entity
    let worldType = 'default'
    if (event.worldId) {
      const world = await this.worldManager.getWorld(event.worldId)
      if (world) {
        worldType = world.worldType || 'default'
        console.log(`Loaded world type: ${worldType}`)
      }
    }

    await this.startLoadingMode(centerChunk, 'Returning to World...', worldType)
  }

  // === Private Methods ===

  private setupLoadingListeners(): void {
    // Listen for game load events
    this.eventBus.on('persistence', 'GameLoadedEvent', (event: any) => {
      this.onGameLoaded(event)
    })

    // Track chunk mesh completion
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (event: any) => {
      if (this.isLoadingWorld) {
        const key = event.chunkCoord.x + ',' + event.chunkCoord.z
        this.loadingChunksReady.add(key)
        this.uiService.updateLoadingProgress(
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

  private async startLoadingMode(
    centerChunk: ChunkCoordinate,
    message = 'Loading world...',
    worldType = 'default'
  ): Promise<void> {
    this.isLoadingWorld = true
    this.loadingChunksReady.clear()
    this.loadingSpawnChunk = centerChunk.x + ',' + centerChunk.z

    const diameter = this.renderDistance * 2 + 1
    this.loadingChunksTarget = diameter * diameter

    this.uiService.showLoading(message)
    this.uiService.updateLoadingProgress(0, this.loadingChunksTarget, 'chunks')

    // Set world type on all workers BEFORE generating chunks
    await this.worldService.setWorldType(worldType)

    this.generateChunksInRenderDistance(centerChunk)
  }

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const spiralOrder = generateSpiralOrder(centerChunk, this.renderDistance)
    for (const coord of spiralOrder) {
      this.commandBus.send(new GenerateChunkCommand(coord, this.renderDistance))
    }
  }

  private placePlayerOnGround(): void {
    const x = this.camera.position.x
    const z = this.camera.position.z
    const groundY = this.findGroundLevel(x, z)
    const finalY = groundY + 3

    this.camera.position.y = finalY
    this.playerService.updatePosition(this.camera.position)
    this.hasFoundGround = true
    console.log('Placed player at y=' + finalY.toFixed(1))
  }

  private finishLoading(): void {
    if (!this.isLoadingWorld) return

    // Always place player on ground before finishing
    if (!this.hasFoundGround) {
      this.placePlayerOnGround()
    }

    this.isLoadingWorld = false
    this.ignoreUnlockUntil = Date.now() + 1500

    console.log('World loaded: ' + this.loadingChunksReady.size + '/' + this.loadingChunksTarget + ' chunks')

    // Notify SessionManager that loading is complete
    this.sessionManager.onLoadingComplete()

    this.uiService.collapsePortal(() => {
      if (!document.pointerLockElement) {
        this.cameraControls.lock()
      }
    })
  }

  private findGroundLevel(x: number, z: number): number {
    const chunkX = Math.floor(x / CHUNK_WIDTH)
    const chunkZ = Math.floor(z / CHUNK_DEPTH)
    const chunk = this.worldService.getChunk(new ChunkCoordinate(chunkX, chunkZ))

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
}
