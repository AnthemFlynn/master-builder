import { ChunkManager } from '../terrain/ChunkManager'
import { blockRegistry } from '../blocks'
import { RGB } from '../blocks/types'
import { LightQueue, LightUpdate } from './LightQueue'

const DIRECTIONS = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 }
]

export class LightingEngine {
  private chunkManager: ChunkManager
  private lightQueue: LightQueue
  private getBlockType: (x: number, y: number, z: number) => number
  private visited = new Set<string>()
  private updateCount = 0

  constructor(
    chunkManager: ChunkManager,
    getBlockTypeFn: (x: number, y: number, z: number) => number
  ) {
    this.chunkManager = chunkManager
    this.lightQueue = new LightQueue()
    this.getBlockType = getBlockTypeFn
    console.log('✅ LightingEngine initialized')
  }

  update(): void {
    // Only clear visited set when queue is empty (complete cycle)
    if (this.lightQueue.isEmpty()) {
      if (this.visited.size > 0) {
        console.log(`🔄 Propagation cycle complete, clearing visited set (${this.visited.size} blocks)`)
        this.visited.clear()
      }
      return
    }

    const processed = this.lightQueue.update((update) => {
      const key = `${update.x},${update.y},${update.z},${update.channel}`
      if (this.visited.has(key)) {
        return  // Already processed in this cycle
      }
      this.visited.add(key)
      this.processLightUpdate(update)
    })

    // Only log when actually processing (not every frame)
    if (processed > 0) {
      const status = this.lightQueue.getStatus()
      console.log(`💡 Processed ${processed} light updates, ${status.queued} remaining in queue`)
    }
  }

  private processLightUpdate(update: LightUpdate): void {
    const current = this.chunkManager.getLightAt(update.x, update.y, update.z)
    const currentChannel = update.channel === 'sky' ? current.sky : current.block

    if (!this.isBrighter(update.color, currentChannel)) {
      return
    }

    this.chunkManager.setLightAt(update.x, update.y, update.z, update.channel, update.color)
    this.propagateToNeighbors(update.x, update.y, update.z, update.color, update.channel)
  }

  private propagateToNeighbors(
    x: number,
    y: number,
    z: number,
    color: RGB,
    channel: 'sky' | 'block'
  ): void {
    for (const dir of DIRECTIONS) {
      const nx = x + dir.x
      const ny = y + dir.y
      const nz = z + dir.z

      const blockType = this.getBlockType(nx, ny, nz)
      // Air blocks (blockType === -1) should receive light

      const blockDef = blockRegistry.get(blockType)
      if (!blockDef && blockType !== -1) {
        continue  // Invalid block type (not air, not in registry)
      }

      // Air has no absorption, solid blocks use their lightAbsorption property
      const absorption = blockDef ? blockDef.lightAbsorption : 0.0
      const newColor: RGB = {
        r: Math.max(0, Math.floor(color.r * (1 - absorption)) - 1),
        g: Math.max(0, Math.floor(color.g * (1 - absorption)) - 1),
        b: Math.max(0, Math.floor(color.b * (1 - absorption)) - 1)
      }

      // Stop if all channels are zero (no light left)
      if (newColor.r === 0 && newColor.g === 0 && newColor.b === 0) {
        continue
      }

      // Check if this would be brighter than current light BEFORE queuing
      const currentNeighbor = this.chunkManager.getLightAt(nx, ny, nz)
      const currentNeighborChannel = channel === 'sky' ? currentNeighbor.sky : currentNeighbor.block

      if (!this.isBrighter(newColor, currentNeighborChannel)) {
        continue  // Don't queue if not brighter
      }

      this.lightQueue.add({
        x: nx,
        y: ny,
        z: nz,
        channel,
        color: newColor,
        priority: 1
      })
    }
  }

  private isBrighter(a: RGB, b: RGB): boolean {
    const brightnessA = a.r + a.g + a.b
    const brightnessB = b.r + b.g + b.b
    return brightnessA > brightnessB
  }

  addLightSource(x: number, y: number, z: number, color: RGB): void {
    console.log(`💡 Adding light source at (${x}, ${y}, ${z}): R${color.r} G${color.g} B${color.b}`)
    this.lightQueue.add({
      x, y, z,
      channel: 'block',
      color,
      priority: 10
    })
  }

  removeLightSource(x: number, y: number, z: number): void {
    console.log(`🔦 Removing light source at (${x}, ${y}, ${z})`)
    this.chunkManager.setLightAt(x, y, z, 'block', { r: 0, g: 0, b: 0 })
  }

  updateSkyLight(level: number): void {
    console.log(`☀️ Updating sky light to level ${level}`)
  }

  getStatus(): { queued: number } {
    return this.lightQueue.getStatus()
  }
}
