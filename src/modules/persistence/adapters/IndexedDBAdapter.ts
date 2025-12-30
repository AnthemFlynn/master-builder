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
  private initPromise: Promise<void> | null = null
  private readonly dbName = 'kingdom-builder-saves'
  private readonly version = 1

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null
  }

  /**
   * Ensure database is initialized before operations
   * Safe to call multiple times - will return existing promise if initializing
   */
  private async ensureInitialized(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise
    this.initPromise = this.initialize()
    return this.initPromise
  }

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

        // Object Store 1: Save Slots (metadata)
        if (!db.objectStoreNames.contains('save-slots')) {
          const slotsStore = db.createObjectStore('save-slots', { keyPath: 'id' })
          slotsStore.createIndex('timestamp', 'timestamp', { unique: false })
          slotsStore.createIndex('worldPresetId', 'worldPresetId', { unique: false })
          console.log('✅ Created object store: save-slots')
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
   * Save complete game state to a slot
   */
  async saveGame(slotId: string, snapshot: GameSnapshot): Promise<SaveSlot> {
    await this.ensureInitialized()

    // Create save slot metadata first (before transaction)
    const saveSlot: SaveSlot = {
      id: slotId,
      name: slotId, // Will be improved in Phase 6
      timestamp: snapshot.metadata.savedAt,
      worldPresetId: 'island', // TODO: Will be added in Phase 3
      playerPosition: snapshot.player.position,
      playTime: snapshot.metadata.playTime
    }

    const transaction = this.db!.transaction(
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

      // Store 1: Save slot metadata
      const slotsStore = transaction.objectStore('save-slots')
      slotsStore.put(saveSlot)

      // Store 2: Player data
      const playerStore = transaction.objectStore('player-data')
      playerStore.put({
        slotId,
        ...snapshot.player
      })
    })
  }

  /**
   * Load game state from a slot
   */
  async loadGame(slotId: string): Promise<GameSnapshot> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['player-data'], 'readonly')

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

        // Reconstruct game snapshot
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
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['save-slots'], 'readonly')
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
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['save-slots'], 'readonly')
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
    await this.ensureInitialized()

    const transaction = this.db!.transaction(['save-slots'], 'readonly')
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
    await this.ensureInitialized()

    const transaction = this.db!.transaction(
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
