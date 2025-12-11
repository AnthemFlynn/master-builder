import * as THREE from 'three'
import { MovementVector } from '../../domain/MovementVector.ts'
import { CollisionDetector } from '../application/CollisionDetector.ts'
import { WorkerVoxelQuery } from './WorkerVoxelQuery.ts'
import { PlayerMode } from '../../player/domain/PlayerMode.ts' // Corrected path
import { ChunkData } from '../../../shared/domain/ChunkData.ts'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate.ts'
import { MovementController } from '../application/MovementController.ts'
import { initializeBlockRegistry } from '../../../modules/blocks/index.ts'

// Initialize block registry for this worker
initializeBlockRegistry()

// Global instances for worker (avoids re-creation/GC)
const workerVoxelQuery = new WorkerVoxelQuery()
const collisionDetector = new CollisionDetector(workerVoxelQuery)
const movementController = new MovementController(collisionDetector, null as any) // PlayerState will be set per message

// Reconstruct THREE objects once to avoid allocation
const playerPosition = new THREE.Vector3()
const playerVelocity = new THREE.Vector3()
const cameraQuaternion = new THREE.Quaternion()
const cameraForward = new THREE.Vector3()
const cameraRight = new THREE.Vector3()
const cameraUp = new THREE.Vector3(0,1,0) // Y-up world

self.onmessage = (e: MessageEvent<any>) => {
  try {
    const { type, playerState: rawPlayerState, movementVector, deltaTime, worldVoxels } = e.data

    if (type === 'UPDATE_PHYSICS') {
    // Reconstruct player state
    playerPosition.set(rawPlayerState.position.x, rawPlayerState.position.y, rawPlayerState.position.z)
    playerVelocity.set(rawPlayerState.velocity.x, rawPlayerState.velocity.y, rawPlayerState.velocity.z)
    cameraQuaternion.set(rawPlayerState.cameraQuaternion.x, rawPlayerState.cameraQuaternion.y, rawPlayerState.cameraQuaternion.z, rawPlayerState.cameraQuaternion.w)
    
    // Set player-related state on the MovementController (simulating IPlayerQuery)
    const workerPlayerState = {
        getPosition: () => playerPosition,
        getVelocity: () => playerVelocity,
        getMode: () => rawPlayerState.mode,
        getSpeed: () => rawPlayerState.speed,
        isFlying: () => rawPlayerState.mode === PlayerMode.Flying,
        isFalling: () => rawPlayerState.falling,
        getJumpVelocity: () => rawPlayerState.jumpVelocity,
        // Setters are handled by the main thread PlayerService after response
        updatePosition: (p: THREE.Vector3) => playerPosition.copy(p),
        setVelocity: (v: THREE.Vector3) => playerVelocity.copy(v),
        setFalling: (f: boolean) => (rawPlayerState.falling = f),
        setJumpVelocity: (jv: number) => (rawPlayerState.jumpVelocity = jv),
        setMode: (m: PlayerMode) => (rawPlayerState.mode = m)
    };
    
    (movementController as any).player = workerPlayerState

    // Clear previous chunks and hydrate with current chunk data
    workerVoxelQuery.clear()
    for (const key in worldVoxels) {
      const coordKey = key
      const buffer = worldVoxels[key]
      const [cx, cz] = coordKey.split(',').map(Number)
      workerVoxelQuery.addChunk(new ChunkData(new ChunkCoordinate(cx, cz), buffer))
    }
    
    // Calculate new position and velocity
    const newPosition = movementController.applyMovement(movementVector, cameraQuaternion, deltaTime)

    // Update worker's internal player state
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
  } catch (error) {
    console.error('[PhysicsWorker] Error processing message:', error)
    self.postMessage({
      type: 'PHYSICS_ERROR',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}