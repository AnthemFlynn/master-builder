// src/modules/persistence/domain/GameSnapshot.ts

export interface PlayerSnapshot {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  mode: string                           // "Walking" | "Flying"
  speed: number
  falling: boolean
  jumpVelocity: number
}

export interface GameSnapshot {
  version: string                        // "1.0.0"
  player: PlayerSnapshot
  // Extended fields for full game state
  selectedHotbarSlot: number
  timeOfDay: number | null               // null = use real time
  blockModifications: Record<string, Record<string, number>>
  metadata: {
    savedAt: number
    playTime: number
  }
}
