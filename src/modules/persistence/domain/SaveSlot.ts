// src/modules/persistence/domain/SaveSlot.ts

/**
 * SaveSlot - represents a saved game state within a world
 *
 * Each world can have multiple save slots:
 * - 1 autosave slot (automatically saved on pause/tab-switch)
 * - 3 manual save slots (user-initiated saves)
 */
export interface SaveSlot {
  readonly id: string                      // "autosave" | "slot-1" | "slot-2" | "slot-3"
  readonly worldId: string                 // Foreign key to World
  readonly name: string                    // Display name, e.g., "Auto Save", "Slot 1"
  readonly timestamp: number               // When saved (Date.now())
  readonly playerPosition: {
    x: number
    y: number
    z: number
  }
  readonly playerMode: 'walking' | 'flying'
  readonly playTime: number                // Total play time in seconds at save
  readonly thumbnail: string | null        // Base64 screenshot captured at save time
}

/**
 * Predefined slot IDs for each world
 */
export const SAVE_SLOT_IDS = ['autosave', 'slot-1', 'slot-2', 'slot-3'] as const
export type SaveSlotId = typeof SAVE_SLOT_IDS[number]

/**
 * Get display name for a slot ID
 */
export function getSlotDisplayName(slotId: string): string {
  switch (slotId) {
    case 'autosave': return 'Auto Save'
    case 'slot-1': return 'Slot 1'
    case 'slot-2': return 'Slot 2'
    case 'slot-3': return 'Slot 3'
    default: return slotId
  }
}
