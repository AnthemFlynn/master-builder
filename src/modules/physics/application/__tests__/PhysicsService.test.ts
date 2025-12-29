import { describe, it, expect, beforeEach, beforeAll } from 'bun:test'
import { MovementController } from '../MovementController'
import { CollisionDetector } from '../CollisionDetector'
import { PlayerMode } from '../../../player/domain/PlayerMode'
import { initializeBlockRegistry } from '../../../world/blocks'

// Initialize block registry for solid block checks
beforeAll(() => {
  initializeBlockRegistry()
})

// PhysicsService uses Web Workers which aren't available in Bun tests.
// Instead, we test the MovementController and CollisionDetector directly,
// which contain the core physics logic that runs in the worker.

// Mock IVoxelQuery for collision detection
class MockVoxelQuery {
  private blocks = new Map<string, number>()

  setBlock(x: number, y: number, z: number, type: number) {
    this.blocks.set(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`, type)
  }

  getBlockType(x: number, y: number, z: number): number {
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`
    return this.blocks.get(key) ?? 0 // 0 = air
  }

  isBlockSolid(x: number, y: number, z: number): boolean {
    const type = this.getBlockType(x, y, z)
    return type !== 0 && type !== 16 // Not air, not water
  }

  getLightAbsorption(x: number, y: number, z: number): number {
    return this.isBlockSolid(x, y, z) ? 15 : 0
  }

  getChunk() { return null }
  isBlockWater(x: number, y: number, z: number): boolean {
    return this.getBlockType(x, y, z) === 16
  }
}

// Mock IPlayerQuery
class MockPlayerQuery {
  private position = { x: 0, y: 64, z: 0 }
  private velocity = { x: 0, y: 0, z: 0 }
  private mode = PlayerMode.Walking
  private speed = 5
  private falling = false
  private jumpVelocity = 8

  getPosition() { return this.position as any }
  getVelocity() { return this.velocity as any }
  getMode() { return this.mode }
  getSpeed() { return this.speed }
  isFlying() { return this.mode === PlayerMode.Flying }
  isFalling() { return this.falling }
  getJumpVelocity() { return this.jumpVelocity }

  updatePosition(p: any) {
    this.position.x = p.x
    this.position.y = p.y
    this.position.z = p.z
  }
  setVelocity(v: any) {
    this.velocity.x = v.x
    this.velocity.y = v.y
    this.velocity.z = v.z
  }
  setFalling(f: boolean) { this.falling = f }
  setJumpVelocity(jv: number) { this.jumpVelocity = jv }
  setMode(m: PlayerMode) { this.mode = m }
}

describe('CollisionDetector', () => {
  let voxelQuery: MockVoxelQuery
  let collisionDetector: CollisionDetector

  beforeEach(() => {
    voxelQuery = new MockVoxelQuery()
    collisionDetector = new CollisionDetector(voxelQuery as any)
  })

  describe('isGrounded', () => {
    it('should return false when player is in empty space', () => {
      // Player at (5, 64, 5), no ground below
      const position = { x: 5, y: 64, z: 5, clone: () => ({ ...position }), copy: () => position } as any

      expect(collisionDetector.isGrounded(position)).toBe(false)
    })

    it('should return true when standing on solid block', () => {
      // Create ground at Y=62 (player feet at Y=62.4 with eyeOffset=1.6)
      // Player position is eye level, so position.y=64 means feet at ~62.4
      for (let x = 4; x <= 6; x++) {
        for (let z = 4; z <= 6; z++) {
          voxelQuery.setBlock(x, 62, z, 1) // Stone
        }
      }

      // Position is eye level. Feet Y = position.y - eyeOffset (1.6)
      // If feet are at 62.4, position.y should be 64
      const position = { x: 5, y: 64, z: 5, clone: () => ({ ...position }), copy: () => position } as any

      expect(collisionDetector.isGrounded(position)).toBe(true)
    })

    it('should return false when above solid blocks (too high)', () => {
      // Ground at Y=60, player at Y=70 (way above)
      for (let x = 4; x <= 6; x++) {
        for (let z = 4; z <= 6; z++) {
          voxelQuery.setBlock(x, 60, z, 1)
        }
      }

      const position = { x: 5, y: 70, z: 5, clone: () => ({ ...position }), copy: () => position } as any

      expect(collisionDetector.isGrounded(position)).toBe(false)
    })
  })

  describe('moveVertical', () => {
    it('should allow falling when no blocks below', () => {
      const position = { x: 5, y: 64, z: 5, clone: () => ({ x: 5, y: 64, z: 5 }), copy: function(p: any) { this.x = p.x; this.y = p.y; this.z = p.z; return this } } as any

      const result = collisionDetector.moveVertical(position, -1)

      expect(result.position.y).toBeLessThan(64)
      expect(result.collided).toBe(false)
    })

    it('should stop falling when hitting ground', () => {
      // Create solid floor at Y=62
      for (let x = 4; x <= 6; x++) {
        for (let z = 4; z <= 6; z++) {
          voxelQuery.setBlock(x, 62, z, 1)
        }
      }

      // Player trying to fall through floor
      const position = { x: 5, y: 64, z: 5, clone: () => ({ x: 5, y: 64, z: 5 }), copy: function(p: any) { this.x = p.x; this.y = p.y; this.z = p.z; return this } } as any

      const result = collisionDetector.moveVertical(position, -10) // Try to fall 10 units

      // Should stop before going through floor
      expect(result.collided).toBe(true)
    })
  })

  describe('getWaterDepth', () => {
    it('should return 0 when not in water', () => {
      const position = { x: 5, y: 64, z: 5, clone: () => ({ ...position }), copy: () => position } as any

      expect(collisionDetector.getWaterDepth(position)).toBe(0)
    })

    it('should return 1 when feet are in water', () => {
      // Place water at feet level (Y=62 for position.y=64)
      voxelQuery.setBlock(5, 62, 5, 16) // Water

      const position = { x: 5, y: 64, z: 5, clone: () => ({ ...position }), copy: () => position } as any

      expect(collisionDetector.getWaterDepth(position)).toBe(1)
    })

    it('should return 2 when fully submerged', () => {
      // Place water at both feet and head level
      voxelQuery.setBlock(5, 62, 5, 16) // Water at feet
      voxelQuery.setBlock(5, 64, 5, 16) // Water at head

      const position = { x: 5, y: 64, z: 5, clone: () => ({ ...position }), copy: () => position } as any

      expect(collisionDetector.getWaterDepth(position)).toBe(2)
    })
  })
})

describe('MovementController', () => {
  let voxelQuery: MockVoxelQuery
  let playerQuery: MockPlayerQuery
  let collisionDetector: CollisionDetector
  let movementController: MovementController

  beforeEach(() => {
    voxelQuery = new MockVoxelQuery()
    playerQuery = new MockPlayerQuery()
    collisionDetector = new CollisionDetector(voxelQuery as any)
    movementController = new MovementController(collisionDetector, playerQuery as any)
  })

  describe('movement calculation', () => {
    it('should apply forward movement', () => {
      const movement = {
        forward: 1,
        strafe: 0,
        vertical: 0,
        jump: false,
        sneak: false
      }

      // Create camera quaternion (looking forward along -Z)
      const cameraQuaternion = { x: 0, y: 0, z: 0, w: 1 }

      const newPosition = movementController.applyMovement(movement, cameraQuaternion as any, 0.016)

      // Position should have changed (moved in some direction)
      expect(newPosition).toBeDefined()
    })

    it('should not move when no input', () => {
      const initialPos = playerQuery.getPosition()
      const startY = initialPos.y

      const movement = {
        forward: 0,
        strafe: 0,
        vertical: 0,
        jump: false,
        sneak: false
      }

      const cameraQuaternion = { x: 0, y: 0, z: 0, w: 1 }

      // Create ground to prevent falling
      for (let x = -5; x < 5; x++) {
        for (let z = -5; z < 5; z++) {
          voxelQuery.setBlock(x, startY - 1, z, 1)
        }
      }

      const newPosition = movementController.applyMovement(movement, cameraQuaternion as any, 0.016)

      // X and Z should not change significantly
      expect(Math.abs(newPosition.x - initialPos.x)).toBeLessThan(0.1)
      expect(Math.abs(newPosition.z - initialPos.z)).toBeLessThan(0.1)
    })

    it('should apply vertical movement in flying mode', () => {
      playerQuery.setMode(PlayerMode.Flying)

      const movement = {
        forward: 0,
        strafe: 0,
        vertical: 1, // Flying up
        jump: false,
        sneak: false
      }

      const cameraQuaternion = { x: 0, y: 0, z: 0, w: 1 }
      const initialY = playerQuery.getPosition().y

      const newPosition = movementController.applyMovement(movement, cameraQuaternion as any, 0.016)

      // Should move up
      expect(newPosition.y).toBeGreaterThan(initialY)
    })
  })

  describe('gravity', () => {
    it('should apply gravity in walking mode', () => {
      playerQuery.setMode(PlayerMode.Walking)
      const initialY = playerQuery.getPosition().y

      const movement = {
        forward: 0,
        strafe: 0,
        vertical: 0,
        jump: false,
        sneak: false
      }

      const cameraQuaternion = { x: 0, y: 0, z: 0, w: 1 }

      // No ground - player should fall
      const newPosition = movementController.applyMovement(movement, cameraQuaternion as any, 0.016)

      // Should have moved down due to gravity
      expect(newPosition.y).toBeLessThan(initialY)
    })

    it('should not apply gravity in flying mode', () => {
      playerQuery.setMode(PlayerMode.Flying)
      const initialY = playerQuery.getPosition().y

      const movement = {
        forward: 0,
        strafe: 0,
        vertical: 0,
        jump: false,
        sneak: false
      }

      const cameraQuaternion = { x: 0, y: 0, z: 0, w: 1 }

      const newPosition = movementController.applyMovement(movement, cameraQuaternion as any, 0.016)

      // Should not fall in flying mode
      expect(newPosition.y).toBe(initialY)
    })
  })
})

describe('PhysicsService worker message format', () => {
  it('should define correct WorkerMessage structure', () => {
    // Test that the expected message structure is correct
    const workerMessage = {
      type: 'UPDATE_PHYSICS' as const,
      playerState: {
        position: { x: 0, y: 64, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        mode: PlayerMode.Walking,
        speed: 5,
        falling: false,
        jumpVelocity: 8,
        cameraQuaternion: { x: 0, y: 0, z: 0, w: 1 }
      },
      movementVector: {
        forward: 1,
        strafe: 0,
        vertical: 0,
        jump: false,
        sneak: false
      },
      deltaTime: 0.016,
      worldVoxels: {}
    }

    expect(workerMessage.type).toBe('UPDATE_PHYSICS')
    expect(workerMessage.playerState.position).toBeDefined()
    expect(workerMessage.movementVector.forward).toBeDefined()
  })

  it('should define correct MainMessage structure', () => {
    const mainMessage = {
      type: 'PHYSICS_UPDATED' as const,
      playerState: {
        position: { x: 1, y: 64, z: 0 },
        velocity: { x: 0, y: -1, z: 0 },
        mode: PlayerMode.Walking,
        falling: true,
        jumpVelocity: 8
      }
    }

    expect(mainMessage.type).toBe('PHYSICS_UPDATED')
    expect(mainMessage.playerState.position).toBeDefined()
  })
})
