import * as THREE from 'three'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { WorkerMessage, MainMessage, UpdateChunksRequest, UpdatePlayerRequest } from '../workers/types'
import { PlayerService } from '../../player/application/PlayerService'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../../../shared/constants/ChunkConstants'
import { EventBus } from '../../../shared/infrastructure/EventBus'

/**
 * PhysicsService - Manages physics simulation in a Web Worker
 *
 * Key optimization: Chunk caching in worker
 * - Worker maintains persistent chunk cache (no clear() every frame)
 * - Main thread tracks which chunks worker has
 * - UPDATE_CHUNKS sent only when chunks change (player moves chunk, block placed, etc.)
 * - UPDATE_PLAYER sent every frame (lightweight, ~200 bytes vs 2MB)
 */
export class PhysicsService {
  private worker: Worker

  // Chunk cache tracking
  private workerChunks = new Set<string>()  // Keys of chunks currently in worker
  private lastPlayerChunkX: number | null = null
  private lastPlayerChunkZ: number | null = null
  private pendingChunkSync = false  // Flag to sync chunks before next physics update
  private dirtyChunks = new Set<string>()  // Chunks modified since last sync

  // Physics window: 3x3 chunks around player (conservative, ensures coverage at boundaries)
  private readonly PHYSICS_RADIUS = 1

  constructor(
    private voxels: IVoxelQuery & { getChunk: any },
    private playerService: PlayerService,
    private eventBus?: EventBus
  ) {
    this.worker = new Worker("/assets/PhysicsWorker.js")
    this.worker.onmessage = this.handleWorkerMessage.bind(this)

    // Subscribe to chunk/block change events
    if (this.eventBus) {
      this.setupEventListeners()
    }
  }

  private setupEventListeners(): void {
    if (!this.eventBus) return

    // When a chunk is generated, mark it dirty if in physics window
    this.eventBus.on('world', 'ChunkGeneratedEvent', (e: any) => {
      const key = e.chunkCoord.toKey()
      if (this.isInPhysicsWindow(e.chunkCoord)) {
        this.dirtyChunks.add(key)
        this.pendingChunkSync = true
      }
    })

    // When a chunk is unloaded, remove from worker
    this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
      const key = e.chunkCoord.toKey()
      if (this.workerChunks.has(key)) {
        this.dirtyChunks.add(key)  // Will be removed in sync
        this.pendingChunkSync = true
      }
    })

    // When a block is placed/removed, update that chunk in worker
    this.eventBus.on('world', 'BlockPlacedEvent', (e: any) => {
      const key = e.chunkCoord.toKey()
      if (this.workerChunks.has(key) || this.isInPhysicsWindow(e.chunkCoord)) {
        this.dirtyChunks.add(key)
        this.pendingChunkSync = true
      }
    })

    this.eventBus.on('world', 'BlockRemovedEvent', (e: any) => {
      const key = e.chunkCoord.toKey()
      if (this.workerChunks.has(key) || this.isInPhysicsWindow(e.chunkCoord)) {
        this.dirtyChunks.add(key)
        this.pendingChunkSync = true
      }
    })
  }

  /**
   * Check if a chunk coordinate is within the physics window around the player
   */
  private isInPhysicsWindow(coord: ChunkCoordinate): boolean {
    if (this.lastPlayerChunkX === null || this.lastPlayerChunkZ === null) return false

    const dx = Math.abs(coord.x - this.lastPlayerChunkX)
    const dz = Math.abs(coord.z - this.lastPlayerChunkZ)
    return dx <= this.PHYSICS_RADIUS && dz <= this.PHYSICS_RADIUS
  }

  /**
   * Calculate the set of chunk keys needed for physics (3x3 around player)
   */
  private getNeededChunkKeys(playerChunkX: number, playerChunkZ: number): Set<string> {
    const needed = new Set<string>()
    for (let dx = -this.PHYSICS_RADIUS; dx <= this.PHYSICS_RADIUS; dx++) {
      for (let dz = -this.PHYSICS_RADIUS; dz <= this.PHYSICS_RADIUS; dz++) {
        const coord = new ChunkCoordinate(playerChunkX + dx, playerChunkZ + dz)
        needed.add(coord.toKey())
      }
    }
    return needed
  }

  /**
   * Sync chunks with worker - send UPDATE_CHUNKS message
   * Only sends chunks that need to be added or removed
   */
  private syncChunks(playerChunkX: number, playerChunkZ: number): void {
    const neededChunks = this.getNeededChunkKeys(playerChunkX, playerChunkZ)

    // Calculate what to add and remove
    const chunksToAdd: Record<string, ArrayBuffer> = {}
    const chunksToRemove: string[] = []

    // Add new chunks and dirty chunks
    for (const key of neededChunks) {
      const needsUpdate = !this.workerChunks.has(key) || this.dirtyChunks.has(key)
      if (needsUpdate) {
        const [cx, cz] = key.split(',').map(Number)
        const coord = new ChunkCoordinate(cx, cz)
        const chunk = this.voxels.getChunk(coord)
        if (chunk) {
          // Use native format (sparse sections) - much smaller than flat 400KB buffer
          chunksToAdd[key] = chunk.serializeNative()
        }
      }
    }

    // Remove chunks that are no longer needed
    for (const key of this.workerChunks) {
      if (!neededChunks.has(key)) {
        chunksToRemove.push(key)
      }
    }

    // Clear dirty tracking
    this.dirtyChunks.clear()

    // Only send if there are changes
    if (Object.keys(chunksToAdd).length > 0 || chunksToRemove.length > 0) {
      const request: UpdateChunksRequest = {
        type: 'UPDATE_CHUNKS',
        chunksToAdd,
        chunksToRemove
      }
      this.worker.postMessage(request)

      // Update our tracking (optimistic - will be confirmed by CHUNKS_UPDATED response)
      for (const key of Object.keys(chunksToAdd)) {
        this.workerChunks.add(key)
      }
      for (const key of chunksToRemove) {
        this.workerChunks.delete(key)
      }
    }

    this.pendingChunkSync = false
  }

  /**
   * Called by GameOrchestrator's update loop every frame
   */
  update(movementVector: any, camera: THREE.PerspectiveCamera, deltaTime: number): void {
    const playerPosition = this.playerService.getPosition()

    // Calculate player's current chunk
    const playerChunkX = Math.floor(playerPosition.x / CHUNK_WIDTH)
    const playerChunkZ = Math.floor(playerPosition.z / CHUNK_DEPTH)

    // Check if player moved to a new chunk
    const chunkChanged = playerChunkX !== this.lastPlayerChunkX || playerChunkZ !== this.lastPlayerChunkZ

    // Sync chunks if needed (player moved chunk, block changed, or initial load)
    if (chunkChanged || this.pendingChunkSync || this.workerChunks.size === 0) {
      this.lastPlayerChunkX = playerChunkX
      this.lastPlayerChunkZ = playerChunkZ
      this.syncChunks(playerChunkX, playerChunkZ)
    }

    // Send lightweight player update (no chunk data!)
    const request: UpdatePlayerRequest = {
      type: 'UPDATE_PLAYER',
      playerState: {
        position: { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z },
        velocity: {
          x: this.playerService.getVelocity().x,
          y: this.playerService.getVelocity().y,
          z: this.playerService.getVelocity().z
        },
        mode: this.playerService.getMode(),
        speed: this.playerService.getSpeed(),
        falling: this.playerService.isFalling(),
        jumpVelocity: this.playerService.getJumpVelocity(),
        cameraQuaternion: {
          x: camera.quaternion.x,
          y: camera.quaternion.y,
          z: camera.quaternion.z,
          w: camera.quaternion.w
        }
      },
      movementVector,
      deltaTime
    }

    this.worker.postMessage(request)
  }

  private handleWorkerMessage(e: MessageEvent<MainMessage>) {
    const msg = e.data

    if (msg.type === 'PHYSICS_UPDATED') {
      const { playerState } = msg
      this.playerService.updatePosition(new THREE.Vector3(
        playerState.position.x,
        playerState.position.y,
        playerState.position.z
      ))
      this.playerService.setVelocity(new THREE.Vector3(
        playerState.velocity.x,
        playerState.velocity.y,
        playerState.velocity.z
      ))
      this.playerService.setFalling(playerState.falling)
      this.playerService.setJumpVelocity(playerState.jumpVelocity)
      this.playerService.setMode(playerState.mode)
    } else if (msg.type === 'CHUNKS_UPDATED') {
      // Sync our tracking with worker's confirmed state
      this.workerChunks = new Set(msg.cachedChunkKeys)
    }
  }
}
