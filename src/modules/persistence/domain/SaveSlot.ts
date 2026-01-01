// src/modules/persistence/domain/SaveSlot.ts

/**
 * SaveSlot - represents a saved game state within a world
 *
 * Each world can have multiple save slots:
 * - 1 autosave slot (automatically saved on pause/tab-switch)
 * - 9 manual save slots (user-initiated saves)
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
 * Predefined slot IDs for each world (1 autosave + 9 manual = 10 total)
 */
export const SAVE_SLOT_IDS = [
  'autosave',
  'slot-1', 'slot-2', 'slot-3',
  'slot-4', 'slot-5', 'slot-6',
  'slot-7', 'slot-8', 'slot-9'
] as const
export type SaveSlotId = typeof SAVE_SLOT_IDS[number]

/**
 * Get display name for a slot ID
 */
export function getSlotDisplayName(slotId: string): string {
  if (slotId === 'autosave') return 'Auto Save'

  // Handle slot-N pattern (slot-1 through slot-9)
  const match = slotId.match(/^slot-(\d+)$/)
  if (match) {
    return `Slot ${match[1]}`
  }

  return slotId
}
