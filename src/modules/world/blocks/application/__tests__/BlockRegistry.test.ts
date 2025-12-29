import { describe, it, expect, beforeEach } from 'bun:test'
import { BlockRegistry } from '../BlockRegistry'
import { BlockDefinition, BlockCategory } from '../../domain/types'

describe('BlockRegistry', () => {
  let registry: BlockRegistry

  // Helper to create test block definition
  const createTestBlock = (id: number, overrides: Partial<BlockDefinition> = {}): BlockDefinition => ({
    id,
    name: `test_block_${id}`,
    category: BlockCategory.GROUND,
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    baseColor: { r: 0.5, g: 0.5, b: 0.5 },
    textures: 'test.png',
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'test.png',
    ...overrides
  })

  beforeEach(() => {
    registry = new BlockRegistry()
  })

  describe('registration', () => {
    it('should register a block definition', () => {
      const block = createTestBlock(1)
      registry.register(block)

      expect(registry.get(1)).toEqual(block)
    })

    it('should register multiple blocks via registerAll()', () => {
      const blocks = [createTestBlock(1), createTestBlock(2), createTestBlock(3)]
      registry.registerAll(blocks)

      expect(registry.size()).toBe(3)
    })

    it('should throw on duplicate block ID', () => {
      const block1 = createTestBlock(1)
      const block2 = createTestBlock(1, { name: 'duplicate' })

      registry.register(block1)
      expect(() => registry.register(block2)).toThrow(/Block ID Collision/)
    })
  })

  describe('retrieval', () => {
    it('should get block by ID', () => {
      const block = createTestBlock(42)
      registry.register(block)

      const retrieved = registry.get(42)
      expect(retrieved?.id).toBe(42)
      expect(retrieved?.name).toBe('test_block_42')
    })

    it('should return undefined for non-existent ID', () => {
      expect(registry.get(999)).toBeUndefined()
    })

    it('should get all blocks', () => {
      registry.registerAll([createTestBlock(1), createTestBlock(2)])

      const all = registry.getAllBlocks()
      expect(all.length).toBe(2)
    })

    it('should get blocks by category', () => {
      registry.registerAll([
        createTestBlock(1, { category: BlockCategory.STONE }),
        createTestBlock(2, { category: BlockCategory.WOOD }),
        createTestBlock(3, { category: BlockCategory.STONE })
      ])

      const stoneBlocks = registry.getByCategory(BlockCategory.STONE)
      expect(stoneBlocks.length).toBe(2)
      expect(stoneBlocks.every(b => b.category === BlockCategory.STONE)).toBe(true)
    })

    it('should get inventory blocks sorted by slot', () => {
      registry.registerAll([
        createTestBlock(1, { inventorySlot: 3 }),
        createTestBlock(2, { inventorySlot: 1 }),
        createTestBlock(3, { inventorySlot: 2 }),
        createTestBlock(4) // No inventory slot
      ])

      const inventoryBlocks = registry.getInventoryBlocks()
      expect(inventoryBlocks.length).toBe(3)
      expect(inventoryBlocks[0].inventorySlot).toBe(1)
      expect(inventoryBlocks[1].inventorySlot).toBe(2)
      expect(inventoryBlocks[2].inventorySlot).toBe(3)
    })
  })

  describe('colors', () => {
    it('should get base color for block', () => {
      registry.register(createTestBlock(1, {
        baseColor: { r: 0.8, g: 0.6, b: 0.4 }
      }))

      const color = registry.getBaseColor(1)
      expect(color.r).toBeCloseTo(0.8)
      expect(color.g).toBeCloseTo(0.6)
      expect(color.b).toBeCloseTo(0.4)
    })

    it('should return default color for non-existent block', () => {
      const color = registry.getBaseColor(999)
      expect(color.r).toBeCloseTo(0.7)
      expect(color.g).toBeCloseTo(0.7)
      expect(color.b).toBeCloseTo(0.7)
    })

    it('should get face color for top face', () => {
      registry.register(createTestBlock(1, {
        faceColors: {
          top: { r: 0.2, g: 0.8, b: 0.2 },
          bottom: { r: 0.4, g: 0.3, b: 0.2 },
          side: { r: 0.5, g: 0.5, b: 0.3 }
        }
      }))

      const topColor = registry.getFaceColor(1, { x: 0, y: 1, z: 0 })
      expect(topColor.r).toBeCloseTo(0.2)
      expect(topColor.g).toBeCloseTo(0.8)
      expect(topColor.b).toBeCloseTo(0.2)
    })

    it('should get face color for bottom face', () => {
      registry.register(createTestBlock(1, {
        faceColors: {
          top: { r: 0.2, g: 0.8, b: 0.2 },
          bottom: { r: 0.4, g: 0.3, b: 0.2 },
          side: { r: 0.5, g: 0.5, b: 0.3 }
        }
      }))

      const bottomColor = registry.getFaceColor(1, { x: 0, y: -1, z: 0 })
      expect(bottomColor.r).toBeCloseTo(0.4)
      expect(bottomColor.g).toBeCloseTo(0.3)
      expect(bottomColor.b).toBeCloseTo(0.2)
    })

    it('should get face color for side faces', () => {
      registry.register(createTestBlock(1, {
        faceColors: {
          top: { r: 0.2, g: 0.8, b: 0.2 },
          bottom: { r: 0.4, g: 0.3, b: 0.2 },
          side: { r: 0.5, g: 0.5, b: 0.3 }
        }
      }))

      const sideColor = registry.getFaceColor(1, { x: 1, y: 0, z: 0 })
      expect(sideColor.r).toBeCloseTo(0.5)
      expect(sideColor.g).toBeCloseTo(0.5)
      expect(sideColor.b).toBeCloseTo(0.3)
    })

    it('should fall back to base color when no face colors defined', () => {
      registry.register(createTestBlock(1, {
        baseColor: { r: 0.6, g: 0.6, b: 0.6 }
      }))

      const color = registry.getFaceColor(1, { x: 0, y: 1, z: 0 })
      expect(color.r).toBeCloseTo(0.6)
    })
  })

  describe('textures', () => {
    it('should get texture for face with single texture', () => {
      registry.register(createTestBlock(1, {
        textures: 'stone.png'
      }))

      const texture = registry.getTextureForFace(1, 0)
      expect(texture).toBe('stone.png')
    })

    it('should get texture for face with 6-face array', () => {
      registry.register(createTestBlock(1, {
        textures: ['right.png', 'left.png', 'top.png', 'bottom.png', 'front.png', 'back.png']
      }))

      expect(registry.getTextureForFace(1, 0)).toBe('right.png')
      expect(registry.getTextureForFace(1, 2)).toBe('top.png')
      expect(registry.getTextureForFace(1, 3)).toBe('bottom.png')
    })

    it('should get texture for face with 3-face array (side, top, bottom)', () => {
      registry.register(createTestBlock(1, {
        textures: ['side.png', 'top.png', 'bottom.png']
      }))

      expect(registry.getTextureForFace(1, 0)).toBe('side.png') // Side
      expect(registry.getTextureForFace(1, 2)).toBe('top.png')  // Top
      expect(registry.getTextureForFace(1, 3)).toBe('bottom.png') // Bottom
    })

    it('should return missing.png for non-existent block', () => {
      expect(registry.getTextureForFace(999, 0)).toBe('missing.png')
    })
  })

  describe('size tracking', () => {
    it('should track registry size', () => {
      expect(registry.size()).toBe(0)

      registry.register(createTestBlock(1))
      expect(registry.size()).toBe(1)

      registry.register(createTestBlock(2))
      expect(registry.size()).toBe(2)
    })
  })

  describe('emissive blocks', () => {
    it('should identify non-emissive blocks', () => {
      const block = createTestBlock(1, {
        emissive: { r: 0, g: 0, b: 0 }
      })
      registry.register(block)

      const retrieved = registry.get(1)
      expect(retrieved?.emissive.r).toBe(0)
      expect(retrieved?.emissive.g).toBe(0)
      expect(retrieved?.emissive.b).toBe(0)
    })

    it('should store emissive values for light blocks', () => {
      const block = createTestBlock(1, {
        emissive: { r: 15, g: 12, b: 0 }
      })
      registry.register(block)

      const retrieved = registry.get(1)
      expect(retrieved?.emissive.r).toBe(15)
      expect(retrieved?.emissive.g).toBe(12)
      expect(retrieved?.emissive.b).toBe(0)
    })
  })

  describe('side overlay', () => {
    it('should get side overlay when defined', () => {
      registry.register(createTestBlock(1, {
        sideOverlay: { texture: 'grass_side.png', color: { r: 0.4, g: 0.8, b: 0.3 } }
      }))

      const overlay = registry.getSideOverlay(1)
      expect(overlay?.texture).toBe('grass_side.png')
    })

    it('should return undefined when no side overlay', () => {
      registry.register(createTestBlock(1))

      expect(registry.getSideOverlay(1)).toBeUndefined()
    })
  })
})
