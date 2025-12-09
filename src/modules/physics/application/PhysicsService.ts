import * as THREE from 'three'
import { MovementController } from './MovementController'
import { CollisionDetector } from './CollisionDetector'
import { IVoxelQuery } from '../../shared/ports/IVoxelQuery'
import { IPlayerQuery } from '../../player/ports/IPlayerQuery'
import PhysicsWorker from '../workers/PhysicsWorker?worker'
import { WorkerMessage, MainMessage } from '../workers/types'
import { PlayerService } from '../../player/application/PlayerService'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../../shared/domain/ChunkData'

export class PhysicsService {
  private worker: Worker
  private movementController: MovementController // This will be used in worker now
  private collisionDetector: CollisionDetector // This will be used in worker now

  constructor(
    private voxels: IVoxelQuery, // This is WorldService. The worker needs its own IVoxelQuery.
    private playerService: PlayerService // PlayerState is managed by PlayerService
  ) {
    this.worker = new PhysicsWorker()
    this.worker.onmessage = this.handleWorkerMessage.bind(this)
  }

  // Called by GameOrchestrator's update loop
  update(movementVector: any, camera: THREE.PerspectiveCamera, deltaTime: number): void {
    // Collect player state and world data for the worker
    const playerPosition = this.playerService.getPosition()
    const playerMode = this.playerService.getMode()
    const playerSpeed = this.playerService.getSpeed()
    const playerVelocity = this.playerService.getVelocity()
    const playerFalling = this.playerService.isFalling()
    const playerJumpVelocity = this.playerService.getJumpVelocity()
    
    // Collect chunks around the player for collision detection
    const playerChunkCoord = new ChunkCoordinate(
        Math.floor(playerPosition.x / 24),
        Math.floor(playerPosition.z / 24)
    )

    const worldVoxels: Record<string, ArrayBuffer> = {}
    const renderDistance = 1 // Only need immediate neighbors for physics
    for (let x = -renderDistance; x <= renderDistance; x++) {
      for (let z = -renderDistance; z <= renderDistance; z++) {
        const coord = new ChunkCoordinate(playerChunkCoord.x + x, playerChunkCoord.z + z)
        const chunk = this.voxels.getChunk(coord)
        if (chunk) {
          worldVoxels[coord.toKey()] = chunk.getRawBuffer()
        }
      }
    }

    const request: WorkerMessage = {
      type: 'UPDATE_PHYSICS',
      playerState: {
        position: { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z },
        velocity: { x: playerVelocity.x, y: playerVelocity.y, z: playerVelocity.z },
        mode: playerMode,
        speed: playerSpeed,
        falling: playerFalling,
        jumpVelocity: playerJumpVelocity,
        cameraQuaternion: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }
      },
      movementVector: movementVector,
      deltaTime: deltaTime,
      worldVoxels: worldVoxels
    }

    this.worker.postMessage(request)
  }

  private handleWorkerMessage(e: MessageEvent<MainMessage>) {
    const msg = e.data
    if (msg.type === 'PHYSICS_UPDATED') {
      const { playerState } = msg
      // Update PlayerService's state
      this.playerService.updatePosition(new THREE.Vector3(playerState.position.x, playerState.position.y, playerState.position.z))
      this.playerService.setVelocity(new THREE.Vector3(playerState.velocity.x, playerState.velocity.y, playerState.velocity.z))
      this.playerService.setFalling(playerState.falling)
      this.playerService.setJumpVelocity(playerState.jumpVelocity)
      this.playerService.setMode(playerState.mode) // Mode might change in worker (flying/walking)
    }
  }

  // This is no longer needed on main thread
  getMovementController(): MovementController {
    throw new Error("MovementController is now in PhysicsWorker")
  }
}
