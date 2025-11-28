# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kingdom Builder is a 3D building game where players construct structures to impress King Reginald. It's built with React, Three.js for 3D rendering, and uses Claude AI (via Anthropic API) to power two AI characters: King Reginald (who judges builds) and Master Aldric (who provides building advice).

## Development Commands

### Essential Commands
- `npm run dev` - Start the Vite development server (typically runs on http://localhost:5173)
- `npm run build` - Build for production (compiles TypeScript first, then bundles with Vite)
- `npm run preview` - Preview the production build locally

### Environment Setup
The app requires an Anthropic API key to enable AI features:
1. Copy `.env.example` to `.env`
2. Set `ANTHROPIC_API_KEY=sk-ant-xxx...` with a valid key

Note: The Vite config (`vite.config.ts`) exposes environment variables with `ANTHROPIC_` prefix to the client via `envPrefix: ['VITE_', 'ANTHROPIC_']`.

## Architecture Overview

### Single-Component Architecture
The entire game logic lives in `src/KingdomBuilder.tsx` (~1500 lines). This is an intentional design choice for a small, self-contained game. The main component handles:
- Three.js scene initialization and rendering
- Game state management (blocks, materials, tools, score, gold)
- User input (keyboard, mouse for 3D interaction)
- AI character interactions via Anthropic API
- Sound effects via Tone.js
- Tutorial system and achievements

### Supporting Files
- `src/components/TutorialOverlay.tsx` - Tutorial UI overlay for new players
- `src/components/AchievementPopup.tsx` - Achievement notification popups
- `src/components/SaveLoadModal.tsx` - Save/load game functionality UI
- `src/utils/achievements.ts` - Achievement system logic and definitions
- `src/utils/storage.ts` - LocalStorage-based save/load utilities
- `src/main.tsx` - React entry point
- `src/index.css` - Global styles and Tailwind imports

### Key Technical Patterns

#### Three.js Integration
- Scene, camera, and renderer are managed via refs (`sceneRef`, `cameraRef`, `rendererRef`)
- All blocks are stored in `blocksRef.current` as an array of Three.js meshes
- Each block mesh has `userData.mi` (material index) and `userData.ti` (type index)
- Raycaster is used for mouse picking to determine where to place/remove blocks
- Glowing blocks are tracked separately in `glowsRef` for lighting effects

#### State Management
Uses React `useState` and `useRef` exclusively - no external state management:
- `useState` for UI-reactive state (gold, score, materials, tools)
- `useRef` for Three.js objects and arrays that shouldn't trigger re-renders
- `useCallback` for expensive operations (stats calculation, AI calls)

#### AI Integration Pattern
Both AI characters (King Reginald and Master Aldric) use direct API calls to Anthropic's Messages API:
- Model: `claude-sonnet-4-20250514`
- API endpoint: `https://api.anthropic.com/v1/messages`
- API key comes from `import.meta.env.ANTHROPIC_API_KEY`
- System prompts are defined as constants: `KING_PROMPT` and `MENTOR_PROMPT`
- King Reginald scores builds by parsing "Architecture: X" and "Creativity: Y" from responses
- See `callKing()` around line 400 and `askMentor()` around line 443 for implementation details

#### Browser Audio
Tone.js is initialized on first user interaction (click "Start Building!"):
- `Sounds` class wraps Tone.js synthesizers
- Sounds must be initialized via `await Tone.start()` before playing
- Sound effects: place, destroy, fanfare, achieve

#### LocalStorage Usage
- Tutorial completion: `kb_tutorialComplete`
- Achievements: `kb_achievements` (array of achievement IDs)
- Total gold earned: `kb_totalGoldEarned`
- Save slots: `kb_save_slot_1`, `kb_save_slot_2`, `kb_save_slot_3`

## Data Structures

### Materials Array
`MATERIALS` array defines all block materials with properties:
- `name`, `color`, `icon`, `tier` (1-4 for unlock system)
- Optional: `opacity` (for transparent blocks), `glow` (for light emission), `metalness`

### Block Types Array
`BLOCK_TYPES` defines shape variations (cube, slab, pillar, wide, beam, arch, stairs, fence)

### Tools Array
`TOOLS` defines player actions: place, destroy, bomb, paint, copy

### Challenges Array
`CHALLENGES` defines in-game quests with check functions that evaluate game stats

## Security Considerations

**WARNING**: The current implementation exposes the Anthropic API key in the browser (client-side). This is acceptable for demos but NOT for production. For production use:
- Implement a backend proxy server
- Move API calls to the backend
- Never expose API keys in client code

## Adding New Features

### Adding a New Block Type
1. Add to `BLOCK_TYPES` array with shape properties
2. Geometry creation logic is in the `createBlock()` function (handles different shapes)

### Adding a New Material
1. Add to `MATERIALS` array with color, tier, and optional properties
2. Material properties automatically apply to block meshes

### Adding a New Challenge
1. Add to `CHALLENGES` array with a check function
2. Check function receives stats object with: `blocks`, `height`, `matCount`, `glows`, `mats`

### Adding a New Achievement
1. Add to `ACHIEVEMENTS` array in `src/utils/achievements.ts`
2. Define check function that evaluates `GameStats`
3. Achievement system automatically handles display and persistence

## TypeScript Configuration

- Strict mode enabled
- Target: ES2020
- Module resolution: bundler mode (Vite)
- React JSX transform
- Unused locals/parameters checks enabled
