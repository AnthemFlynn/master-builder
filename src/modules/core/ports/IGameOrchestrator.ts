/**
 * Port interface for the game orchestrator.
 * Manages game lifecycle, state transitions, and coordinates all services.
 */
export interface IGameOrchestrator {
  /**
   * Start the game loop
   */
  start(): void

  /**
   * Stop the game loop and cleanup resources
   */
  stop(): void

  /**
   * Called when game should transition to playing state
   */
  onPlay(): void

  /**
   * Called when game should pause
   */
  onPause(): void
}
