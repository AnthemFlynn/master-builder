// src/modules/persistence/application/SessionManager.ts

import { EventBus } from '../../../shared/infrastructure/EventBus'
import { Session, SessionState, SessionStateChangedEvent, SessionAutoSavedEvent } from '../../ui/domain/Session'

/**
 * Callbacks for SessionManager to interact with game systems
 * Using callbacks to avoid circular dependencies with GameOrchestrator
 */
export interface SessionManagerCallbacks {
  /** Lock pointer for gameplay */
  lockPointer: () => void
  /** Unlock pointer for menus */
  unlockPointer: () => void
  /** Check if pointer is currently locked */
  isPointerLocked: () => boolean
  /** Save game to a slot */
  saveToSlot: (slotId: string) => Promise<void>
  /** Load game from a slot */
  loadFromSlot: (slotId: string) => Promise<void>
  /** Clear all chunks and modifications for new game */
  clearWorld: () => void
  /** Generate chunks around position */
  generateChunksAround: (x: number, z: number) => void
  /** Check if chunks exist in memory */
  hasLoadedChunks: () => boolean
  /** Get current world ID (from loaded save or default) */
  getCurrentWorldId: () => string
}

/**
 * SessionManager - Core session lifecycle management
 *
 * Responsibilities:
 * - Track active gameplay session state
 * - Handle Page Visibility API (tab switch = auto-pause)
 * - Coordinate save/load operations
 * - Distinguish between MENU (no session) and PAUSE (active session paused)
 *
 * Key insight: This fixes the core bug where resume was regenerating chunks
 * by properly tracking whether we have an active session with loaded chunks.
 */
export class SessionManager {
  private currentSession: Session | null = null
  private lastPlayTimeUpdate = 0
  private visibilityPauseOverlay: HTMLElement | null = null

  constructor(
    private eventBus: EventBus,
    private callbacks: SessionManagerCallbacks
  ) {
    this.setupVisibilityHandling()
    this.createVisibilityPauseOverlay()
  }

  // === Public Getters ===

  hasActiveSession(): boolean {
    return this.currentSession !== null
  }

  getSession(): Session | null {
    return this.currentSession
  }

  getSessionState(): SessionState {
    return this.currentSession?.state ?? SessionState.NO_SESSION
  }

  isPlaying(): boolean {
    return this.currentSession?.state === SessionState.PLAYING
  }

  isPaused(): boolean {
    return this.currentSession?.state === SessionState.PAUSED
  }

  hasUnsavedChanges(): boolean {
    return this.currentSession?.unsavedChanges ?? false
  }

  // === Session Lifecycle ===

  /**
   * Start a new game session (new world or new game in existing world)
   * This WILL clear chunks and regenerate
   */
  async startNewSession(worldId: string): Promise<void> {
    console.log(`[SessionManager] Starting new session for world: ${worldId}`)

    // End any existing session first
    if (this.currentSession) {
      await this.endSession(false) // Don't save - starting fresh
    }

    // Create new session
    this.currentSession = {
      worldId,
      loadedFromSlot: null,
      startedAt: Date.now(),
      unsavedChanges: false,
      state: SessionState.LOADING,
      playTimeThisSession: 0
    }

    this.emitStateChange(SessionState.NO_SESSION, SessionState.LOADING)

    // Clear world for fresh start
    this.callbacks.clearWorld()
  }

  /**
   * Load a session from a save slot
   * This WILL clear chunks and regenerate with modifications applied
   */
  async loadSession(worldId: string, slotId: string): Promise<void> {
    console.log(`[SessionManager] Loading session from slot: ${slotId}`)

    // End any existing session first
    if (this.currentSession) {
      await this.endSession(false)
    }

    // Create session for loaded game
    this.currentSession = {
      worldId,
      loadedFromSlot: slotId,
      startedAt: Date.now(),
      unsavedChanges: false,
      state: SessionState.LOADING,
      playTimeThisSession: 0
    }

    this.emitStateChange(SessionState.NO_SESSION, SessionState.LOADING)

    // Load will clear chunks and regenerate with modifications
    await this.callbacks.loadFromSlot(slotId)
  }

  /**
   * Called when loading completes (chunks ready)
   */
  onLoadingComplete(): void {
    if (!this.currentSession) return
    if (this.currentSession.state !== SessionState.LOADING) return

    console.log('[SessionManager] Loading complete, entering PLAYING state')

    const previousState = this.currentSession.state
    this.currentSession.state = SessionState.PLAYING
    this.lastPlayTimeUpdate = Date.now()

    this.emitStateChange(previousState, SessionState.PLAYING)
  }

  /**
   * Resume from pause - NO chunk clearing, instant resume
   * This is the key fix: resume just re-locks pointer
   */
  resumeSession(): void {
    if (!this.currentSession) {
      console.warn('[SessionManager] Cannot resume - no active session')
      return
    }

    if (this.currentSession.state !== SessionState.PAUSED) {
      console.warn('[SessionManager] Cannot resume - not in PAUSED state')
      return
    }

    console.log('[SessionManager] Resuming session (no regeneration)')

    const previousState = this.currentSession.state
    this.currentSession.state = SessionState.PLAYING
    this.lastPlayTimeUpdate = Date.now()

    // Hide visibility pause overlay if shown
    this.hideVisibilityPauseOverlay()

    // Just lock pointer - chunks are already in memory!
    this.callbacks.lockPointer()

    this.emitStateChange(previousState, SessionState.PLAYING)
  }

  /**
   * Pause the session (ESC key, pointer unlock, or tab switch)
   * Auto-saves to autosave slot
   */
  async pauseSession(autoSave = true): Promise<void> {
    if (!this.currentSession) return
    if (this.currentSession.state !== SessionState.PLAYING) return

    console.log('[SessionManager] Pausing session')

    // Update play time
    this.updatePlayTime()

    const previousState = this.currentSession.state
    this.currentSession.state = SessionState.PAUSED

    // Unlock pointer
    this.callbacks.unlockPointer()

    // Auto-save if requested and there are unsaved changes
    if (autoSave && this.currentSession.unsavedChanges) {
      await this.autoSave()
    }

    this.emitStateChange(previousState, SessionState.PAUSED)
  }

  /**
   * Save current session to a specific slot
   */
  async saveSession(slotId: string): Promise<void> {
    if (!this.currentSession) {
      console.warn('[SessionManager] Cannot save - no active session')
      return
    }

    console.log(`[SessionManager] Saving to slot: ${slotId}`)

    this.updatePlayTime()
    await this.callbacks.saveToSlot(slotId)

    this.currentSession.unsavedChanges = false
    this.currentSession.loadedFromSlot = slotId

    console.log('[SessionManager] Save complete')
  }

  /**
   * End the session completely (exit to menu)
   */
  async endSession(saveFirst = true): Promise<void> {
    if (!this.currentSession) return

    console.log('[SessionManager] Ending session')

    this.updatePlayTime()

    // Save before ending if requested
    if (saveFirst && this.currentSession.unsavedChanges) {
      await this.autoSave()
    }

    const previousState = this.currentSession.state
    this.currentSession = null

    this.hideVisibilityPauseOverlay()
    this.callbacks.unlockPointer()

    this.emitStateChange(previousState, SessionState.NO_SESSION)
  }

  /**
   * Mark session as having unsaved changes
   * Called when blocks are placed/removed
   */
  markUnsavedChanges(): void {
    if (this.currentSession) {
      this.currentSession.unsavedChanges = true
    }
  }

  // === Page Visibility API ===

  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      this.onVisibilityChange()
    })

    // Also handle window blur (user clicked outside browser)
    window.addEventListener('blur', () => {
      // Only pause if we're actually playing
      if (this.isPlaying() && this.callbacks.isPointerLocked()) {
        this.onTabHidden()
      }
    })
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.onTabHidden()
    } else {
      this.onTabVisible()
    }
  }

  private onTabHidden(): void {
    if (!this.isPlaying()) return

    console.log('[SessionManager] Tab hidden - auto-pausing')

    // Pause with auto-save
    this.pauseSession(true)

    // Show the "Click to Resume" overlay
    this.showVisibilityPauseOverlay()
  }

  private onTabVisible(): void {
    // Don't auto-resume - show overlay and wait for user interaction
    // This is better UX than suddenly being in-game when switching back
    if (this.isPaused() && this.visibilityPauseOverlay?.classList.contains('visible')) {
      console.log('[SessionManager] Tab visible - showing resume overlay')
    }
  }

  // === Visibility Pause Overlay ===

  private createVisibilityPauseOverlay(): void {
    // Create overlay for tab-switch pause
    this.visibilityPauseOverlay = document.createElement('div')
    this.visibilityPauseOverlay.id = 'visibility-pause-overlay'
    this.visibilityPauseOverlay.innerHTML = `
      <div class="visibility-pause-content">
        <h2>Game Paused</h2>
        <p>Click anywhere to resume</p>
      </div>
    `
    this.visibilityPauseOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      cursor: pointer;
    `

    const content = this.visibilityPauseOverlay.querySelector('.visibility-pause-content') as HTMLElement
    if (content) {
      content.style.cssText = `
        text-align: center;
        color: white;
        font-family: 'Minecraft', sans-serif;
      `
    }

    const h2 = this.visibilityPauseOverlay.querySelector('h2') as HTMLElement
    if (h2) {
      h2.style.cssText = `
        font-size: 3rem;
        margin-bottom: 1rem;
        text-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
      `
    }

    const p = this.visibilityPauseOverlay.querySelector('p') as HTMLElement
    if (p) {
      p.style.cssText = `
        font-size: 1.2rem;
        opacity: 0.7;
        animation: pulse 1.5s ease-in-out infinite;
      `
    }

    // Click to resume
    this.visibilityPauseOverlay.addEventListener('click', () => {
      this.hideVisibilityPauseOverlay()
      this.resumeSession()
    })

    document.body.appendChild(this.visibilityPauseOverlay)
  }

  private showVisibilityPauseOverlay(): void {
    if (this.visibilityPauseOverlay) {
      this.visibilityPauseOverlay.style.display = 'flex'
      this.visibilityPauseOverlay.classList.add('visible')
    }
  }

  private hideVisibilityPauseOverlay(): void {
    if (this.visibilityPauseOverlay) {
      this.visibilityPauseOverlay.style.display = 'none'
      this.visibilityPauseOverlay.classList.remove('visible')
    }
  }

  // === Helpers ===

  private async autoSave(): Promise<void> {
    if (!this.currentSession) return

    console.log('[SessionManager] Auto-saving to autosave slot')

    try {
      await this.callbacks.saveToSlot('autosave')
      this.currentSession.unsavedChanges = false

      this.eventBus.emit('session', {
        type: 'SessionAutoSavedEvent',
        timestamp: Date.now(),
        worldId: this.currentSession.worldId,
        slotId: 'autosave'
      } as SessionAutoSavedEvent)
    } catch (error) {
      console.error('[SessionManager] Auto-save failed:', error)
    }
  }

  private updatePlayTime(): void {
    if (!this.currentSession) return
    if (this.lastPlayTimeUpdate === 0) return

    const now = Date.now()
    const delta = (now - this.lastPlayTimeUpdate) / 1000
    this.currentSession.playTimeThisSession += delta
    this.lastPlayTimeUpdate = now
  }

  private emitStateChange(previousState: SessionState, newState: SessionState): void {
    this.eventBus.emit('session', {
      type: 'SessionStateChangedEvent',
      timestamp: Date.now(),
      previousState,
      newState,
      session: this.currentSession
    } as SessionStateChangedEvent)

    console.log(`[SessionManager] State: ${previousState} -> ${newState}`)
  }
}
