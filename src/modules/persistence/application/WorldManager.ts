// src/modules/persistence/application/WorldManager.ts

import { EventBus } from '../../../shared/infrastructure/EventBus'
import { World, CreateWorldParams } from '../domain/World'
import { SaveSlot } from '../domain/SaveSlot'
import { WorldRepository } from './WorldRepository'
import { IndexedDBAdapter } from '../adapters/IndexedDBAdapter'

/**
 * WorldManager - High-level API for world management
 *
 * Wraps WorldRepository and emits events for world changes.
 * Used by UI components to display and manipulate worlds.
 */
export class WorldManager {
  private worldRepository: WorldRepository
  private initialized = false

  constructor(
    private eventBus: EventBus,
    private dbAdapter: IndexedDBAdapter
  ) {
    this.worldRepository = new WorldRepository()
  }

  /**
   * Initialize the world system
   * Must be called before any other operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    const db = this.dbAdapter.getDatabase()
    if (!db) {
      throw new Error('[WorldManager] IndexedDBAdapter not initialized')
    }
    this.worldRepository.setDatabase(db)

    await this.worldRepository.initialize()

    // Migrate any existing saves to a default world
    await this.worldRepository.migrateExistingSaves()

    this.initialized = true
    console.log('✅ WorldManager initialized')
  }

  // === World Operations ===

  /**
   * Get all worlds sorted by last played
   */
  async listWorlds(): Promise<World[]> {
    this.ensureInitialized()
    return this.worldRepository.listWorlds()
  }

  /**
   * Get a specific world by ID
   */
  async getWorld(worldId: string): Promise<World | null> {
    this.ensureInitialized()
    return this.worldRepository.getWorld(worldId)
  }

  /**
   * Create a new world
   */
  async createWorld(params: CreateWorldParams): Promise<World> {
    this.ensureInitialized()

    const world = await this.worldRepository.createWorld(params)

    this.eventBus.emit('persistence', {
      type: 'WorldCreatedEvent',
      timestamp: Date.now(),
      world
    })

    return world
  }

  /**
   * Update world properties (name, settings, etc.)
   */
  async updateWorld(worldId: string, updates: Partial<World>): Promise<void> {
    this.ensureInitialized()

    await this.worldRepository.updateWorld(worldId, updates)

    this.eventBus.emit('persistence', {
      type: 'WorldUpdatedEvent',
      timestamp: Date.now(),
      worldId,
      updates
    })
  }

  /**
   * Delete a world and all its saves
   */
  async deleteWorld(worldId: string): Promise<void> {
    this.ensureInitialized()

    await this.worldRepository.deleteWorld(worldId)

    this.eventBus.emit('persistence', {
      type: 'WorldDeletedEvent',
      timestamp: Date.now(),
      worldId
    })
  }

  /**
   * Update world thumbnail
   */
  async updateThumbnail(worldId: string, thumbnail: string): Promise<void> {
    this.ensureInitialized()
    await this.worldRepository.updateWorld(worldId, { thumbnail })
  }

  /**
   * Record a play session ending (updates lastPlayed and totalPlayTime)
   */
  async recordPlaySession(worldId: string, sessionPlayTime: number): Promise<void> {
    this.ensureInitialized()
    await this.worldRepository.recordPlaySession(worldId, sessionPlayTime)
  }

  // === Save Slot Operations ===

  /**
   * Get all saves for a world
   */
  async getWorldSaves(worldId: string): Promise<SaveSlot[]> {
    this.ensureInitialized()
    return this.worldRepository.getWorldSaves(worldId)
  }

  /**
   * Get a specific save slot
   */
  async getSaveSlot(slotId: string): Promise<SaveSlot | null> {
    this.ensureInitialized()
    return this.worldRepository.getSaveSlot(slotId)
  }

  /**
   * Delete a save slot
   */
  async deleteSaveSlot(slotId: string): Promise<void> {
    this.ensureInitialized()

    const slot = await this.worldRepository.getSaveSlot(slotId)
    await this.worldRepository.deleteSaveSlot(slotId)

    this.eventBus.emit('persistence', {
      type: 'SaveSlotDeletedEvent',
      timestamp: Date.now(),
      slotId,
      worldId: slot?.worldId
    })
  }

  // === Quick Access ===

  /**
   * Check if there are any worlds
   */
  async hasWorlds(): Promise<boolean> {
    this.ensureInitialized()
    return this.worldRepository.hasWorlds()
  }

  /**
   * Get the most recently played world
   */
  async getMostRecentWorld(): Promise<World | null> {
    this.ensureInitialized()
    const worlds = await this.worldRepository.listWorlds()
    return worlds.length > 0 ? worlds[0] : null
  }

  /**
   * Get the most recent save for a world (for Continue button)
   */
  async getMostRecentSave(worldId: string): Promise<SaveSlot | null> {
    this.ensureInitialized()
    const saves = await this.worldRepository.getWorldSaves(worldId)

    if (saves.length === 0) return null

    // Sort by timestamp descending
    saves.sort((a, b) => b.timestamp - a.timestamp)
    return saves[0]
  }

  /**
   * Get world repository for direct access (used by persistence service)
   */
  getRepository(): WorldRepository {
    return this.worldRepository
  }

  // === Private ===

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('[WorldManager] Not initialized. Call initialize() first.')
    }
  }
}
