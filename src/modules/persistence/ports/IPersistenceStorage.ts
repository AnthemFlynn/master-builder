// src/modules/persistence/ports/IPersistenceStorage.ts
import { SaveSlot } from '../domain/SaveSlot'
import { GameSnapshot } from '../domain/GameSnapshot'

/**
 * Port for write operations to persistence storage
 * Following hexagonal architecture: domain → port → adapter
 */
export interface IPersistenceStorage {
  /**
   * Initialize the storage backend (create database, object stores, etc.)
   */
  initialize(): Promise<void>

  /**
   * Save complete game state to a slot
   * @param slotId - Unique identifier for the save slot
   * @param snapshot - Complete game state to persist
   * @returns Promise<SaveSlot> - Metadata of saved game
   */
  saveGame(slotId: string, snapshot: GameSnapshot): Promise<SaveSlot>

  /**
   * Delete a save slot and all associated data
   * @param slotId - Unique identifier for the save slot to delete
   */
  deleteSaveSlot(slotId: string): Promise<void>
}
