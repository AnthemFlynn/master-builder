# Master Builder - Project State Documentation

**Last Updated**: 2025-11-28
**Status**: In Active Development
**Dev Server**: http://localhost:3000

---

## Current Working State

### ✅ WORKING
- Splash screen displays (gradient fallback)
- Menu system with state transitions
- Game controls (WASD, mouse look, number keys)
- Terrain generation with Perlin noise
- Block placement and destruction
- Inventory system (9 slots)
- FPS counter
- Save/load functionality (localStorage)
- Pointer lock camera controls
- Settings (render distance, FOV, music)

### ⚠️ NEEDS ATTENTION
- Splash screen image missing: `/src/static/master-builder-splash.png`
- Need to verify all game states work correctly
- Performance optimization not yet done
- Mobile controls untested

### 🔧 RECENT FIXES
1. Fixed camera mouse look controls (added custom mouseMoveHandler)
2. Updated three.js: 0.137.0 → 0.181.0
3. Updated Vite: 2.9.18 → 6.4.1
4. Updated TypeScript: 4.5.5 → 5.7.0
5. Removed GitHub ribbon and copyright footer
6. Fixed UI state management (splash → menu → play → pause)
7. Fixed Bag class event listeners (only active during gameplay)

---

## Architecture Overview

### Entry Point
```
index.html → src/main.ts
```

### Initialization Order
```typescript
1. Core (Three.js renderer, camera, scene)
2. Player (mode, speed, body dimensions)
3. Audio (music and sound effects)
4. Terrain (procedural generation)
5. Control (input handling, physics)
6. UI (state management, HUD)
7. Animation loop starts
```

### Game States

```
SPLASH → (any key/click) → MENU → (Play button) → PLAYING
  ↑                           ↑                       ↓
  |                           └──────(Resume)─────────┘
  |                           ↑                       ↓
  └────(Exit button)──────────┴──────(E key)─────────┘
```

**State Details:**
- **SPLASH**: Only splash screen visible, no controls active
- **MENU**: Menu overlay visible, no game controls active
- **PLAYING**: Pointer locked, all controls active, HUD visible
- **PAUSE**: Menu overlay, HUD hidden, controls inactive

### Key Systems

**Control System** (`src/control/index.ts`)
- Manages keyboard/mouse input
- Handles collision detection (6-direction raycasters)
- Physics updates (gravity, velocity, jumping)
- Block building/destruction

**Terrain System** (`src/terrain/index.ts`)
- Procedural generation using Perlin noise
- Chunk-based rendering
- InstancedMesh for performance (10k+ blocks)
- Web worker for generation

**UI System** (`src/ui/index.ts`)
- State machine for game modes
- FPS counter (`src/ui/fps/index.ts`)
- Inventory bag (`src/ui/bag/index.ts`)
- Mobile joystick (`src/ui/joystick/index.ts`)

---

## Critical Files

### HTML/CSS
- `/index.html` - DOM structure
- `/src/style.css` - All styling (292 lines)

### TypeScript Core
- `/src/main.ts` - Entry point (35 lines)
- `/src/core/index.ts` - Three.js setup
- `/src/player/index.ts` - Player state
- `/src/control/index.ts` - Input & physics (1178 lines)
- `/src/terrain/index.ts` - World generation
- `/src/ui/index.ts` - UI state machine (323 lines)

### Assets
- `/src/static/mc-font.otf` - Minecraft font
- `/src/static/block-icon/*.png` - Inventory icons
- `/src/static/textures/*.png` - Block textures
- `/src/static/master-builder-splash.png` - **MISSING - User needs to provide**

---

## Dependencies

### Production
```json
{
  "three": "^0.181.0"
}
```

### Development
```json
{
  "@types/three": "^0.181.0",
  "typescript": "^5.7.0",
  "vite": "^6.4.1"
}
```

---

## Event Listeners

### Global (Always Active)
- `pointerlockchange` → triggers state transitions
- `keydown` (F key) → fullscreen toggle
- `keydown` (E key, when locked) → menu toggle
- `contextmenu` → prevented

### During Pointer Lock (Playing State)
- `keydown` → movement (WASD, Space, Shift, Q)
- `keyup` → stop movement
- `keydown` (number keys) → select block type
- `mousedown` → build/destroy blocks
- `mouseup` → stop building/destroying
- `mousemove` → camera rotation
- `wheel` → cycle blocks (disabled, use numbers instead)

### Bag Controls (Only When Enabled)
- `keydown` (1-9) → select inventory slot
- `wheel` → cycle inventory (optional)

---

## Known Issues & TODOs

### Immediate
- [ ] User needs to save splash screen image to `/src/static/master-builder-splash.png`
- [ ] Verify all state transitions work correctly
- [ ] Test save/load functionality

### Performance Optimization Needed
- [ ] Profile render performance
- [ ] Check if InstancedMesh is optimal
- [ ] Review terrain generation bottlenecks
- [ ] Test with high render distance (8 chunks)
- [ ] Consider LOD system for distant terrain

### Code Quality
- [ ] Remove unused legacy code (React components in `/src/components/`)
- [ ] Clean up educational system files (not used)
- [ ] Add TypeScript strict mode
- [ ] Add ESLint configuration
- [ ] Consider adding unit tests

### Features to Consider
- [ ] Better mobile controls
- [ ] Multiplayer support
- [ ] More block types
- [ ] Biome system
- [ ] Day/night cycle
- [ ] Inventory persistence across sessions

---

## Development Workflow

### Starting Development
```bash
npm install
npm run dev
```
Server starts at http://localhost:3000

### Building for Production
```bash
npm run build
npm run preview
```

### Type Checking
```bash
npm run lint
```

---

## Debugging Guide

### Issue: Controls Not Working
1. Check if pointer is locked (look for cursor)
2. Check browser console for errors
3. Verify `pointerlockchange` event is firing
4. Check `this.bag.enable()` is called in `onPlay()`

### Issue: Terrain Not Loading
1. Check web worker in browser dev tools
2. Look for console errors about noise generation
3. Verify Three.js scene has mesh objects
4. Check render distance setting

### Issue: UI Not Showing/Hiding Correctly
1. Inspect elements in browser dev tools
2. Check for `.hidden` class application
3. Verify z-index layering
4. Check state transition functions (`onPlay`, `onPause`, `onExit`)

### Issue: Poor Performance
1. Check FPS counter
2. Open browser performance profiler
3. Reduce render distance in settings
4. Check if too many chunks are loaded
5. Profile InstancedMesh draw calls

---

## Browser Compatibility

### Tested
- Chrome/Brave (latest) ✅
- Safari (latest) ✅

### Requirements
- WebGL 2.0 support
- Pointer Lock API
- Web Workers
- ES2020+ JavaScript

### Not Supported
- IE11 (too old)
- Very old browsers without WebGL

---

## File Structure
```
kingdom-builder/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── PROJECT_STATE.md (this file)
├── src/
│   ├── main.ts
│   ├── style.css
│   ├── core/
│   ├── player/
│   ├── terrain/
│   ├── control/
│   ├── ui/
│   ├── audio/
│   ├── utils/
│   └── static/
│       ├── mc-font.otf
│       ├── block-icon/
│       ├── textures/
│       └── master-builder-splash.png (MISSING)
└── docs/
```

---

## Lessons Learned

### What Went Wrong Previously
1. Made changes without full codebase understanding
2. Lost image asset during context truncation
3. Fixed symptoms instead of root causes
4. No verification after each change

### Better Approach
1. **ALWAYS** explore codebase thoroughly first
2. **VERIFY** every change with user
3. **PERSIST** critical assets immediately
4. **DOCUMENT** changes in this file
5. **TEST** each state transition manually

---

## Next Steps

1. User provides splash screen image
2. Full manual test of all game states
3. Performance profiling and optimization
4. Code cleanup (remove unused files)
5. Consider adding automated tests
