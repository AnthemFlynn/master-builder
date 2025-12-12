// src/modules/persistence/domain/SaveSlot.ts
export interface SaveSlot {
  readonly id: string                    // UUID or timestamp-based
  readonly name: string                  // "Auto Save", "Manual Save 1", etc.
  readonly timestamp: number             // Last save time (Date.now())
  readonly worldPresetId: string         // "island", "canyon", "mountains"
  readonly playerPosition: {
    x: number
    y: number
    z: number
  }
  readonly playTime: number              // Total play time in seconds
}
