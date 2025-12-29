/**
 * GameState - Unified state enum for the entire application
 *
 * This is the SINGLE SOURCE OF TRUTH for game/UI state.
 * All components should use this enum, not module-specific copies.
 *
 * State categories:
 * - Boot sequence: SPLASH, MAIN_MENU, WORLD_SELECT, etc.
 * - Gameplay: PLAYING, PAUSE, RADIAL_MENU, CREATIVE_INVENTORY
 */
export enum GameState {
  // === Boot sequence ===
  /** Initial splash screen with logo */
  SPLASH = 'SPLASH',

  /** Main menu with Continue/New/Worlds/Settings */
  MAIN_MENU = 'MAIN_MENU',

  /** World selection list */
  WORLD_SELECT = 'WORLD_SELECT',

  /** World detail with saves and actions */
  WORLD_DETAIL = 'WORLD_DETAIL',

  /** Create new world form */
  CREATE_WORLD = 'CREATE_WORLD',

  /** Settings screen */
  SETTINGS = 'SETTINGS',

  /** Loading screen with progress */
  LOADING = 'LOADING',

  // === Gameplay ===
  /** Active gameplay (pointer locked, HUD visible) */
  PLAYING = 'PLAYING',

  /** In-game pause menu */
  PAUSE = 'PAUSE',

  /** Radial inventory menu (Tab held) */
  RADIAL_MENU = 'RADIAL_MENU',

  /** Creative inventory modal (B key) */
  CREATIVE_INVENTORY = 'CREATIVE_INVENTORY',
}

/**
 * Check if state is a menu/UI state (not gameplay)
 */
export function isMenuState(state: GameState): boolean {
  return [
    GameState.SPLASH,
    GameState.MAIN_MENU,
    GameState.WORLD_SELECT,
    GameState.WORLD_DETAIL,
    GameState.CREATE_WORLD,
    GameState.SETTINGS,
    GameState.LOADING,
    GameState.PAUSE,
  ].includes(state)
}

/**
 * Check if state allows gameplay input (movement, building, etc.)
 */
export function isPlayingState(state: GameState): boolean {
  return state === GameState.PLAYING
}

/**
 * Check if state is an overlay over gameplay (radial menu, inventory)
 */
export function isOverlayState(state: GameState): boolean {
  return [
    GameState.RADIAL_MENU,
    GameState.CREATIVE_INVENTORY,
  ].includes(state)
}

/**
 * Screen navigation parameters
 */
export interface ScreenParams {
  /** World ID for WORLD_DETAIL screen */
  worldId?: string
  /** Loading message for LOADING screen */
  loadingMessage?: string
  /** Whether coming from pause */
  fromPause?: boolean
}
