// src/modules/ui/domain/Session.ts

/**
 * Session state represents the current gameplay session lifecycle
 */
export enum SessionState {
  /** No active game session */
  NO_SESSION = 'NO_SESSION',
  /** Loading a world (generating chunks, applying modifications) */
  LOADING = 'LOADING',
  /** Actively playing (pointer locked, input enabled) */
  PLAYING = 'PLAYING',
  /** Game paused (ESC menu, tab switch, or modal open) */
  PAUSED = 'PAUSED'
}

/**
 * Represents an active gameplay session
 * Sessions are in-memory only - not persisted directly
 * The session tracks state within a world between load and exit
 */
export interface Session {
  /** World ID this session is for */
  worldId: string

  /** Which save slot we loaded from, or null for new game */
  loadedFromSlot: string | null

  /** When this session started (for playtime tracking) */
  startedAt: number

  /** Whether there are unsaved changes since last save */
  unsavedChanges: boolean

  /** Current session state */
  state: SessionState

  /** Accumulated play time this session (seconds) */
  playTimeThisSession: number
}

/**
 * Events emitted by SessionManager
 */
export interface SessionStateChangedEvent {
  type: 'SessionStateChangedEvent'
  timestamp: number
  previousState: SessionState
  newState: SessionState
  session: Session | null
}

export interface SessionAutoSavedEvent {
  type: 'SessionAutoSavedEvent'
  timestamp: number
  worldId: string
  slotId: string
}
