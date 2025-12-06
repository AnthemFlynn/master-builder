# Complete Hexagonal Architecture - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the hexagonal refactor by consolidating existing modules and refactoring remaining systems (Control, UI, Input, Audio, Player, Core) into clean hexagonal modules. Restore all original game features with working realistic lighting.

**Architecture:** 8 hexagonal modules total - consolidate existing 5 terrain modules into 3, create 5 new modules for remaining systems, wire via GameOrchestrator with CQRS-lite event coordination.

**Tech Stack:** TypeScript 5.7, Three.js 0.181, Hexagonal Architecture, CQRS-lite, Event-Driven Design

---

## Phase 1: Consolidate Existing Modules (Reduce 5 → 3)

### Task 1: Merge Lighting into World Module

**Goal:** Consolidate world + lighting into single bounded context.

**Rationale:** Voxel data and lighting data are tightly coupled - same chunk lifecycle, both needed for world queries. Separating them creates artificial boundaries.

**Files:**
- Move: `src/modules/lighting/*` → `src/modules/world/lighting/`
- Update: `src/modules/world/index.ts` to export lighting
- Delete: `src/modules/lighting/index.ts`

**Step 1: Move lighting subdirectory**

```bash
mv src/modules/lighting/domain src/modules/world/lighting-domain
mv src/modules/lighting/application src/modules/world/lighting-application
mv src/modules/lighting/ports src/modules/world/lighting-ports
```

**Step 2: Update world module exports**

```typescript
// src/modules/world/index.ts
export { ChunkCoordinate } from './domain/ChunkCoordinate'
export { VoxelChunk } from './domain/VoxelChunk'
export { IVoxelQuery } from './ports/IVoxelQuery'
export { WorldService } from './application/WorldService'

// Lighting exports (now part of world)
export { LightValue, RGB } from './lighting-domain/LightValue'
export { LightData } from './lighting-domain/LightData'
export { ILightingQuery } from './lighting-ports/ILightingQuery'
export { LightingService } from './lighting-application/LightingService'
export { LightingPipeline } from './lighting-application/LightingPipeline'
```

**Step 3: Update imports across codebase**

```bash
# Find all imports from old lighting module
grep -r "from '../../lighting" src/modules --include="*.ts"

# Replace with new path
# Example: from '../../lighting/domain/LightValue' 
#       → from '../../world/lighting-domain/LightValue'
```

**Step 4: Delete old lighting module**

```bash
rm -rf src/modules/lighting
```

**Step 5: Test compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: merge lighting into world module (single bounded context)"
```

---

### Task 2: Merge Meshing into Rendering Module

**Goal:** Consolidate meshing + rendering into single visual pipeline.

**Rationale:** Meshing generates geometry, rendering displays it. Same visual concern, sequential pipeline, no reason to separate.

**Files:**
- Move: `src/modules/meshing/*` → `src/modules/rendering/meshing/`
- Update: `src/modules/rendering/index.ts`
- Delete: `src/modules/meshing/index.ts`

**Step 1: Move meshing subdirectory**

```bash
mv src/modules/meshing/application src/modules/rendering/meshing-application
```

**Step 2: Update rendering module exports**

```typescript
// src/modules/rendering/index.ts
export { RenderingService } from './application/RenderingService'
export { MeshingService } from './meshing-application/MeshingService'

// Internal (not exported):
// - ChunkRenderer, MaterialSystem
// - VertexBuilder, GreedyMesher
```

**Step 3: Update imports**

Replace `from '../../meshing/` with `from '../../rendering/meshing-`

**Step 4: Delete old meshing module**

```bash
rm -rf src/modules/meshing
```

**Step 5: Test compilation**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: merge meshing into rendering module (single visual pipeline)"
```

---

### Task 3: Create Game Module (Move CQRS Infrastructure)

**Goal:** Central orchestration module with EventBus, CommandBus, GameOrchestrator.

**Files:**
- Move: `src/modules/terrain/application/EventBus.ts` → `src/modules/game/infrastructure/EventBus.ts`
- Move: `src/modules/terrain/application/CommandBus.ts` → `src/modules/game/infrastructure/CommandBus.ts`
- Create: `src/modules/game/application/GameOrchestrator.ts`
- Delete: `src/modules/terrain/` (replaced by game)

**Step 1: Create game module structure**

```bash
mkdir -p src/modules/game/infrastructure
mkdir -p src/modules/game/application
mkdir -p src/modules/game/domain/events
mkdir -p src/modules/game/domain/commands
```

**Step 2: Move CQRS infrastructure**

```bash
mv src/modules/terrain/application/EventBus.ts src/modules/game/infrastructure/
mv src/modules/terrain/application/CommandBus.ts src/modules/game/infrastructure/
mv src/modules/terrain/domain/events/DomainEvent.ts src/modules/game/domain/events/
mv src/modules/terrain/domain/commands/Command.ts src/modules/game/domain/commands/
```

**Step 3: Move all events to game module**

```bash
mv src/modules/terrain/domain/events/*.ts src/modules/game/domain/events/
```

**Step 4: Move all commands to game module**

```bash
mv src/modules/terrain/domain/commands/*.ts src/modules/game/domain/commands/
mv src/modules/terrain/application/handlers src/modules/game/application/
```

**Step 5: Create GameOrchestrator (replaces TerrainOrchestrator)**

```typescript
// src/modules/game/application/GameOrchestrator.ts
import * as THREE from 'three'
import { WorldService } from '../../world/application/WorldService'
import { LightingService } from '../../world/lighting-application/LightingService'
import { MeshingService } from '../../rendering/meshing-application/MeshingService'
import { RenderingService } from '../../rendering/application/RenderingService'
import { CommandBus } from '../infrastructure/CommandBus'
import { EventBus } from '../infrastructure/EventBus'
import { GenerateChunkHandler } from './handlers/GenerateChunkHandler'
import { PlaceBlockHandler } from './handlers/PlaceBlockHandler'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'
import { PlaceBlockCommand } from '../domain/commands/PlaceBlockCommand'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { NoiseGenerator } from '../../world/adapters/NoiseGenerator'

export class GameOrchestrator {
  private worldService: WorldService
  private lightingService: LightingService
  private meshingService: MeshingService
  private renderingService: RenderingService
  public commandBus: CommandBus
  public eventBus: EventBus

  private currentChunk = new ChunkCoordinate(0, 0)
  private previousChunk = new ChunkCoordinate(0, 0)
  private renderDistance = 3

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    // Create infrastructure
    this.commandBus = new CommandBus()
    this.eventBus = new EventBus()

    // Create services
    this.worldService = new WorldService()
    this.lightingService = new LightingService(this.worldService, this.eventBus)
    this.meshingService = new MeshingService(this.worldService, this.lightingService, this.eventBus)
    this.renderingService = new RenderingService(scene, this.eventBus)

    // Register command handlers
    const terrainGenerator = new NoiseGenerator()
    this.commandBus.register(
      'GenerateChunkCommand',
      new GenerateChunkHandler(this.worldService, this.eventBus, terrainGenerator)
    )
    this.commandBus.register(
      'PlaceBlockCommand',
      new PlaceBlockHandler(this.worldService, this.eventBus)
    )

    console.log('✅ GameOrchestrator initialized')

    // Generate initial chunks
    const initialChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )
    this.generateChunksInRenderDistance(initialChunk)
    this.previousChunk = initialChunk
  }

  update(): void {
    const newChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )

    if (!newChunk.equals(this.previousChunk)) {
      this.generateChunksInRenderDistance(newChunk)
      this.previousChunk = newChunk
    }

    this.meshingService.processDirtyQueue()
  }

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const distance = this.renderDistance

    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const coord = new ChunkCoordinate(
          centerChunk.x + x,
          centerChunk.z + z
        )

        this.commandBus.send(
          new GenerateChunkCommand(coord, this.renderDistance)
        )
      }
    }
  }

  enableEventTracing(): void {
    this.eventBus.enableTracing()
  }

  replayCommands(fromIndex: number): void {
    this.commandBus.replay(fromIndex)
  }

  getCommandLog(): readonly any[] {
    return this.commandBus.getLog()
  }

  // Expose services for other modules via ports
  getWorldService(): WorldService {
    return this.worldService
  }
}
```

**Step 6: Delete terrain module**

```bash
rm -rf src/modules/terrain
```

**Step 7: Create game module exports**

```typescript
// src/modules/game/index.ts
export { GameOrchestrator } from './application/GameOrchestrator'
export { EventBus } from './infrastructure/EventBus'
export { CommandBus } from './infrastructure/CommandBus'

// Commands (for external use)
export { GenerateChunkCommand } from './domain/commands/GenerateChunkCommand'
export { PlaceBlockCommand } from './domain/commands/PlaceBlockCommand'
```

**Step 8: Update main.ts**

```typescript
// OLD
import { TerrainOrchestrator } from './modules/terrain/application/TerrainOrchestrator'
const terrain = new TerrainOrchestrator(scene, camera)

// NEW
import { GameOrchestrator } from './modules/game'
const game = new GameOrchestrator(scene, camera)
```

**Step 9: Test compilation**

```bash
npx tsc --noEmit
```

**Step 10: Commit**

```bash
git add -A
git commit -m "refactor: consolidate into game module (3 modules: world, rendering, game)"
```

---

## Phase 2: Create Player Module

### Task 4: Create Player Module

**Goal:** Extract Player into hexagonal module with commands for state changes.

**Current:** `src/player/index.ts` (simple state object)

**New Structure:**
```
src/modules/player/
├── domain/
│   ├── PlayerState.ts        # Player entity
│   └── PlayerMode.ts          # Walking/Flying enum
├── application/
│   └── PlayerService.ts       # Manages player state
├── ports/
│   └── IPlayerQuery.ts        # Read player state
└── index.ts
```

**Step 1: Create PlayerMode enum**

```typescript
// src/modules/player/domain/PlayerMode.ts
export enum PlayerMode {
  Walking = 'walking',
  Flying = 'flying',
  Sneaking = 'sneaking'
}
```

**Step 2: Create PlayerState entity**

```typescript
// src/modules/player/domain/PlayerState.ts
import * as THREE from 'three'
import { PlayerMode } from './PlayerMode'

export class PlayerState {
  position: THREE.Vector3
  mode: PlayerMode
  speed: number
  falling: boolean
  jumpVelocity: number

  constructor() {
    this.position = new THREE.Vector3(8, 40, 8)
    this.mode = PlayerMode.Walking
    this.speed = 0.05
    this.falling = false
    this.jumpVelocity = 0
  }

  setMode(mode: PlayerMode): void {
    this.mode = mode
    
    // Adjust speed based on mode
    if (mode === PlayerMode.Flying) {
      this.speed = 0.08
    } else if (mode === PlayerMode.Sneaking) {
      this.speed = 0.025
    } else {
      this.speed = 0.05
    }
  }

  isFlying(): boolean {
    return this.mode === PlayerMode.Flying
  }

  isWalking(): boolean {
    return this.mode === PlayerMode.Walking
  }
}
```

**Step 3: Create IPlayerQuery port**

```typescript
// src/modules/player/ports/IPlayerQuery.ts
import * as THREE from 'three'
import { PlayerMode } from '../domain/PlayerMode'

export interface IPlayerQuery {
  getPosition(): THREE.Vector3
  getMode(): PlayerMode
  getSpeed(): number
  isFlying(): boolean
}
```

**Step 4: Create PlayerService**

```typescript
// src/modules/player/application/PlayerService.ts
import { PlayerState } from '../domain/PlayerState'
import { PlayerMode } from '../domain/PlayerMode'
import { IPlayerQuery } from '../ports/IPlayerQuery'
import { EventBus } from '../../game/infrastructure/EventBus'
import * as THREE from 'three'

export class PlayerService implements IPlayerQuery {
  private state: PlayerState

  constructor(private eventBus: EventBus) {
    this.state = new PlayerState()
  }

  getPosition(): THREE.Vector3 {
    return this.state.position
  }

  getMode(): PlayerMode {
    return this.state.mode
  }

  getSpeed(): number {
    return this.state.speed
  }

  isFlying(): boolean {
    return this.state.isFlying()
  }

  setMode(mode: PlayerMode): void {
    const oldMode = this.state.mode
    this.state.setMode(mode)

    // Emit event
    this.eventBus.emit('player', {
      type: 'PlayerModeChangedEvent',
      timestamp: Date.now(),
      oldMode,
      newMode: mode
    })
  }

  updatePosition(position: THREE.Vector3): void {
    this.state.position.copy(position)
  }

  // Expose full state for physics module (internal use)
  getState(): PlayerState {
    return this.state
  }
}
```

**Step 5: Create module exports**

```typescript
// src/modules/player/index.ts
export { PlayerService } from './application/PlayerService'
export { PlayerMode } from './domain/PlayerMode'
export { IPlayerQuery } from './ports/IPlayerQuery'

// Internal (not exported):
// - PlayerState
```

**Step 6: Commit**

```bash
git add src/modules/player
git commit -m "feat: create player module with hexagonal structure"
```

---

## Phase 3: Create Physics Module

### Task 5: Create Physics Module

**Goal:** Extract collision, gravity, movement from Control into physics module.

**Structure:**
```
src/modules/physics/
├── domain/
│   ├── CollisionResult.ts    # Collision data
│   └── MovementVector.ts      # Movement intent
├── application/
│   ├── PhysicsService.ts      # Main physics engine
│   ├── CollisionDetector.ts   # Raycasting collision
│   └── MovementController.ts  # Apply movement with physics
├── ports/
│   └── ICollisionQuery.ts     # Check collisions
└── index.ts
```

**Step 1: Create CollisionResult**

```typescript
// src/modules/physics/domain/CollisionResult.ts
export interface CollisionResult {
  front: boolean
  back: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}
```

**Step 2: Create MovementVector**

```typescript
// src/modules/physics/domain/MovementVector.ts
export interface MovementVector {
  forward: number   // -1 to 1
  strafe: number    // -1 to 1
  vertical: number  // -1 to 1
  jump: boolean
  sneak: boolean
}
```

**Step 3: Create ICollisionQuery port**

```typescript
// src/modules/physics/ports/ICollisionQuery.ts
import * as THREE from 'three'
import { CollisionResult } from '../domain/CollisionResult'

export interface ICollisionQuery {
  checkCollisions(position: THREE.Vector3, playerBody: THREE.Mesh): CollisionResult
  isGrounded(position: THREE.Vector3): boolean
}
```

**Step 4: Create CollisionDetector** 

Extract raycasting logic from Control class (lines ~750-850):

```typescript
// src/modules/physics/application/CollisionDetector.ts
import * as THREE from 'three'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { CollisionResult } from '../domain/CollisionResult'
import { ICollisionQuery } from '../ports/ICollisionQuery'

export class CollisionDetector implements ICollisionQuery {
  private raycaster = new THREE.Raycaster()
  
  constructor(
    private voxels: IVoxelQuery,
    private scene: THREE.Scene
  ) {
    this.raycaster.far = 1.5  // Collision detection distance
  }

  checkCollisions(position: THREE.Vector3, playerBody: THREE.Mesh): CollisionResult {
    const result: CollisionResult = {
      front: false,
      back: false,
      left: false,
      right: false,
      up: false,
      down: false
    }

    // Check each direction
    result.front = this.checkDirection(position, playerBody, new THREE.Vector3(1, 0, 0))
    result.back = this.checkDirection(position, playerBody, new THREE.Vector3(-1, 0, 0))
    result.left = this.checkDirection(position, playerBody, new THREE.Vector3(0, 0, -1))
    result.right = this.checkDirection(position, playerBody, new THREE.Vector3(0, 0, 1))
    result.up = this.checkDirection(position, playerBody, new THREE.Vector3(0, 1, 0))
    result.down = this.checkDirection(position, playerBody, new THREE.Vector3(0, -1, 0))

    return result
  }

  isGrounded(position: THREE.Vector3): boolean {
    // Check if block below
    const blockBelow = this.voxels.getBlockType(
      Math.floor(position.x),
      Math.floor(position.y - 1.5),
      Math.floor(position.z)
    )
    return blockBelow !== -1
  }

  private checkDirection(
    position: THREE.Vector3,
    playerBody: THREE.Mesh,
    direction: THREE.Vector3
  ): boolean {
    this.raycaster.set(position, direction)
    
    // Create temp mesh with nearby blocks for collision check
    // (Simplified - in real impl, query voxels and build collision mesh)
    const collision = this.raycaster.intersectObject(playerBody, false)
    return collision.length > 0
  }
}
```

**Step 5: Create MovementController**

```typescript
// src/modules/physics/application/MovementController.ts
import * as THREE from 'three'
import { MovementVector } from '../domain/MovementVector'
import { ICollisionQuery } from '../ports/ICollisionQuery'
import { IPlayerQuery } from '../../player/ports/IPlayerQuery'

export class MovementController {
  private velocity = new THREE.Vector3()
  private gravity = 25

  constructor(
    private collision: ICollisionQuery,
    private player: IPlayerQuery
  ) {}

  applyMovement(
    movement: MovementVector,
    camera: THREE.PerspectiveCamera,
    deltaTime: number
  ): THREE.Vector3 {
    const position = this.player.getPosition().clone()
    
    if (this.player.isFlying()) {
      // Flying mode - direct movement, no gravity
      const speed = this.player.getSpeed()
      
      // Forward/back
      if (movement.forward !== 0) {
        camera.getWorldDirection(this.velocity)
        this.velocity.y = 0
        this.velocity.normalize()
        position.add(this.velocity.multiplyScalar(movement.forward * speed))
      }
      
      // Strafe
      if (movement.strafe !== 0) {
        const right = new THREE.Vector3()
        right.crossVectors(camera.up, camera.getWorldDirection(new THREE.Vector3()))
        position.add(right.multiplyScalar(movement.strafe * speed))
      }
      
      // Vertical
      position.y += movement.vertical * speed
      
    } else {
      // Walking mode - apply gravity and collision
      // (Full implementation would go here - physics, jumping, etc.)
    }

    return position
  }
}
```

**Step 6: Create PhysicsService**

```typescript
// src/modules/physics/application/PhysicsService.ts
import { CollisionDetector } from './CollisionDetector'
import { MovementController } from './MovementController'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { IPlayerQuery } from '../../player/ports/IPlayerQuery'
import * as THREE from 'three'

export class PhysicsService {
  private collisionDetector: CollisionDetector
  private movementController: MovementController

  constructor(
    voxels: IVoxelQuery,
    player: IPlayerQuery,
    scene: THREE.Scene
  ) {
    this.collisionDetector = new CollisionDetector(voxels, scene)
    this.movementController = new MovementController(this.collisionDetector, player)
  }

  getCollisionDetector(): CollisionDetector {
    return this.collisionDetector
  }

  getMovementController(): MovementController {
    return this.movementController
  }
}
```

**Step 7: Create module exports**

```typescript
// src/modules/physics/index.ts
export { PhysicsService } from './application/PhysicsService'
export { ICollisionQuery } from './ports/ICollisionQuery'

// Types
export { CollisionResult } from './domain/CollisionResult'
export { MovementVector } from './domain/MovementVector'
```

**Step 8: Commit**

```bash
git add src/modules/physics
git commit -m "feat: create physics module (collision + movement)"
```

---

This plan is getting very long. Should I:
1. **Continue writing the full plan** (Input, UI, Audio modules + restoration)
2. **Create high-level outline** and fill in details as we execute
3. **Execute what we have** and iterate

Which approach do you prefer?
## Phase 4: Create Input Module

### Task 6: Create Input Module

**Goal:** Refactor InputManager into hexagonal module.

**Current:** `src/input/InputManager.ts` (~500 lines)

**Structure:**
```
src/modules/input/
├── domain/
│   ├── KeyBinding.ts         # Binding data
│   └── GameAction.ts          # Action definitions
├── application/
│   └── InputService.ts        # Manages bindings, emits events
├── ports/
│   └── IInputQuery.ts         # Query current bindings
└── index.ts
```

**Step 1: Extract domain models**

```typescript
// src/modules/input/domain/GameAction.ts
export interface GameAction {
  id: string
  category: string
  description: string
  defaultKey?: string
  defaultModifiers?: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
  }
}

// src/modules/input/domain/KeyBinding.ts
export interface KeyBinding {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
}
```

**Step 2: Create InputService**

Move InputManager logic into InputService, emit events when actions trigger.

**Step 3: Wire to EventBus**

Emit InputActionEvent when keys pressed → modules listen for their actions.

**Step 4: Commit**

```bash
git add src/modules/input
git commit -m "feat: create input module (rebindable controls)"
```

---

## Phase 5: Create UI Module

### Task 7: Create UI Module

**Goal:** Refactor UI state machine into hexagonal module.

**Structure:**
```
src/modules/ui/
├── domain/
│   └── UIState.ts             # SPLASH, MENU, PLAYING, PAUSE
├── application/
│   ├── UIService.ts           # State machine
│   ├── HUDManager.ts          # FPS, crosshair, bag
│   └── MenuManager.ts         # Menu rendering
└── index.ts
```

**Step 1: Create UIState enum**

```typescript
// src/modules/ui/domain/UIState.ts
export enum UIState {
  SPLASH = 'SPLASH',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSE = 'PAUSE'
}
```

**Step 2: Create UIService**

Extract state machine logic from src/ui/index.ts, emit UIStateChangedEvent.

**Step 3: Create HUDManager**

Manage FPS, Bag, Crosshair visibility based on state.

**Step 4: Commit**

```bash
git add src/modules/ui
git commit -m "feat: create ui module (state machine + HUD)"
```

---

## Phase 6: Create Audio Module

### Task 8: Create Audio Module

**Goal:** Simple audio module for sound effects.

**Structure:**
```
src/modules/audio/
├── application/
│   └── AudioService.ts        # Play sounds, music
└── index.ts
```

**Step 1: Create AudioService**

```typescript
// src/modules/audio/application/AudioService.ts
import * as THREE from 'three'
import { EventBus } from '../../game/infrastructure/EventBus'

export class AudioService {
  private listener: THREE.AudioListener
  private sounds = new Map<string, THREE.Audio>()

  constructor(
    camera: THREE.Camera,
    private eventBus: EventBus
  ) {
    this.listener = new THREE.AudioListener()
    camera.add(this.listener)
    
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for block placed
    this.eventBus.on('world', 'BlockPlacedEvent', () => {
      this.playSound('place')
    })
    
    // Listen for block removed
    this.eventBus.on('world', 'BlockRemovedEvent', () => {
      this.playSound('break')
    })
  }

  playSound(soundName: string): void {
    const sound = this.sounds.get(soundName)
    if (sound && !sound.isPlaying) {
      sound.play()
    }
  }

  loadSound(name: string, path: string): void {
    const sound = new THREE.Audio(this.listener)
    const audioLoader = new THREE.AudioLoader()
    
    audioLoader.load(path, (buffer) => {
      sound.setBuffer(buffer)
      sound.setVolume(0.5)
      this.sounds.set(name, sound)
    })
  }
}

// src/modules/audio/index.ts
export { AudioService } from './application/AudioService'
```

**Step 2: Commit**

```bash
git add src/modules/audio
git commit -m "feat: create audio module (event-driven sound)"
```

---

## Phase 7: Create Interaction Module

### Task 9: Create Interaction Module

**Goal:** Block placement/destruction extracted from Control, uses PlaceBlockCommand.

**Structure:**
```
src/modules/interaction/
├── application/
│   ├── InteractionService.ts  # Raycasting + commands
│   └── BlockPicker.ts          # Find target block
├── ports/
│   └── IInteractionHandler.ts  # Handle clicks
└── index.ts
```

**Step 1: Create BlockPicker**

```typescript
// src/modules/interaction/application/BlockPicker.ts
import * as THREE from 'three'

export class BlockPicker {
  private raycaster = new THREE.Raycaster()
  
  constructor() {
    this.raycaster.far = 8  // Pick distance
  }

  pickBlock(
    camera: THREE.Camera,
    scene: THREE.Scene
  ): { hit: THREE.Intersection | null, face: THREE.Vector3 | null } {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera as THREE.PerspectiveCamera)
    
    const intersects = this.raycaster.intersectObjects(scene.children, true)
    
    if (intersects.length > 0) {
      const hit = intersects[0]
      return { hit, face: hit.face?.normal || null }
    }
    
    return { hit: null, face: null }
  }
}
```

**Step 2: Create InteractionService**

```typescript
// src/modules/interaction/application/InteractionService.ts
import { CommandBus } from '../../game/infrastructure/CommandBus'
import { PlaceBlockCommand } from '../../game/domain/commands/PlaceBlockCommand'
import { BlockPicker } from './BlockPicker'
import * as THREE from 'three'

export class InteractionService {
  private blockPicker: BlockPicker

  constructor(
    private commandBus: CommandBus,
    private scene: THREE.Scene
  ) {
    this.blockPicker = new BlockPicker()
  }

  placeBlock(camera: THREE.Camera, blockType: number): void {
    const { hit, face } = this.blockPicker.pickBlock(camera, this.scene)
    
    if (hit && face) {
      const position = hit.point.clone().add(face.multiplyScalar(0.5))
      
      this.commandBus.send(
        new PlaceBlockCommand(position, blockType)
      )
    }
  }

  removeBlock(camera: THREE.Camera): void {
    const { hit } = this.blockPicker.pickBlock(camera, this.scene)
    
    if (hit) {
      // Send RemoveBlockCommand (TODO: create this command)
      console.log('Block removal:', hit.point)
    }
  }
}

// src/modules/interaction/index.ts
export { InteractionService } from './application/InteractionService'
```

**Step 3: Commit**

```bash
git add src/modules/interaction
git commit -m "feat: create interaction module (block placement via commands)"
```

---

## Phase 8: Wire Everything in GameOrchestrator

### Task 10: Expand GameOrchestrator

**Goal:** Create all services and expose via ports.

**Step 1: Update GameOrchestrator**

```typescript
// src/modules/game/application/GameOrchestrator.ts
import * as THREE from 'three'
import { WorldService } from '../../world/application/WorldService'
import { LightingService } from '../../world/lighting-application/LightingService'
import { MeshingService } from '../../rendering/meshing-application/MeshingService'
import { RenderingService } from '../../rendering/application/RenderingService'
import { PlayerService } from '../../player/application/PlayerService'
import { PhysicsService } from '../../physics/application/PhysicsService'
import { InputService } from '../../input/application/InputService'
import { UIService } from '../../ui/application/UIService'
import { AudioService } from '../../audio/application/AudioService'
import { InteractionService } from '../../interaction/application/InteractionService'
import { CommandBus } from '../infrastructure/CommandBus'
import { EventBus } from '../infrastructure/EventBus'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { NoiseGenerator } from '../../world/adapters/NoiseGenerator'
import { GenerateChunkHandler } from './handlers/GenerateChunkHandler'
import { PlaceBlockHandler } from './handlers/PlaceBlockHandler'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'

export class GameOrchestrator {
  // Infrastructure
  public commandBus: CommandBus
  public eventBus: EventBus

  // Services (all hexagonal modules)
  private worldService: WorldService
  private lightingService: LightingService
  private meshingService: MeshingService
  private renderingService: RenderingService
  private playerService: PlayerService
  private physicsService: PhysicsService
  private inputService: InputService
  private uiService: UIService
  private audioService: AudioService
  private interactionService: InteractionService

  private currentChunk = new ChunkCoordinate(0, 0)
  private previousChunk = new ChunkCoordinate(0, 0)
  private renderDistance = 3

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    // Create infrastructure
    this.commandBus = new CommandBus()
    this.eventBus = new EventBus()

    // Create all services
    this.worldService = new WorldService()
    this.lightingService = new LightingService(this.worldService, this.eventBus)
    this.meshingService = new MeshingService(this.worldService, this.lightingService, this.eventBus)
    this.renderingService = new RenderingService(scene, this.eventBus)
    this.playerService = new PlayerService(this.eventBus)
    this.physicsService = new PhysicsService(this.worldService, this.playerService, scene)
    this.inputService = new InputService(this.eventBus)
    this.uiService = new UIService(this.eventBus)
    this.audioService = new AudioService(camera, this.eventBus)
    this.interactionService = new InteractionService(this.commandBus, scene)

    // Register command handlers
    const terrainGenerator = new NoiseGenerator()
    this.commandBus.register('GenerateChunkCommand', new GenerateChunkHandler(this.worldService, this.eventBus, terrainGenerator))
    this.commandBus.register('PlaceBlockCommand', new PlaceBlockHandler(this.worldService, this.eventBus))

    console.log('✅ GameOrchestrator: All 10 modules initialized')

    // Generate initial chunks
    const initialChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )
    this.generateChunksInRenderDistance(initialChunk)
    this.previousChunk = initialChunk
  }

  update(): void {
    // Update chunks
    const newChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )

    if (!newChunk.equals(this.previousChunk)) {
      this.generateChunksInRenderDistance(newChunk)
      this.previousChunk = newChunk
    }

    this.meshingService.processDirtyQueue()
  }

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const distance = this.renderDistance

    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const coord = new ChunkCoordinate(centerChunk.x + x, centerChunk.z + z)
        this.commandBus.send(new GenerateChunkCommand(coord, this.renderDistance))
      }
    }
  }

  // Expose services via getters (ports pattern)
  getWorldService() { return this.worldService }
  getPlayerService() { return this.playerService }
  getInteractionService() { return this.interactionService }
  getUIService() { return this.uiService }
  
  // Debug
  enableEventTracing(): void {
    this.eventBus.enableTracing()
  }
}
```

**Step 2: Update main.ts**

```typescript
// src/main.ts
import { GameOrchestrator } from './modules/game'

const game = new GameOrchestrator(scene, camera)

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).game = game
  (window as any).debug = {
    enableTracing: () => game.enableEventTracing(),
    replayCommands: (from: number) => game.replayCommands(from),
    getCommandLog: () => game.getCommandLog()
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  
  game.update()  // Single orchestrator update
  
  renderer.render(scene, camera)
}
animate()
```

**Step 3: Test compilation**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: wire all modules in GameOrchestrator"
```

---

## Phase 9: Restore Original Features

### Task 11: Wire Block Placement

**Goal:** Restore building/destroying via InteractionService.

**Step 1: Listen for mouse events**

In InputService, emit events for mouse clicks.

**Step 2: Wire to InteractionService**

```typescript
// In GameOrchestrator constructor
this.eventBus.on('input', 'MouseRightClickEvent', (e: any) => {
  if (this.uiService.isPlaying()) {
    const selectedBlock = this.playerService.getSelectedBlock()
    this.interactionService.placeBlock(this.camera, selectedBlock)
  }
})

this.eventBus.on('input', 'MouseLeftClickEvent', (e: any) => {
  if (this.uiService.isPlaying()) {
    this.interactionService.removeBlock(this.camera)
  }
})
```

**Step 3: Test in browser**

1. Run `npm run dev`
2. Click "Play"
3. Right-click → block should place
4. Left-click → block should remove

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: restore block placement/removal via commands"
```

---

### Task 12: Fix Lighting Brightness

**Goal:** Make terrain visible (not black).

**Step 1: Increase sky light values**

```typescript
// src/modules/world/lighting-application/passes/SkyLightPass.ts

// In execute(), change final sky light calculation:
// OLD: lightData.setSkyLight(localX, localY, localZ, { r: 15, g: 15, b: 15 })
// NEW: lightData.setSkyLight(localX, localY, localZ, { r: 15, g: 15, b: 15 })

// But ensure vertex colors are bright enough:
// In VertexBuilder, change normalization:
export function normalizeLightToColor(rgb: RGB): { r: number, g: number, b: number } {
  return {
    r: Math.max(0.2, rgb.r / 15),  // Min 0.2 (never pure black)
    g: Math.max(0.2, rgb.g / 15),
    b: Math.max(0.2, rgb.b / 15)
  }
}
```

**Step 2: Test**

Reload game - terrain should be visible, not black.

**Step 3: Commit**

```bash
git commit -am "fix: increase minimum lighting brightness (prevent black blocks)"
```

---

### Task 13: Add Texture Support

**Goal:** Use BlockRegistry textures instead of single grass texture.

**Step 1: Update MaterialSystem**

```typescript
// src/modules/rendering/application/MaterialSystem.ts
import { blockRegistry } from '../../../blocks'

private createChunkMaterial(): void {
  // Use blockRegistry for proper materials
  const grassMaterial = blockRegistry.createMaterial(0)  // BlockType.grass
  
  // Enable vertex colors
  if (grassMaterial instanceof THREE.MeshStandardMaterial) {
    grassMaterial.vertexColors = true
  }
  
  this.materials.set('chunk', grassMaterial)
}
```

**Step 2: Add per-block materials (future enhancement)**

For now, single material OK. Note in comments that texture atlas should be added later.

**Step 3: Test**

Terrain should have grass texture.

**Step 4: Commit**

```bash
git commit -am "feat: use BlockRegistry materials with vertex colors"
```

---

### Task 14: Final Integration Test

**Goal:** Verify all original features work.

**Manual Test Checklist:**

```
Testing Protocol:
1. Load → Splash visible
2. Click → Menu appears
3. Click "Play" → Game starts
4. WASD → Player moves
5. Mouse → Camera rotates
6. Space → Jump works
7. Q → Flying mode toggles
8. Right-click → Block places
9. Left-click → Block destroys
10. 1-9 keys → Block selection works
11. Escape → Pause menu
12. Resume → Back to game
13. Save & Exit → Returns to splash
14. Load Game → Restores saved world
```

**Step 2: Check console for event cascade**

Enable tracing: `window.debug.enableTracing()`

Place block, should see:
```
📢 [input] MouseRightClickEvent
📢 [world] BlockPlacedEvent
📢 [world] LightingInvalidatedEvent
📢 [rendering] ChunkMeshBuiltEvent
📢 [audio] SoundPlayedEvent
```

**Step 3: Performance check**

- FPS should be 60
- No lag when placing blocks
- Smooth chunk generation

**Step 4: Document results**

Create: `docs/test-results-complete-hexagonal.md`

**Step 5: Commit**

```bash
git add -A
git commit -m "test: verify all features working with complete hexagonal architecture"
```

---

## Success Criteria

### Architecture
- ✅ 8 hexagonal modules (world, rendering, game, player, physics, input, ui, audio)
- ✅ All modules < 150 lines per file
- ✅ Ports define all cross-module communication
- ✅ EventBus for loose coupling
- ✅ CommandBus for state changes
- ✅ Zero direct dependencies between modules

### Features Restored
- ✅ Movement (WASD, flying, jumping)
- ✅ Building (right-click placement)
- ✅ Destroying (left-click removal)
- ✅ Block selection (1-9 keys)
- ✅ UI state machine (Splash → Menu → Play → Pause)
- ✅ Save/Load game
- ✅ Sound effects

### Visual Quality
- ✅ Terrain renders with textures
- ✅ Lighting visible (not black)
- ✅ Realistic time-of-day lighting (based on player location)
- ✅ Smooth gradients

### LLM-Friendliness
- ✅ Each module independently comprehendible
- ✅ Small file sizes (< 150 lines)
- ✅ Explicit ports (minimal context needed)
- ✅ Clear boundaries

---

**Implementation complete - 14 tasks total**
