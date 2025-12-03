import { Action, InputType } from './InputManager'

/**
 * Default keybindings for Master Builder
 *
 * Categories:
 * - movement: WASD movement
 * - vertical: Flying up/down, jumping, sneaking
 * - building: Block placement and destruction
 * - ui: Menus, pause, portal
 * - camera: Camera controls
 * - inventory: Block selection
 * - time: Time/location controls (debug)
 */
export const DEFAULT_ACTIONS: Action[] = [
  // ============================================================================
  // MOVEMENT
  // ============================================================================
  {
    name: 'move_forward',
    description: 'Move forward',
    category: 'movement',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyW' },
      { type: InputType.GAMEPAD, key: 'gamepad:lstick_up' }
    ]
  },
  {
    name: 'move_backward',
    description: 'Move backward',
    category: 'movement',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyS' },
      { type: InputType.GAMEPAD, key: 'gamepad:lstick_down' }
    ]
  },
  {
    name: 'move_left',
    description: 'Strafe left',
    category: 'movement',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyA' },
      { type: InputType.GAMEPAD, key: 'gamepad:lstick_left' }
    ]
  },
  {
    name: 'move_right',
    description: 'Strafe right',
    category: 'movement',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyD' },
      { type: InputType.GAMEPAD, key: 'gamepad:lstick_right' }
    ]
  },

  // ============================================================================
  // VERTICAL MOVEMENT
  // ============================================================================
  {
    name: 'jump',
    description: 'Jump (walking mode)',
    category: 'vertical',
    bindings: [
      { type: InputType.KEYBOARD, key: 'Space' },
      { type: InputType.GAMEPAD, key: 'gamepad:button_0' } // A button
    ]
  },
  {
    name: 'sneak',
    description: 'Sneak/crouch (walking mode)',
    category: 'vertical',
    bindings: [
      { type: InputType.KEYBOARD, key: 'ShiftLeft' },
      { type: InputType.KEYBOARD, key: 'ShiftRight' },
      { type: InputType.GAMEPAD, key: 'gamepad:button_1' } // B button
    ]
  },
  {
    name: 'fly_up',
    description: 'Fly upward (flying mode)',
    category: 'vertical',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyE' },
      { type: InputType.KEYBOARD, key: 'Space' }, // Also works in flying mode
      { type: InputType.GAMEPAD, key: 'gamepad:button_5' } // RB
    ]
  },
  {
    name: 'fly_down',
    description: 'Fly downward (flying mode)',
    category: 'vertical',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyQ' },
      { type: InputType.KEYBOARD, key: 'ShiftLeft' }, // Also works in flying mode
      { type: InputType.GAMEPAD, key: 'gamepad:button_4' } // LB
    ]
  },
  {
    name: 'toggle_flying',
    description: 'Toggle flying mode',
    category: 'vertical',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyF' },
      { type: InputType.GAMEPAD, key: 'gamepad:button_3' } // Y button
    ]
  },

  // ============================================================================
  // BUILDING
  // ============================================================================
  {
    name: 'build_block',
    description: 'Place block',
    category: 'building',
    bindings: [
      { type: InputType.MOUSE, key: 'mouse:right' },
      { type: InputType.KEYBOARD, key: 'KeyC' },
      { type: InputType.GAMEPAD, key: 'gamepad:button_7' } // RT
    ]
  },
  {
    name: 'destroy_block',
    description: 'Destroy block',
    category: 'building',
    bindings: [
      { type: InputType.MOUSE, key: 'mouse:left' },
      { type: InputType.KEYBOARD, key: 'KeyN' },
      { type: InputType.GAMEPAD, key: 'gamepad:button_6' } // LT
    ]
  },

  // ============================================================================
  // CAMERA
  // ============================================================================
  {
    name: 'camera_up',
    description: 'Look up',
    category: 'camera',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyI' },
      { type: InputType.GAMEPAD, key: 'gamepad:rstick_up' }
    ]
  },
  {
    name: 'camera_down',
    description: 'Look down',
    category: 'camera',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyK' },
      { type: InputType.GAMEPAD, key: 'gamepad:rstick_down' }
    ]
  },
  {
    name: 'camera_left',
    description: 'Look left',
    category: 'camera',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyJ' },
      { type: InputType.GAMEPAD, key: 'gamepad:rstick_left' }
    ]
  },
  {
    name: 'camera_right',
    description: 'Look right',
    category: 'camera',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyL' },
      { type: InputType.GAMEPAD, key: 'gamepad:rstick_right' }
    ]
  },

  // ============================================================================
  // INVENTORY / BLOCK SELECTION
  // ============================================================================
  {
    name: 'select_slot_1',
    description: 'Select inventory slot 1',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit1' }]
  },
  {
    name: 'select_slot_2',
    description: 'Select inventory slot 2',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit2' }]
  },
  {
    name: 'select_slot_3',
    description: 'Select inventory slot 3',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit3' }]
  },
  {
    name: 'select_slot_4',
    description: 'Select inventory slot 4',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit4' }]
  },
  {
    name: 'select_slot_5',
    description: 'Select inventory slot 5',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit5' }]
  },
  {
    name: 'select_slot_6',
    description: 'Select inventory slot 6',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit6' }]
  },
  {
    name: 'select_slot_7',
    description: 'Select inventory slot 7',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit7' }]
  },
  {
    name: 'select_slot_8',
    description: 'Select inventory slot 8',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit8' }]
  },
  {
    name: 'select_slot_9',
    description: 'Select inventory slot 9',
    category: 'inventory',
    bindings: [{ type: InputType.KEYBOARD, key: 'Digit9' }]
  },
  {
    name: 'category_mode',
    description: 'Toggle category selection mode',
    category: 'inventory',
    bindings: [
      { type: InputType.KEYBOARD, key: 'Tab' }
    ]
  },

  // ============================================================================
  // UI CONTROLS
  // ============================================================================
  {
    name: 'pause',
    description: 'Pause game / Open menu',
    category: 'ui',
    bindings: [
      { type: InputType.KEYBOARD, key: 'Escape' },
      { type: InputType.GAMEPAD, key: 'gamepad:button_9' } // Start button
    ]
  },
  {
    name: 'fullscreen',
    description: 'Toggle fullscreen',
    category: 'ui',
    bindings: [{ type: InputType.KEYBOARD, key: 'KeyF11' }]
  },
  {
    name: 'portal_gateway',
    description: 'Open Portal Gateway (time/location travel)',
    category: 'ui',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyP', modifiers: { meta: true } },
      { type: InputType.KEYBOARD, key: 'KeyP', modifiers: { ctrl: true } }
    ]
  },

  // ============================================================================
  // DEBUG / BUILDER TOOLS
  // ============================================================================
  {
    name: 'spawn_stonehenge',
    description: 'Spawn Stonehenge sundial (debug)',
    category: 'debug',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyB', modifiers: { meta: true } },
      { type: InputType.KEYBOARD, key: 'KeyB', modifiers: { ctrl: true } }
    ]
  },
  {
    name: 'time_override_mode',
    description: 'Enter time override mode',
    category: 'debug',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyT', modifiers: { alt: true } }
    ]
  },
  {
    name: 'location_cycle',
    description: 'Cycle through location presets',
    category: 'debug',
    bindings: [
      { type: InputType.KEYBOARD, key: 'KeyL', modifiers: { alt: true } }
    ]
  }
]

/**
 * Category display names and order
 */
export const CATEGORY_DISPLAY = {
  movement: { name: 'Movement', order: 1 },
  vertical: { name: 'Vertical / Flying', order: 2 },
  building: { name: 'Building', order: 3 },
  camera: { name: 'Camera', order: 4 },
  inventory: { name: 'Inventory', order: 5 },
  ui: { name: 'UI / Menus', order: 6 },
  debug: { name: 'Debug Tools', order: 7 }
}

/**
 * User-friendly key names for display
 */
export const KEY_DISPLAY_NAMES: Record<string, string> = {
  // Letters
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F',
  KeyG: 'G', KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L',
  KeyM: 'M', KeyN: 'N', KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R',
  KeyS: 'S', KeyT: 'T', KeyU: 'U', KeyV: 'V', KeyW: 'W', KeyX: 'X',
  KeyY: 'Y', KeyZ: 'Z',

  // Numbers
  Digit0: '0', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4',
  Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9',

  // Special keys
  Space: 'Space',
  Enter: 'Enter',
  Escape: 'Esc',
  Tab: 'Tab',
  Backspace: 'Backspace',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Alt',
  MetaLeft: 'Cmd',
  MetaRight: 'Cmd',

  // Function keys
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
  F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',

  // Arrow keys
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',

  // Mouse
  'mouse:left': 'Left Click',
  'mouse:middle': 'Middle Click',
  'mouse:right': 'Right Click',

  // Gamepad
  'gamepad:button_0': 'A',
  'gamepad:button_1': 'B',
  'gamepad:button_2': 'X',
  'gamepad:button_3': 'Y',
  'gamepad:button_4': 'LB',
  'gamepad:button_5': 'RB',
  'gamepad:button_6': 'LT',
  'gamepad:button_7': 'RT',
  'gamepad:button_8': 'Select',
  'gamepad:button_9': 'Start',
  'gamepad:button_10': 'L3',
  'gamepad:button_11': 'R3',
  'gamepad:lstick_up': 'LS ↑',
  'gamepad:lstick_down': 'LS ↓',
  'gamepad:lstick_left': 'LS ←',
  'gamepad:lstick_right': 'LS →',
  'gamepad:rstick_up': 'RS ↑',
  'gamepad:rstick_down': 'RS ↓',
  'gamepad:rstick_left': 'RS ←',
  'gamepad:rstick_right': 'RS →'
}

/**
 * Get display name for a key code
 */
export function getKeyDisplayName(keyCode: string): string {
  return KEY_DISPLAY_NAMES[keyCode] || keyCode
}
