import { describe, it, expect } from 'bun:test'
import { MaterialRegistry } from '../MaterialRegistry'
import { BlockType } from '../BlockType'

describe('MaterialRegistry', () => {
  it('should resolve material names to BlockType', () => {
    const registry = new MaterialRegistry()

    expect(registry.resolve('grass')).toBe(BlockType.grass)
    expect(registry.resolve('stone')).toBe(BlockType.stone)
    expect(registry.resolve('obsidian')).toBe(BlockType.obsidian)
  })

  it('should support aliases', () => {
    const registry = new MaterialRegistry()

    expect(registry.resolve('grass_green')).toBe(BlockType.grass)
    expect(registry.resolve('granite')).toBe(BlockType.stone)
  })

  it('should return stone for unknown materials', () => {
    const registry = new MaterialRegistry()

    expect(registry.resolve('unknown_material')).toBe(BlockType.stone)
  })

  it('should allow registering new mappings', () => {
    const registry = new MaterialRegistry()

    registry.register('custom_block', BlockType.diamond)
    expect(registry.resolve('custom_block')).toBe(BlockType.diamond)
  })
})
