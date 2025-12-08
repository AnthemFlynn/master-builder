import { CollisionDetector } from './CollisionDetector'
import { MovementController } from './MovementController'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { IPlayerQuery } from '../../player/ports/IPlayerQuery'

export class PhysicsService {
  private collisionDetector: CollisionDetector
  private movementController: MovementController

  constructor(
    voxels: IVoxelQuery,
    player: IPlayerQuery
  ) {
    this.collisionDetector = new CollisionDetector(voxels)
    this.movementController = new MovementController(this.collisionDetector, player)
  }

  getCollisionDetector(): CollisionDetector {
    return this.collisionDetector
  }

  getMovementController(): MovementController {
    return this.movementController
  }
}
