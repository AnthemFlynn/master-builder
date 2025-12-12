// src/modules/persistence/ports/IPersistenceQuery.ts
import { SaveSlot } from '../domain/SaveSlot'
import { GameSnapshot } from '../domain/GameSnapshot'

/**
 * Port for read operations from persistence storage
 * Following hexagonal architecture: domain → port → adapter
 */
export interface IPersistenceQuery {
  /**
   * List all available save slots
   * @returns Promise<SaveSlot[]> - Array of save slot metadata
   */
  listSaveSlots(): Promise<SaveSlot[]>

  /**
   * Load game state from a slot
   * @param slotId - Unique identifier for the save slot
   * @returns Promise<GameSnapshot> - Complete game state
   */
  loadGame(slotId: string): Promise<GameSnapshot>

  /**
   * Check if a save slot exists
   * @param slotId - Unique identifier for the save slot
   * @returns Promise<boolean> - True if slot exists
   */
  saveSlotExists(slotId: string): Promise<boolean>

  /**
   * Get save slot metadata without loading full game
   * @param slotId - Unique identifier for the save slot
   * @returns Promise<SaveSlot | null> - Metadata or null if not found
   */
  getSaveSlotMetadata(slotId: string): Promise<SaveSlot | null>
}
