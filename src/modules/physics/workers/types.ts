import { MovementVector } from '../../domain/MovementVector'
import { PlayerMode } from '../../player/domain/PlayerMode'

// Shared player state structure
export interface SerializedPlayerState {
  position: { x: number, y: number, z: number }
  velocity: { x: number, y: number, z: number }
  mode: PlayerMode
  speed: number
  falling: boolean
  jumpVelocity: number
  cameraQuaternion: { x: number, y: number, z: number, w: number }
}

// UPDATE_CHUNKS: Sent when chunks need to be added/removed from worker cache
// - On player chunk boundary crossing
// - On block placed/removed in physics window
// - On chunk generated/unloaded in physics window
export interface UpdateChunksRequest {
  type: 'UPDATE_CHUNKS'
  chunksToAdd: Record<string, ArrayBuffer>  // key -> buffer (for new/modified chunks)
  chunksToRemove: string[]                   // keys of chunks to remove
}

// UPDATE_PLAYER: Lightweight per-frame physics update (no chunk data)
export interface UpdatePlayerRequest {
  type: 'UPDATE_PLAYER'
  playerState: SerializedPlayerState
  movementVector: MovementVector
  deltaTime: number
}

// Legacy message type (kept for backwards compatibility during migration)
export interface LegacyPhysicsRequest {
  type: 'UPDATE_PHYSICS'
  playerState: SerializedPlayerState
  movementVector: MovementVector
  deltaTime: number
  worldVoxels: Record<string, ArrayBuffer>
}

export type PhysicsWorkerRequest =
  | UpdateChunksRequest
  | UpdatePlayerRequest
  | LegacyPhysicsRequest

export type PhysicsWorkerResponse = {
  type: 'PHYSICS_UPDATED'
  playerState: {
    position: { x: number, y: number, z: number }
    velocity: { x: number, y: number, z: number }
    mode: PlayerMode
    speed: number
    falling: boolean
    jumpVelocity: number
  }
} | {
  type: 'CHUNKS_UPDATED'
  cachedChunkKeys: string[]  // Confirm which chunks are now in cache
}

export type WorkerMessage = PhysicsWorkerRequest
export type MainMessage = PhysicsWorkerResponse
