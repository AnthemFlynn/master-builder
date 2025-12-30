// src/modules/persistence/adapters/IndexedDBAdapter.ts
import { IPersistenceStorage } from '../ports/IPersistenceStorage'
import { IPersistenceQuery } from '../ports/IPersistenceQuery'
import { SaveSlot } from '../domain/SaveSlot'
import { GameSnapshot } from '../domain/GameSnapshot'

/**
 * IndexedDB implementation of persistence storage
 * Follows hexagonal architecture: adapter implements ports
 */
export class IndexedDBAdapter implements IPersistenceStorage, IPersistenceQuery {
  private db: IDBDatabase | null = null
  private readonly dbName = 'kingdom-builder-saves'
  private readonly version = 2  // Bumped to 2 to add worlds store

  /**
   * Initialize IndexedDB database with object stores
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('💾 IndexedDB initialized:', this.dbName)
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion

        console.log(`[IndexedDBAdapter] Upgrading from v${oldVersion} to v${this.version}`)

        // Object Store 1: Save Slots (metadata)
        if (!db.objectStoreNames.contains('save-slots')) {
          const slotsStore = db.createObjectStore('save-slots', { keyPath: 'id' })
          slotsStore.createIndex('timestamp', 'timestamp', { unique: false })
          slotsStore.createIndex('worldPresetId', 'worldPresetId', { unique: false })
          console.log('✅ Created object store: save-slots')
        }

        // Version 2: Add worldId index to save-slots
        if (oldVersion < 2 && db.objectStoreNames.contains('save-slots')) {
          const transaction = (event.target as IDBOpenDBRequest).transaction!
          const slotsStore = transaction.objectStore('save-slots')
          if (!slotsStore.indexNames.contains('worldId')) {
            slotsStore.createIndex('worldId', 'worldId', { unique: false })
            console.log('✅ Added worldId index to save-slots')
          }
        }

        // Object Store 2: World Data (chunk modifications)
        if (!db.objectStoreNames.contains('world-data')) {
          const worldStore = db.createObjectStore('world-data', {
            keyPath: ['slotId', 'chunkKey']
          })
          worldStore.createIndex('slotId', 'slotId', { unique: false })
          console.log('✅ Created object store: world-data')
        }

        // Object Store 3: Player Data
        if (!db.objectStoreNames.contains('player-data')) {
          db.createObjectStore('player-data', { keyPath: 'slotId' })
          console.log('✅ Created object store: player-data')
        }

        // Object Store 5: Worlds (v2)
        if (!db.objectStoreNames.contains('worlds')) {
          const worldsStore = db.createObjectStore('worlds', { keyPath: 'id' })
          worldsStore.createIndex('lastPlayed', 'lastPlayed', { unique: false })
          worldsStore.createIndex('createdAt', 'createdAt', { unique: false })
          console.log('✅ Created object store: worlds')
        }

        // Object Store 4: Inventory Data
        if (!db.objectStoreNames.contains('inventory-data')) {
          db.createObjectStore('inventory-data', { keyPath: 'slotId' })
          console.log('✅ Created object store: inventory-data')
        }

        // Object Store 5: Environment Data
        if (!db.objectStoreNames.contains('environment-data')) {
          db.createObjectStore('environment-data', { keyPath: 'slotId' })
          console.log('✅ Created object store: environment-data')
        }
      }
    })
  }

  /**
   * Get the database connection (for sharing with WorldRepository)
   */
  getDatabase(): IDBDatabase | null {
    return this.db
  }

  /**
   * Save block modifications for a slot
   */
  async saveWorldData(slotId: string, modifications: Record<string, Record<string, number>>): Promise<void> {
    if (!this.db) throw new Error('[IndexedDBAdapter] Database not initialized')

    const transaction = this.db.transaction(['world-data'], 'readwrite')
    const store = transaction.objectStore('world-data')

    // Clear existing world data for this slot
    const index = store.index('slotId')
    const clearRequest = index.openCursor(IDBKeyRange.only(slotId))

    await new Promise<void>((resolve, reject) => {
      clearRequest.onsuccess = () => {
        const cursor = clearRequest.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      clearRequest.onerror = () => reject(clearRequest.error)
    })

    // Save new world data (in a new transaction since the previous one completed)
    const saveTransaction = this.db.transaction(['world-data'], 'readwrite')
    const saveStore = saveTransaction.objectStore('world-data')

    for (const chunkKey in modifications) {
      saveStore.put({
        slotId,
        chunkKey,
        modifications: modifications[chunkKey]
      })
    }

    return new Promise((resolve, reject) => {
      saveTransaction.oncomplete = () => resolve()
      saveTransaction.onerror = () => reject(saveTransaction.error)
    })
  }

  /**
   * Load block modifications for a slot
   */
  async loadWorldData(slotId: string): Promise<Record<string, Record<string, number>>> {
    if (!this.db) throw new Error('[IndexedDBAdapter] Database not initialized')

    const transaction = this.db.transaction(['world-data'], 'readonly')
    const store = transaction.objectStore('world-data')
    const index = store.index('slotId')

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(slotId))
      const result: Record<string, Record<string, number>> = {}

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          result[cursor.value.chunkKey] = cursor.value.modifications
          cursor.continue()
        } else {
          resolve(result)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save complete game state to a slot
   */
  async saveGame(slotId: string, snapshot: GameSnapshot): Promise<SaveSlot> {
    if (!this.db) {
      throw new Error('[IndexedDBAdapter] Database not initialized')
    }

    // Save world data first (block modifications)
    await this.saveWorldData(slotId, snapshot.blockModifications)

    const transaction = this.db.transaction(
      ['save-slots', 'player-data'],
      'readwrite'
    )

    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        console.error('[IndexedDBAdapter] Save transaction failed:', transaction.error)
        reject(transaction.error)
      }

      transaction.oncomplete = () => {
        console.log(`💾 Save complete: ${slotId}`)
        resolve(saveSlot)
      }

      // Create save slot metadata
      const saveSlot: SaveSlot = {
        id: slotId,
        worldId: snapshot.worldId || 'default',
        name: slotId,
        timestamp: snapshot.metadata.savedAt,
        playerPosition: snapshot.player.position,
        playerMode: snapshot.player.mode === 'Flying' ? 'flying' : 'walking',
        playTime: snapshot.metadata.playTime,
        thumbnail: null  // Thumbnail captured separately
      }

      // Store 1: Save slot metadata
      const slotsStore = transaction.objectStore('save-slots')
      slotsStore.put(saveSlot)

      // Store 2: Player data (including hotbar and time)
      const playerStore = transaction.objectStore('player-data')
      playerStore.put({
        slotId,
        ...snapshot.player,
        selectedHotbarSlot: snapshot.selectedHotbarSlot,
        timeOfDay: snapshot.timeOfDay
      })
    })
  }

  /**
   * Load game state from a slot
   */
  async loadGame(slotId: string): Promise<GameSnapshot> {
    if (!this.db) {
      throw new Error('[IndexedDBAdapter] Database not initialized')
    }

    // Load world data (block modifications)
    const blockModifications = await this.loadWorldData(slotId)

    const transaction = this.db.transaction(['player-data'], 'readonly')

    return new Promise((resolve, reject) => {
      const playerStore = transaction.objectStore('player-data')
      const playerRequest = playerStore.get(slotId)

      playerRequest.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to load player data:', playerRequest.error)
        reject(playerRequest.error)
      }

      playerRequest.onsuccess = () => {
        const playerData = playerRequest.result

        if (!playerData) {
          reject(new Error(`Save slot not found: ${slotId}`))
          return
        }

        // Reconstruct game snapshot with all fields
        const snapshot: GameSnapshot = {
          version: '1.0.0',
          player: {
            position: playerData.position,
            velocity: playerData.velocity,
            mode: playerData.mode,
            speed: playerData.speed,
            falling: playerData.falling,
            jumpVelocity: playerData.jumpVelocity
          },
          selectedHotbarSlot: playerData.selectedHotbarSlot ?? 1,
          timeOfDay: playerData.timeOfDay ?? null,
          blockModifications,
          metadata: {
            savedAt: Date.now(),
            playTime: 0
          }
        }

        console.log(`📂 Loaded save: ${slotId}`)
        resolve(snapshot)
      }
    })
  }

  /**
   * List all available save slots
   */
  async listSaveSlots(): Promise<SaveSlot[]> {
    if (!this.db) {
      throw new Error('[IndexedDBAdapter] Database not initialized')
    }

    const transaction = this.db.transaction(['save-slots'], 'readonly')
    const store = transaction.objectStore('save-slots')
    const index = store.index('timestamp')

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev') // Sort by timestamp descending
      const slots: SaveSlot[] = []

      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to list save slots:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          slots.push(cursor.value)
          cursor.continue()
        } else {
          resolve(slots)
        }
      }
    })
  }

  /**
   * Check if a save slot exists
   */
  async saveSlotExists(slotId: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('[IndexedDBAdapter] Database not initialized')
    }

    const transaction = this.db.transaction(['save-slots'], 'readonly')
    const store = transaction.objectStore('save-slots')

    return new Promise((resolve, reject) => {
      const request = store.get(slotId)

      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to check save slot:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve(request.result !== undefined)
      }
    })
  }

  /**
   * Get save slot metadata without loading full game
   */
  async getSaveSlotMetadata(slotId: string): Promise<SaveSlot | null> {
    if (!this.db) {
      throw new Error('[IndexedDBAdapter] Database not initialized')
    }

    const transaction = this.db.transaction(['save-slots'], 'readonly')
    const store = transaction.objectStore('save-slots')

    return new Promise((resolve, reject) => {
      const request = store.get(slotId)

      request.onerror = () => {
        console.error('[IndexedDBAdapter] Failed to get save slot metadata:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve(request.result || null)
      }
    })
  }

  /**
   * Delete a save slot and all associated data
   */
  async deleteSaveSlot(slotId: string): Promise<void> {
    if (!this.db) {
      throw new Error('[IndexedDBAdapter] Database not initialized')
    }

    const transaction = this.db.transaction(
      ['save-slots', 'player-data', 'world-data', 'inventory-data', 'environment-data'],
      'readwrite'
    )

    return new Promise((resolve, reject) => {
      transaction.onerror = () => {
        console.error('[IndexedDBAdapter] Delete transaction failed:', transaction.error)
        reject(transaction.error)
      }

      transaction.oncomplete = () => {
        console.log(`🗑️ Deleted save slot: ${slotId}`)
        resolve()
      }

      // Delete from all stores
      transaction.objectStore('save-slots').delete(slotId)
      transaction.objectStore('player-data').delete(slotId)
      transaction.objectStore('inventory-data').delete(slotId)
      transaction.objectStore('environment-data').delete(slotId)

      // Delete all world-data for this slot
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
}
