import { CommandHandler } from '../../domain/commands/Command'
import { PlaceBlockCommand } from '../../domain/commands/PlaceBlockCommand'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../../infrastructure/EventBus'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { PlayerService } from '../../../player/application/PlayerService' // Import PlayerService

export class PlaceBlockHandler implements CommandHandler<PlaceBlockCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus,
    private playerService: PlayerService // Inject PlayerService
  ) {}

  execute(command: PlaceBlockCommand): void {
    const { x, y, z, blockType } = command
    
    if (blockType <= 0) {
        console.warn('Cannot place Air or Void block')
        return
    }

    const targetBlockX = Math.floor(x)
    const targetBlockY = Math.floor(y)
    const targetBlockZ = Math.floor(z)

    // Validate Y position
    if (targetBlockY < 0 || targetBlockY > 255) {
      console.warn(`Attempted to place block at invalid Y: ${targetBlockY}`)
      return
    }

    // --- Player Intersection Check ---
    const playerPosition = this.playerService.getPosition()
    // Player bounding box (standard Minecraft-like dimensions)
    const playerMinX = playerPosition.x - 0.3 // Player width 0.6
    const playerMaxX = playerPosition.x + 0.3
    const playerMinY = playerPosition.y
    const playerMaxY = playerPosition.y + 1.8 // Player height 1.8
    const playerMinZ = playerPosition.z - 0.3
    const playerMaxZ = playerPosition.z + 0.3

    // Target block bounding box (1x1x1 unit)
    const blockMinX = targetBlockX
    const blockMaxX = targetBlockX + 1
    const blockMinY = targetBlockY
    const blockMaxY = targetBlockY + 1
    const blockMinZ = targetBlockZ
    const blockMaxZ = targetBlockZ + 1

    // Check for AABB intersection
    const intersects = (
      playerMinX < blockMaxX && playerMaxX > blockMinX &&
      playerMinY < blockMaxY && playerMaxY > blockMinY &&
      playerMinZ < blockMaxZ && playerMaxZ > blockMinZ
    )

    if (intersects) {
      console.warn(`🚫 Block placement denied: Intersects with player at (${targetBlockX}, ${targetBlockY}, ${targetBlockZ})`)
      return // Do not place the block
    }
    // --- End Player Intersection Check ---

    // Update world
    this.worldService.setBlock(
      targetBlockX,
      targetBlockY,
      targetBlockZ,
      blockType
    )

    // Calculate chunk coordinate
    const chunkCoord = new ChunkCoordinate(
      Math.floor(x / 24),
      Math.floor(z / 24)
    )

    const position = {
      x: targetBlockX,
      y: targetBlockY,
      z: targetBlockZ
    }

    // Emit event
    this.eventBus.emit('world', {
      type: 'BlockPlacedEvent',
      timestamp: Date.now(),
      position,
      blockType: blockType,
      chunkCoord: chunkCoord
    })

    console.log(`🧱 Block placed at (${targetBlockX}, ${targetBlockY}, ${targetBlockZ})`)
  }
}
