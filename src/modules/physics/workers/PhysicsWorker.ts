import * as THREE from 'three'
import { MovementVector } from '../../domain/MovementVector.ts'
import { CollisionDetector } from '../application/CollisionDetector.ts'
import { WorkerVoxelQuery } from '../../../shared/workers/WorkerVoxelQuery'
import { PlayerMode } from '../../player/domain/PlayerMode.ts'
import { ChunkColumn } from '../../../shared/domain/ChunkColumn.ts'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate.ts'
import { MovementController } from '../application/MovementController.ts'
import { initializeBlockRegistry } from '../../../modules/world/blocks/index.ts'
import { WorkerMessage, MainMessage, SerializedPlayerState } from './types'

// Initialize block registry for this worker
initializeBlockRegistry()

// Global instances for worker (avoids re-creation/GC)
// IMPORTANT: workerVoxelQuery is now PERSISTENT - chunks are cached, not cleared every frame
const workerVoxelQuery = new WorkerVoxelQuery()
const collisionDetector = new CollisionDetector(workerVoxelQuery)
const movementController = new MovementController(collisionDetector, null as any)

// Reconstruct THREE objects once to avoid allocation
const playerPosition = new THREE.Vector3()
const playerVelocity = new THREE.Vector3()
const cameraQuaternion = new THREE.Quaternion()

/**
 * Process chunk updates (add/remove chunks from cache)
 * Called when player moves to new chunk or blocks change
 */
function handleUpdateChunks(chunksToAdd: Record<string, ArrayBuffer>, chunksToRemove: string[]): void {
  // Remove old chunks first
  for (const key of chunksToRemove) {
    workerVoxelQuery.removeChunk(key)
  }

  // Add new/modified chunks (using native sparse format)
  for (const key in chunksToAdd) {
    const buffer = chunksToAdd[key]
    const [cx, cz] = key.split(',').map(Number)
    const coord = new ChunkCoordinate(cx, cz)
    // Deserialize from native format (sparse sections, much smaller than flat buffer)
    const chunk = ChunkColumn.deserializeNative(coord, buffer)
    workerVoxelQuery.addChunk(chunk)
  }

  // Send confirmation with current cache state
  const response: MainMessage = {
    type: 'CHUNKS_UPDATED',
    cachedChunkKeys: workerVoxelQuery.getChunkKeys()
  }
  self.postMessage(response)
}

/**
 * Process physics update (lightweight, uses cached chunks)
 * Called every frame
 */
function handleUpdatePlayer(
  rawPlayerState: SerializedPlayerState,
  movementVector: MovementVector,
  deltaTime: number
): void {
  // Reconstruct player state from serialized data
  playerPosition.set(rawPlayerState.position.x, rawPlayerState.position.y, rawPlayerState.position.z)
  playerVelocity.set(rawPlayerState.velocity.x, rawPlayerState.velocity.y, rawPlayerState.velocity.z)
  cameraQuaternion.set(
    rawPlayerState.cameraQuaternion.x,
    rawPlayerState.cameraQuaternion.y,
    rawPlayerState.cameraQuaternion.z,
    rawPlayerState.cameraQuaternion.w
  )

  // Set player-related state on the MovementController
  const workerPlayerState = {
    getPosition: () => playerPosition,
    getVelocity: () => playerVelocity,
    getMode: () => rawPlayerState.mode,
    getSpeed: () => rawPlayerState.speed,
    isFlying: () => rawPlayerState.mode === PlayerMode.Flying,
    isFalling: () => rawPlayerState.falling,
    getJumpVelocity: () => rawPlayerState.jumpVelocity,
    updatePosition: (p: THREE.Vector3) => playerPosition.copy(p),
    setVelocity: (v: THREE.Vector3) => playerVelocity.copy(v),
    setFalling: (f: boolean) => (rawPlayerState.falling = f),
    setJumpVelocity: (jv: number) => (rawPlayerState.jumpVelocity = jv),
    setMode: (m: PlayerMode) => (rawPlayerState.mode = m)
  };

  (movementController as any).player = workerPlayerState

  // Calculate new position using CACHED chunks (no re-hydration!)
  const newPosition = movementController.applyMovement(movementVector, cameraQuaternion, deltaTime)
  playerPosition.copy(newPosition)

  // Prepare response
  const response: MainMessage = {
    type: 'PHYSICS_UPDATED',
    playerState: {
      position: { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z },
      velocity: { x: playerVelocity.x, y: playerVelocity.y, z: playerVelocity.z },
      mode: workerPlayerState.getMode(),
      speed: workerPlayerState.getSpeed(),
      falling: workerPlayerState.isFalling(),
      jumpVelocity: workerPlayerState.getJumpVelocity()
    }
  }

  self.postMessage(response)
}

/**
 * Legacy handler for UPDATE_PHYSICS (backwards compatibility)
 * Still clears and re-hydrates chunks every frame - will be removed after migration
 */
function handleLegacyPhysics(
  rawPlayerState: SerializedPlayerState,
  movementVector: MovementVector,
  deltaTime: number,
  worldVoxels: Record<string, ArrayBuffer>
): void {
  // Legacy behavior: clear and re-hydrate every frame
  workerVoxelQuery.clear()
  for (const key in worldVoxels) {
    const buffer = worldVoxels[key]
    const [cx, cz] = key.split(',').map(Number)
    workerVoxelQuery.addChunk(new ChunkData(new ChunkCoordinate(cx, cz), buffer))
  }

  // Then run physics as normal
  handleUpdatePlayer(rawPlayerState, movementVector, deltaTime)
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const msg = e.data

    switch (msg.type) {
      case 'UPDATE_CHUNKS':
        handleUpdateChunks(msg.chunksToAdd, msg.chunksToRemove)
        break

      case 'UPDATE_PLAYER':
        handleUpdatePlayer(msg.playerState, msg.movementVector, msg.deltaTime)
        break

      case 'UPDATE_PHYSICS':
        // Legacy path - still supported but inefficient
        handleLegacyPhysics(msg.playerState, msg.movementVector, msg.deltaTime, msg.worldVoxels)
        break

      default:
        console.warn('[PhysicsWorker] Unknown message type:', (msg as any).type)
    }
  } catch (error) {
    console.error('[PhysicsWorker] Error processing message:', error)
    self.postMessage({
      type: 'PHYSICS_ERROR',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
