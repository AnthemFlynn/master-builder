// src/modules/persistence/application/WorldRepository.ts

import { World, CreateWorldParams, createWorld } from '../domain/World'
import { SaveSlot } from '../domain/SaveSlot'

/**
 * WorldRepository - Manages world persistence in IndexedDB
 *
 * Handles CRUD operations for worlds and their associated save slots.
 * Uses a separate 'worlds' object store, with save slots referencing
 * worlds via worldId.
 */
export class WorldRepository {
  private db: IDBDatabase | null = null

  /**
   * Set the database connection (shared with IndexedDBAdapter)
   */
  setDatabase(db: IDBDatabase): void {
    this.db = db
    console.log('🌍 WorldRepository using shared DB connection')
  }

  /**
   * Initialize - just verify we have a DB connection
   */
  async initialize(): Promise<void> {
    if (!this.db) {
      throw new Error('[WorldRepository] Database not set. Call setDatabase() first.')
    }
    console.log('🌍 WorldRepository initialized')
  }

  // === World CRUD Operations ===

  /**
   * List all worlds, sorted by last played
   */
  async listWorlds(): Promise<World[]> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    const transaction = this.db.transaction(['worlds'], 'readonly')
    const store = transaction.objectStore('worlds')
    const index = store.index('lastPlayed')

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev')  // Newest first
      const worlds: World[] = []

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          worlds.push(cursor.value)
          cursor.continue()
        } else {
          resolve(worlds)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a world by ID
   */
  async getWorld(worldId: string): Promise<World | null> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    const transaction = this.db.transaction(['worlds'], 'readonly')
    const store = transaction.objectStore('worlds')

    return new Promise((resolve, reject) => {
      const request = store.get(worldId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Create a new world
   */
  async createWorld(params: CreateWorldParams): Promise<World> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    const world = createWorld(params)

    const transaction = this.db.transaction(['worlds'], 'readwrite')
    const store = transaction.objectStore('worlds')

    return new Promise((resolve, reject) => {
      const request = store.add(world)
      request.onsuccess = () => {
        console.log(`🌍 Created world: ${world.name} (${world.id})`)
        resolve(world)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update a world
   */
  async updateWorld(worldId: string, updates: Partial<World>): Promise<void> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    const existing = await this.getWorld(worldId)
    if (!existing) throw new Error(`World not found: ${worldId}`)

    const updated = { ...existing, ...updates }

    const transaction = this.db.transaction(['worlds'], 'readwrite')
    const store = transaction.objectStore('worlds')

    return new Promise((resolve, reject) => {
      const request = store.put(updated)
      request.onsuccess = () => {
        console.log(`🌍 Updated world: ${worldId}`)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete a world and all its saves
   */
  async deleteWorld(worldId: string): Promise<void> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    // First, delete all save slots for this world
    const saves = await this.getWorldSaves(worldId)
    for (const save of saves) {
      await this.deleteSaveSlot(save.id)
    }

    // Then delete the world
    const transaction = this.db.transaction(['worlds'], 'readwrite')
    const store = transaction.objectStore('worlds')

    return new Promise((resolve, reject) => {
      const request = store.delete(worldId)
      request.onsuccess = () => {
        console.log(`🗑️ Deleted world: ${worldId}`)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update the lastPlayed timestamp and add to totalPlayTime
   */
  async recordPlaySession(worldId: string, sessionPlayTime: number): Promise<void> {
    const world = await this.getWorld(worldId)
    if (!world) return

    await this.updateWorld(worldId, {
      lastPlayed: Date.now(),
      totalPlayTime: world.totalPlayTime + sessionPlayTime
    })
  }

  // === Save Slot Operations ===

  /**
   * Get all save slots for a world
   */
  async getWorldSaves(worldId: string): Promise<SaveSlot[]> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    const transaction = this.db.transaction(['save-slots'], 'readonly')
    const store = transaction.objectStore('save-slots')

    // Try to use worldId index, fall back to scanning all
    return new Promise((resolve, reject) => {
      const saves: SaveSlot[] = []

      // Check if worldId index exists
      if (store.indexNames.contains('worldId')) {
        const index = store.index('worldId')
        const request = index.openCursor(IDBKeyRange.only(worldId))

        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            saves.push(cursor.value)
            cursor.continue()
          } else {
            // Sort by slot ID to get consistent ordering
            saves.sort((a, b) => {
              if (a.id === 'autosave') return -1
              if (b.id === 'autosave') return 1
              return a.id.localeCompare(b.id)
            })
            resolve(saves)
          }
        }
        request.onerror = () => reject(request.error)
      } else {
        // Fallback: scan all slots
        const request = store.openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            if (cursor.value.worldId === worldId) {
              saves.push(cursor.value)
            }
            cursor.continue()
          } else {
            saves.sort((a, b) => {
              if (a.id === 'autosave') return -1
              if (b.id === 'autosave') return 1
              return a.id.localeCompare(b.id)
            })
            resolve(saves)
          }
        }
        request.onerror = () => reject(request.error)
      }
    })
  }

  /**
   * Get a specific save slot
   */
  async getSaveSlot(slotId: string): Promise<SaveSlot | null> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    const transaction = this.db.transaction(['save-slots'], 'readonly')
    const store = transaction.objectStore('save-slots')

    return new Promise((resolve, reject) => {
      const request = store.get(slotId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete a save slot and its data
   */
  async deleteSaveSlot(slotId: string): Promise<void> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    const transaction = this.db.transaction(
      ['save-slots', 'player-data', 'world-data'],
      'readwrite'
    )

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`🗑️ Deleted save slot: ${slotId}`)
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)

      // Delete slot metadata
      transaction.objectStore('save-slots').delete(slotId)

      // Delete player data
      transaction.objectStore('player-data').delete(slotId)

      // Delete world data for this slot
      const worldStore = transaction.objectStore('world-data')
      const index = worldStore.index('slotId')
      const request = index.openCursor(IDBKeyRange.only(slotId))

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
    })
  }

  // === Migration ===

  /**
   * Migrate existing saves to a default world
   * Called on first run after upgrade to v2
   */
  async migrateExistingSaves(): Promise<void> {
    if (!this.db) throw new Error('[WorldRepository] Database not initialized')

    // Check if we have any existing saves without worldId
    const transaction = this.db.transaction(['save-slots'], 'readonly')
    const store = transaction.objectStore('save-slots')

    const orphanedSaves: any[] = []

    await new Promise<void>((resolve, reject) => {
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          if (!cursor.value.worldId) {
            orphanedSaves.push(cursor.value)
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })

    if (orphanedSaves.length === 0) {
      console.log('[WorldRepository] No orphaned saves to migrate')
      return
    }

    console.log(`[WorldRepository] Migrating ${orphanedSaves.length} orphaned saves...`)

    // Create a default world for migration
    const defaultWorld = await this.createWorld({
      name: 'My World',
      seed: 42069,
      worldType: 'default',
      gameMode: 'creative'
    })

    // Update all orphaned saves to reference the default world
    const updateTransaction = this.db.transaction(['save-slots'], 'readwrite')
    const updateStore = updateTransaction.objectStore('save-slots')

    for (const save of orphanedSaves) {
      const updated = { ...save, worldId: defaultWorld.id }
      updateStore.put(updated)
    }

    await new Promise<void>((resolve, reject) => {
      updateTransaction.oncomplete = () => {
        console.log(`✅ Migrated ${orphanedSaves.length} saves to world: ${defaultWorld.name}`)
        resolve()
      }
      updateTransaction.onerror = () => reject(updateTransaction.error)
    })
  }

  /**
   * Check if any worlds exist
   */
  async hasWorlds(): Promise<boolean> {
    const worlds = await this.listWorlds()
    return worlds.length > 0
  }

  /**
   * Get the database instance (for IndexedDBAdapter compatibility)
   */
  getDatabase(): IDBDatabase | null {
    return this.db
  }
}
