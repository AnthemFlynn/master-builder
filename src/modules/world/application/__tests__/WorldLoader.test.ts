import { describe, it, expect } from 'bun:test'
import { WorldLoader } from '../WorldLoader'

describe('WorldLoader', () => {
  it('should load and validate JSON world definition', async () => {
    const loader = new WorldLoader()
    const world = await loader.load('/worlds/default.json')

    expect(world.meta.name).toBe('Sky Islands Test World')
    expect(world.meta.seed).toBe(42069)
    expect(world.features.length).toBeGreaterThan(0)
  })

  it('should throw on invalid world definition', async () => {
    const loader = new WorldLoader()

    // This should fail - missing required fields
    await expect(loader.load('/worlds/invalid.json')).rejects.toThrow()
  })

  it('should cache loaded worlds', async () => {
    const loader = new WorldLoader()

    const world1 = await loader.load('/worlds/default.json')
    const world2 = await loader.load('/worlds/default.json')

    expect(world1).toBe(world2)  // Same object reference (cached)
  })

  it('should load all example worlds without errors', async () => {
    const loader = new WorldLoader()
    const worlds = [
      '/worlds/default.json',
      '/worlds/caves.json',
      '/worlds/forest.json',
      '/worlds/crystals.json',
      '/worlds/flat.json'
    ]

    for (const path of worlds) {
      const world = await loader.load(path)
      expect(world).toBeDefined()
      expect(world.meta.seed).toBeGreaterThan(0)
    }
  })
})
