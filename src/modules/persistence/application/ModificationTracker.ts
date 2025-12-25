// src/modules/persistence/application/ModificationTracker.ts
import { EventBus } from '../../game/infrastructure/EventBus'

/**
 * Tracks block modifications (placements/removals) for save/load persistence.
 * Stores only changes from generated terrain, not full chunk data.
 */
export class ModificationTracker {
  // Map<chunkKey, Map<localPosKey, blockType>>
  // blockType: 0 = air (removed), >0 = placed block
  private modifications = new Map<string, Map<string, number>>()

  constructor(private eventBus: EventBus) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventBus.on('world', 'BlockPlacedEvent', (e: any) => {
      this.trackModification(e.position.x, e.position.y, e.position.z, e.blockType)
    })

    this.eventBus.on('world', 'BlockRemovedEvent', (e: any) => {
      this.trackModification(e.position.x, e.position.y, e.position.z, 0) // 0 = air
    })
  }

  /**
   * Track a block modification at world coordinates
   */
  trackModification(worldX: number, worldY: number, worldZ: number, blockType: number): void {
    const chunkX = Math.floor(worldX / 24)
    const chunkZ = Math.floor(worldZ / 24)
    const chunkKey = `${chunkX},${chunkZ}`

    const localX = ((worldX % 24) + 24) % 24
    const localZ = ((worldZ % 24) + 24) % 24
    const localKey = `${localX},${worldY},${localZ}`

    if (!this.modifications.has(chunkKey)) {
      this.modifications.set(chunkKey, new Map())
    }

    this.modifications.get(chunkKey)!.set(localKey, blockType)
  }

  /**
   * Get modifications for a specific chunk
   */
  getChunkModifications(chunkKey: string): Map<string, number> | undefined {
    return this.modifications.get(chunkKey)
  }

  /**
   * Get all modifications (for saving)
   */
  getAllModifications(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {}
    for (const [chunkKey, mods] of this.modifications) {
      result[chunkKey] = Object.fromEntries(mods)
    }
    return result
  }

  /**
   * Load modifications from save data
   */
  loadModifications(data: Record<string, Record<string, number>>): void {
    this.modifications.clear()
    for (const chunkKey in data) {
      this.modifications.set(chunkKey, new Map(Object.entries(data[chunkKey]).map(
        ([k, v]) => [k, Number(v)]
      )))
    }
  }

  /**
   * Check if any modifications exist
   */
  hasModifications(): boolean {
    return this.modifications.size > 0
  }

  /**
   * Get count of modified chunks
   */
  getModifiedChunkCount(): number {
    return this.modifications.size
  }

  /**
   * Clear all modifications (for new game)
   */
  clear(): void {
    this.modifications.clear()
  }
}
