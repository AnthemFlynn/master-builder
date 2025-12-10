# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Project**: Kingdom Builder (Minecraft-inspired voxel game)
**Tech Stack**: TypeScript, Three.js 0.181, Bun (build/serve)
**Architecture**: Hexagonal (10 modules + infrastructure)
**Dev Server**: http://localhost:3000

---

## Development Commands

```bash
# Development
bun dev          # Build + start dev server
bun serve        # Start dev server only
bun build        # Build project

# Type checking
bun lint         # TypeScript type check (no emit)
```

**Note**: This project uses **Bun** (not npm/node). All scripts run via `bun`.

---

## Architecture Overview

### Hexagonal Architecture (Ports & Adapters)

The codebase follows a strict hexagonal architecture with 10 independent modules:

```
src/modules/
├── game/           Infrastructure (CommandBus, EventBus, GameOrchestrator)
├── world/          Voxel data storage (chunks, blocks)
├── rendering/      Mesh generation (greedy meshing, vertex colors)
├── environment/    Lighting system (sunlight, block lights, AO)
├── physics/        Movement + collision (Web Worker)
├── player/         Player state (position, mode, velocity)
├── input/          Input system (keyboard, mouse, gamepad-ready)
├── interaction/    Block placement/removal, raycasting
├── ui/             Game states, HUD, menus
├── audio/          Sound effects
└── blocks/         Block registry and definitions
```

### Key Architectural Principles

1. **Ports Pattern**: Modules expose interfaces (ports) in `src/modules/*/ports/`
   - `IVoxelQuery` - Read voxel data
   - `IVoxelStorage` - Write voxel data
   - `ILightingQuery` - Read lighting data
   - `IPlayerQuery` - Read player state

2. **Web Workers**: Heavy computation offloaded to workers
   - `PhysicsWorker.ts` - Movement, collision detection
   - `ChunkWorker.ts` - Terrain generation (simplex noise)
   - `MeshingWorker.ts` - Greedy meshing algorithm
   - `LightingWorker.ts` - Light propagation

3. **Infrastructure Buses**:
   - `CommandBus` - Command pattern (GenerateChunk, PlaceBlock, RemoveBlock)
   - `EventBus` - Domain events (9 categories: world, lighting, meshing, rendering, time, player, input, ui, interaction)

### Initialization Flow (main.ts → GameOrchestrator)

```
1. initializeBlockRegistry()       # Block definitions loaded
2. Core (Three.js setup)            # Renderer, camera, scene
3. GameOrchestrator created:
   a. Infrastructure (CommandBus, EventBus)
   b. Services (10 modules in dependency order)
   c. Register command handlers
   d. Register input actions
   e. Setup event listeners
   f. Generate initial chunks
4. Animation loop starts            # 60fps game loop
```

### Game State Machine

```
SPLASH (initial)
  ↓ (any key/click)
MENU (5 buttons)
  ↓ (Play button)
PLAYING (pointer locked, HUD visible)
  ↓ (Escape or pointer unlock)
PAUSE (menu overlay)
  ↓ (Resume)
PLAYING
  ↓ (Exit button)
SPLASH
```

**Critical**: Event listeners are state-aware. Input only processes during PLAYING state.

---

## Rendering System (Vertex Color Lighting)

### Architecture

The rendering system uses **BufferGeometry** with **vertex colors** (not shader-based lighting):

```
Block Change → Chunk.dirty = true
              ↓
ChunkMeshManager.markDirty(reason: block/light/global)
              ↓
ChunkMeshManager.update() (3ms budget per frame)
              ↓
GreedyMesher.buildMesh() → FaceBuilder.addQuad()
              ↓
BufferGeometry (positions, colors, uvs, indices)
              ↓
THREE.Mesh → Scene
```

### Key Classes

- **GreedyMesher** (`src/modules/rendering/meshing-application/GreedyMesher.ts`)
  - Greedy meshing algorithm: merges adjacent faces with matching block type + lighting
  - 90%+ polygon reduction (from 300k to 30k)
  - Processes each axis (X, Y, Z) and direction (+/-)

- **FaceBuilder** (`src/modules/rendering/meshing-application/FaceBuilder.ts`)
  - Generates quad vertices with smooth lighting and ambient occlusion
  - Lighting: Averages 3x3x3 cube of neighbor light values
  - AO: 0fps.net algorithm (corner vertex darkening)

- **ChunkMeshManager** (`src/modules/rendering/application/ChunkRenderer.ts`)
  - Dirty tracking with priority (block > light > global)
  - 3ms rebuild budget per frame (prevents stuttering)
  - Staggered updates for smooth performance

### Performance Targets

- Single chunk rebuild: <2ms
- FPS: 60 stable at render distance 3
- Memory: ~12MB geometry per visible chunk

---

## World Generation & Chunks

### Chunk System

- **Chunk size**: 24×48×24 blocks (X×Y×Z)
- **Coordinate system**: `ChunkCoordinate(x, z)` - no Y coordinate (chunks are vertical columns)
- **Storage**: `Uint8Array` (1 byte per block = block type ID)
- **Generation**: Simplex noise in `ChunkWorker.ts`

### World Presets

Located in `src/modules/world/domain/WorldPreset.ts`:
- **DEFAULT**: Rolling hills, trees, water
- **FLAT**: Flat terrain for testing
- **MOUNTAINS**: High peaks
- **ISLANDS**: Floating islands

Change preset via `DEFAULT_WORLD_PRESET_ID` in `WorldConfig.ts`.

---

## Input System

### Action-Based Input

The input system is **action-based** (not key-based):

```typescript
// Register action
inputService.registerAction({
  id: 'move_forward',
  category: 'movement',
  description: 'Move forward',
  defaultKey: 'KeyW'
})

// Add alternate binding
inputService.addBinding('move_forward', {
  key: 'ArrowUp',
  ctrl: false,
  shift: false,
  alt: false
})

// Query state
if (inputService.isActionPressed('move_forward')) {
  // Move forward
}
```

### Default Controls

**Movement**:
- W/S/A/D - Forward/Back/Left/Right
- Space/Q - Jump/Fly Up
- Shift/E - Sneak/Fly Down
- F - Toggle flying mode

**Building**:
- Left Click / N - Remove block
- Right Click / C - Place block
- 1-9 - Select block type

**UI**:
- Escape - Pause menu

---

## Physics System (Web Worker)

### Architecture

Physics runs entirely in a **Web Worker** to avoid blocking the main thread:

```
GameOrchestrator.update()
  ↓
PhysicsService.update(movementVector, camera, deltaTime)
  ↓
PostMessage → PhysicsWorker
              ↓
              MovementController.update()
              CollisionDetector.checkCollisions()
              ↓
PostMessage → Main Thread
  ↓
PlayerService.updatePosition/setVelocity()
  ↓
Camera syncs to player position
```

### Worker Communication

**Main → Worker** (`WorkerMessage`):
```typescript
{
  type: 'UPDATE_PHYSICS',
  playerState: { position, velocity, mode, speed, falling, jumpVelocity, cameraQuaternion },
  movementVector: { forward, strafe, vertical, jump, sneak },
  deltaTime: number,
  worldVoxels: Record<string, ArrayBuffer> // Nearby chunks for collision
}
```

**Worker → Main** (`MainMessage`):
```typescript
{
  type: 'PHYSICS_UPDATED',
  playerState: { position, velocity, mode, falling, jumpVelocity }
}
```

### Player Modes

- **Walking**: Gravity, collision detection, jumping
- **Flying**: No gravity, vertical movement with Q/E

---

## Event System

The `EventBus` has 9 event categories:

```typescript
type EventCategory =
  | 'world'       // ChunkGenerated, BlockPlaced, BlockRemoved
  | 'lighting'    // LightUpdated, LightPropagated
  | 'meshing'     // MeshBuilt, MeshDisposed
  | 'rendering'   // RenderStateChanged
  | 'time'        // HourChanged, DayNightCycle
  | 'player'      // PlayerMoved, ModeChanged
  | 'input'       // InputActionEvent (pressed/released/held)
  | 'ui'          // UIStateChangedEvent (SPLASH/MENU/PLAYING/PAUSE)
  | 'interaction' // BlockHighlighted, BlockSelected
```

### Usage

```typescript
// Emit event
eventBus.emit('world', new BlockPlacedEvent(position, blockId))

// Listen for event
eventBus.on('world', 'BlockPlacedEvent', (event) => {
  console.log('Block placed at', event.position)
})

// Debug: Enable tracing
eventBus.enableTracing() // Logs all events to console
```

---

## Command System

Commands are the **only way** to mutate world state:

```typescript
// Define command
class PlaceBlockCommand implements Command {
  type = 'PlaceBlockCommand'
  constructor(
    public position: Vector3,
    public blockId: number
  ) {}
}

// Register handler
commandBus.register('PlaceBlockCommand', new PlaceBlockHandler(worldService, eventBus))

// Execute command
commandBus.send(new PlaceBlockCommand(position, blockId))
```

**Built-in commands**:
- `GenerateChunkCommand` - Generate terrain for chunk
- `PlaceBlockCommand` - Place block at position
- `RemoveBlockCommand` - Remove block at position

**Command Replay**: All commands are logged. Use `commandBus.replay(fromIndex)` for debugging.

---

## Block System

### BlockRegistry

All block types are registered in `src/modules/blocks/application/BlockRegistry.ts`:

```typescript
// Block definition
interface BlockDefinition {
  id: number              // Unique ID (0-255)
  name: string            // "grass_block"
  category: string        // "ground", "stone", "wood", etc.
  transparent: boolean    // Is it transparent?
  lightEmission: number   // 0-15 (0 = no light, 15 = max)
  textureTop?: string     // Texture for +Y face
  textureSide?: string    // Texture for ±X/±Z faces
  textureBottom?: string  // Texture for -Y face
}

// Access registry
const grass = BlockRegistry.getBlock(2)
const glowstone = BlockRegistry.getBlockByName('glowstone')
```

### Block Categories

Defined in `src/modules/blocks/definitions/*.ts`:
- `ground.ts` - Grass, dirt, sand, gravel
- `stone.ts` - Stone, cobblestone, ores
- `wood.ts` - Oak, birch, spruce planks/logs
- `illumination.ts` - Glowstone, redstone lamp
- `metals.ts` - Iron, gold, diamond blocks
- `transparent.ts` - Glass, ice, water

---

## Debugging Tools

Exposed on `window.debug`:

```typescript
// Enable event tracing
window.debug.enableTracing()

// Replay commands
window.debug.replayCommands(0) // Replay all commands

// Get command log
window.debug.getCommandLog()

// Player state
window.debug.getPlayerMode()     // "Walking" | "Flying"
window.debug.setPlayerMode('Flying')
window.debug.getPlayerPosition() // Vector3

// Time control
window.debug.setHour(12)         // Solar noon (default)
window.debug.setHour(0)          // Midnight
window.debug.setHour(18)         // Sunset

// World preset
window.debug.getWorldPreset()
```

---

## Testing & Verification

### Manual State Test

1. Load → Splash screen visible
2. Any key → Menu with 5 buttons
3. Play → Pointer locks, HUD appears
4. Mouse → Camera rotates
5. WASD → Movement
6. 1-9 → Block selection
7. Clicks → Build/destroy blocks
8. Escape → Pause menu overlay
9. Resume → Back to game
10. Exit → Back to splash

### Performance Checks

- `window.debug.getPlayerPosition()` - Verify player position
- Console logs - Check for chunk generation/rebuild messages
- FPS counter (top-left) - Should be 60fps at render distance 3

### Common Issues

**Black screen**: Check console for WebGL errors. Ensure graphics drivers are updated.

**Controls not working**: Check game state. Input only active during PLAYING state.

**Low FPS**: Reduce render distance (modify `renderDistance` in `GameOrchestrator.ts`).

**Blocks not placing**: Check console for command errors. Ensure pointer is locked.

---

## Critical Implementation Notes

### Event Listener Lifecycle

**Problem**: Event listeners active during splash/menu caused unintended behavior.

**Solution**: Services now have `enable()`/`disable()` methods:
- Called by `UIService` during state transitions
- Only input listeners for current state are active

### Pointer Lock Management

Pointer lock is **required** for PLAYING state:
- Lock: `cameraControls.lock()` (via UI "Play" button)
- Unlock: `cameraControls.unlock()` (via Escape key or browser action)
- Listeners: `lock` event → `UIService.onPlay()`, `unlock` event → `UIService.onPause()`

### Chunk Loading Strategy

- **Radial loading**: Chunks sorted by distance from player (closest first)
- **Render distance**: Default 3 (7×7 grid = 49 chunks)
- **Unloading**: Not implemented (chunks persist until page reload)

### Worker Data Transfer

Workers receive **cloned data** (structured clone algorithm):
- `worldVoxels`: `Record<string, ArrayBuffer>` (transferable)
- Chunks are serialized as raw `ArrayBuffer` for performance

---

## File Naming Conventions

- **Application layer**: `*Service.ts` - Business logic
- **Domain layer**: `*.ts` (value objects, entities)
- **Infrastructure**: `*Bus.ts`, `*Manager.ts`
- **Workers**: `*Worker.ts`
- **Ports**: `I*.ts` (interfaces)

### Module Structure

```
src/modules/<module>/
├── application/      # Services (business logic)
├── domain/           # Entities, value objects, commands, events
├── ports/            # Interfaces (dependency inversion)
├── workers/          # Web Workers (if applicable)
└── infrastructure/   # EventBus, CommandBus (only in game/)
```

---

## Current Development State

**Last Updated**: 2025-12-09

**Working**:
- ✅ Hexagonal architecture (10 modules)
- ✅ Physics in Web Worker
- ✅ Vertex color lighting system
- ✅ Greedy meshing (90%+ polygon reduction)
- ✅ Game state machine (SPLASH/MENU/PLAYING/PAUSE)
- ✅ Input system (action-based, rebindable)

**Known Issues**:
- Performance optimization needed for render distance >3
- Chunk unloading not implemented (memory grows over time)

**Next Steps**:
- Implement chunk unloading for distant chunks
- Add texture atlas support
- Optimize lighting propagation for sunrise/sunset
- Add gamepad support to input system

---

## Important Reminders for AI Agents

1. **ALWAYS use Explore agent first** - Never make changes without understanding the full system
2. **NEVER assume something works** - Always verify in browser
3. **Use TodoWrite** - Track all multi-step tasks
4. **Read related modules** - Hexagonal architecture means changes often affect multiple modules
5. **Check worker communication** - If physics/meshing/lighting bugs occur, check worker message types
6. **Test all game states** - SPLASH → MENU → PLAYING → PAUSE → SPLASH
7. **Respect the 3ms budget** - ChunkMeshManager rebuilds must stay under 3ms/frame
