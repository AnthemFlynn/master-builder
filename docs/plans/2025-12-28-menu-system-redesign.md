# Menu System Redesign - Full AAA Implementation

**Created:** 2025-12-28
**Status:** Design Complete, Awaiting Implementation
**Estimated Effort:** 12-14 days

---

## Overview

Complete redesign of the menu system from basic programmer UI to best-in-class gamer UX with:
- Multi-world support with thumbnails
- Session-based state management
- Fantasy wooden panel visual style
- Auto-save on pause/tab-switch
- Distinct pause menu vs main menu

---

## Problem Statement

### Current Issues
1. **No distinction between MENU and PAUSE** - Both show same UI
2. **Play button always regenerates world** - Calls `clearAllChunks()` even when resuming
3. **No Page Visibility API** - Tab switch triggers unnecessary pause flow
4. **Single world only** - Just save slots, no world management
5. **5-10 second loading on every resume** - Because chunks cleared unnecessarily

### Root Cause
The game lacks a "session" concept - it doesn't know the difference between "no game started" and "game paused."

---

## Architecture

### Three-Tier State System

```
APPLICATION STATE
├── AppState: SPLASH → MAIN_MENU → IN_GAME → MAIN_MENU

SESSION STATE (in-memory)
├── SessionState: NO_SESSION | LOADING | PLAYING | PAUSED
├── CurrentWorld: World | null
├── LastSaved: timestamp
└── PlayTime: seconds

WORLD STATE (persisted to IndexedDB)
├── Worlds: World[]
└── Each World: { id, name, seed, thumbnail, saves[], ... }
```

### Data Model

```typescript
interface World {
  id: string                    // UUID
  name: string                  // "My Kingdom"
  seed: number                  // 42069
  worldType: string             // "default" | "flat" | "caves" | ...
  gameMode: "creative" | "survival"
  createdAt: number             // timestamp
  lastPlayed: number            // timestamp
  totalPlayTime: number         // seconds
  thumbnail: string | null      // base64 image
  settings: WorldSettings       // render distance, etc.
}

interface SaveSlot {
  id: string                    // "autosave" | "manual-1" | "manual-2" | "manual-3"
  worldId: string               // foreign key to World
  timestamp: number             // when saved
  playTime: number              // session play time
  playerPosition: Vector3
  playerMode: "walking" | "flying"
  modifications: SerializedModifications
  thumbnail: string | null      // captured at save time
}

interface Session {
  worldId: string
  loadedFromSlot: string | null // which save we loaded, or null for new
  startedAt: number
  unsavedChanges: boolean
  state: "loading" | "playing" | "paused"
}
```

---

## Menu Flow

```
SPLASH SCREEN
    ↓ click
MAIN MENU
├── [Continue] ← only if last session exists (loads autosave)
├── [Worlds] → WORLD SELECT
└── [Settings] → SETTINGS SCREEN

WORLD SELECT
├── World cards (thumbnail, name, last played, playtime)
├── [+ Create New World] → CREATE WORLD SCREEN
└── Click world → WORLD DETAIL

WORLD DETAIL
├── Large thumbnail + world info
├── Save slots (autosave + 3 manual)
│   ├── [Play] - load this slot
│   ├── [Save] - save current to this slot (if in-game)
│   └── [Delete] - remove this save
├── [Edit World] - rename
├── [Delete World] - with confirmation
└── [Back]

CREATE WORLD SCREEN
├── World name input
├── Seed input (optional)
├── Game mode toggle (Creative/Survival)
├── World type selector (Default/Flat/Caves/Forest/Crystals)
└── [Create World] / [Cancel]

PAUSE SCREEN (distinct from main menu)
├── [Resume Game] ← primary action
├── [Save Game] → slot picker
├── [Settings]
└── [Save & Exit to Menu]

LOADING SCREEN
├── World name
├── Progress bar with percentage
└── Status text (Generating terrain... / Loading saves...)
```

---

## Visual Design

### Design Tokens

```css
:root {
  /* Wood tones */
  --wood-dark: #5D4037;
  --wood-medium: #8D6E63;
  --wood-light: #A1887F;
  --wood-grain: linear-gradient(90deg, #5D4037 0%, #6D4C41 50%, #5D4037 100%);

  /* Accent colors */
  --parchment: #F5E6D3;
  --ribbon-red: #C62828;
  --ribbon-red-dark: #8E0000;
  --button-green: #4CAF50;
  --button-green-dark: #2E7D32;
  --button-purple: #7B5EAD;
  --button-purple-dark: #5E4490;
  --stone-blue: #78909C;
  --stone-blue-dark: #546E7A;

  /* Text */
  --text-light: #FFFFFF;
  --text-dark: #3E2723;
  --text-muted: #8D6E63;

  /* Effects */
  --glow-gold: 0 0 20px rgba(255, 193, 7, 0.5);
  --glow-green: 0 0 20px rgba(76, 175, 80, 0.5);
  --shadow-panel: 0 8px 32px rgba(0, 0, 0, 0.5);
}
```

### Components

1. **Panel** - Wooden frame with stone corner decorations
2. **Button** - Beveled 3D effect, primary (green) and secondary (purple)
3. **RibbonTitle** - Red banner for section headers
4. **WorldCard** - Thumbnail + info card for world list
5. **SaveSlotCard** - Save slot display with actions
6. **Modal** - Overlay dialog with backdrop blur
7. **ProgressBar** - Animated loading bar with glow
8. **Input** - Styled text input with parchment background
9. **ToggleGroup** - Mutually exclusive option buttons

---

## Technical Implementation

### New Files

```
src/modules/ui/
├── domain/
│   ├── MenuScreen.ts           # Screen enum
│   └── Session.ts              # Session interface
│
├── application/
│   ├── SessionManager.ts       # Session lifecycle
│   ├── WorldManager.ts         # World CRUD
│   └── ScreenManager.ts        # Screen navigation
│
├── components/
│   ├── base/
│   │   ├── Panel.ts
│   │   ├── Button.ts
│   │   ├── RibbonTitle.ts
│   │   ├── Modal.ts
│   │   ├── Input.ts
│   │   ├── ToggleGroup.ts
│   │   └── ProgressBar.ts
│   │
│   ├── screens/
│   │   ├── SplashScreen.ts
│   │   ├── MainMenuScreen.ts
│   │   ├── WorldSelectScreen.ts
│   │   ├── WorldDetailScreen.ts
│   │   ├── CreateWorldScreen.ts
│   │   ├── SettingsScreen.ts
│   │   └── PauseScreen.ts
│   │
│   └── widgets/
│       ├── WorldCard.ts
│       └── SaveSlotCard.ts
│
└── styles/
    ├── design-tokens.css
    ├── components.css
    └── screens.css

src/modules/persistence/
├── domain/
│   └── World.ts                # World entity
│
└── application/
    ├── WorldRepository.ts      # IndexedDB world storage
    └── ThumbnailCapture.ts     # Screenshot service
```

### Key Classes

```typescript
class SessionManager {
  private currentSession: Session | null = null

  hasActiveSession(): boolean
  getCurrentWorld(): World | null

  async startNewSession(worldId: string): Promise<void>
  async loadSession(worldId: string, slotId: string): Promise<void>
  async resumeSession(): Promise<void>  // No chunk clearing!
  async pauseSession(): Promise<void>   // Auto-save
  async saveSession(slotId: string): Promise<void>
  async endSession(): Promise<void>

  // Page Visibility API
  private setupVisibilityHandling(): void
  private onVisibilityChange(): void
}

class WorldManager {
  async listWorlds(): Promise<World[]>
  async getWorld(id: string): Promise<World | null>
  async createWorld(params: CreateWorldParams): Promise<World>
  async updateWorld(id: string, updates: Partial<World>): Promise<void>
  async deleteWorld(id: string): Promise<void>
  async getWorldSaves(worldId: string): Promise<SaveSlot[]>
}

class ScreenManager {
  private currentScreen: MenuScreen
  private screenStack: MenuScreen[] = []  // For back navigation

  navigateTo(screen: MenuScreen, params?: any): void
  goBack(): void
  getCurrentScreen(): MenuScreen
}
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1-2)
- [ ] SessionManager class with session lifecycle
- [ ] Page Visibility API integration
- [ ] Auto-save on pause/tab-switch
- [ ] `resumeSession()` that preserves chunks
- [ ] Fix MENU vs PAUSE state handling

**Success Criteria:** Pause → Resume works instantly without regeneration

### Phase 2: World Management (Day 3-4)
- [ ] World entity and WorldRepository
- [ ] WorldManager CRUD operations
- [ ] Per-world save slots
- [ ] ThumbnailCapture service
- [ ] Migration: existing saves → default world

**Success Criteria:** Create/delete worlds, multiple independent saves

### Phase 3: UI Component Library (Day 5-7)
- [ ] Design tokens CSS
- [ ] Panel component
- [ ] Button component (primary/secondary)
- [ ] RibbonTitle component
- [ ] WorldCard component
- [ ] SaveSlotCard component
- [ ] Modal component
- [ ] ProgressBar component
- [ ] Input component
- [ ] ToggleGroup component

**Success Criteria:** Visual components match reference design

### Phase 4: Screen Implementation (Day 8-11)
- [ ] ScreenManager with navigation
- [ ] SplashScreen
- [ ] MainMenuScreen
- [ ] WorldSelectScreen
- [ ] WorldDetailScreen
- [ ] CreateWorldScreen
- [ ] SettingsScreen (migrate existing)
- [ ] PauseScreen
- [ ] LoadingScreen (upgrade existing)

**Success Criteria:** Full flow from splash → create → play → pause → exit

### Phase 5: Polish & Edge Cases (Day 12-14)
- [ ] Screen transition animations
- [ ] Sound effects (button hover/click)
- [ ] Keyboard navigation
- [ ] Confirmation dialogs
- [ ] Error handling
- [ ] "Unsaved changes" warning
- [ ] Tab-switch overlay
- [ ] Session recovery on reload
- [ ] Remove old menu code

**Success Criteria:** Production-ready, all edge cases handled

---

## Migration Strategy

### Existing Data
- Current saves in IndexedDB will be migrated to a "Default World"
- Modifications will be preserved
- Player position from last save becomes the world's last position

### Backwards Compatibility
- Old save format detected → automatic migration
- One-time migration on first load after update

---

## Testing Checklist

### Core Flows
- [ ] New user: Splash → Menu → Create World → Play
- [ ] Return user: Splash → Menu → Continue (loads autosave)
- [ ] World selection: Menu → Worlds → Select → Play
- [ ] Manual save: Pause → Save → Pick slot → Confirm
- [ ] Load specific save: World Detail → Save slot → Play
- [ ] Delete world: World Detail → Delete → Confirm
- [ ] Tab switch: Playing → Switch tab → Return → Click to resume
- [ ] Browser close: Playing → Close tab → Reopen → Recovery prompt

### Edge Cases
- [ ] Create world with duplicate name
- [ ] Delete world with unsaved changes
- [ ] Save when IndexedDB is full
- [ ] Load corrupted save
- [ ] Very long world names
- [ ] Special characters in world name
- [ ] Rapid pause/resume
- [ ] Double-click on buttons

---

## Open Questions

1. **Cloud sync?** - Future feature, not in scope
2. **World export/import?** - Nice to have, Phase 5 if time
3. **World settings per-world?** - Yes, stored in World entity
4. **Survival mode mechanics?** - Not in scope, just the mode flag for now

---

## References

- [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Game UI Database](https://gameuidatabase.com/)
- [Minecraft Menu Wiki](https://minecraft.wiki/w/Menu_screen)
- [MDN Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
