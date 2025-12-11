import { MovementVector } from '../../domain/MovementVector'
import { PlayerMode } from '../../player/domain/PlayerMode'

export type PhysicsWorkerRequest = {
  type: 'UPDATE_PHYSICS'
  playerState: {
    position: { x: number, y: number, z: number }
    velocity: { x: number, y: number, z: number }
    mode: PlayerMode // PlayerMode enum
    speed: number
    falling: boolean
    jumpVelocity: number
    cameraQuaternion: { x: number, y: number, z: number, w: number }
  }
  movementVector: MovementVector
  deltaTime: number
  worldVoxels: Record<string, ArrayBuffer>
}

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
}

export type WorkerMessage = PhysicsWorkerRequest
export type MainMessage = PhysicsWorkerResponse