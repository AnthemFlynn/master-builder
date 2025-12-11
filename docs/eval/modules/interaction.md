# Interaction Module Evaluation

**Date**: 2025-12-10
**Module Path**: `src/modules/interaction/`
**Purpose**: Block placement/removal, raycasting, and player-world interaction
**Reviewer**: Claude Code (Sonnet 4.5)

---

## Executive Summary

The Interaction module provides voxel raycasting and block manipulation for the Kingdom Builder platform. It implements a custom DDA (Digital Differential Analyzer) voxel traversal algorithm and integrates with the command-based architecture for state mutations.

### Scores

| Dimension | Score | Grade |
|-----------|-------|-------|
| **Architecture Purity** | 6/10 | C+ |
| **Performance** | 7/10 | B- |
| **Code Quality** | 7/10 | B- |
| **Extensibility** | 4/10 | D+ |

**Overall**: 6.0/10 (C+)

### Critical Issues

1. **Architecture**: Direct dependency on `THREE.Camera` violates hexagonal principles
2. **Architecture**: Direct dependency on `THREE.Scene` in InteractionService (unused)
3. **Extensibility**: No abstraction for interaction types (place/remove hardcoded)
4. **Extensibility**: No tool system or mode support (copy, paint, fill, etc.)
5. **Quality**: Missing validation for block placement edge cases
6. **Performance**: Raycasting happens every frame (no caching)

### Strengths

1. Clean DDA implementation with good performance characteristics
2. Proper integration with CommandBus for state mutations
3. Block highlight visualization with correct face orientation
4. Good separation between BlockPicker (algorithm) and InteractionService (coordination)

---

## 1. Architecture Purity (6/10)

### Hexagonal Violations

#### Issue 1.1: Infrastructure Leakage (HIGH PRIORITY)

**Location**: `InteractionService.ts:44`, `BlockPicker.ts:12`

```typescript
// VIOLATION: Port accepts THREE.Camera (infrastructure type)
placeBlock(camera: THREE.Camera, blockType: number): void {
  const result = this.blockPicker.pickBlock(camera, this.scene)
  // ...
}

// Port should accept domain abstraction
interface IInteractionHandler {
  placeBlock(camera: THREE.Camera, blockType: number): void  // ❌ THREE.Camera leaks
}
```

**Root Cause**: No abstraction for camera/viewport concept in domain layer.

**Recommendation**: Create domain abstraction for ray origin/direction:

```typescript
// domain/Ray.ts
export interface Ray {
  origin: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
}

// ports/IInteractionHandler.ts
export interface IInteractionHandler {
  placeBlock(ray: Ray, blockType: number): void
  removeBlock(ray: Ray): void
  updateHighlight(ray: Ray): void
}

// application/InteractionService.ts
export class InteractionService implements IInteractionHandler {
  placeBlock(ray: Ray, blockType: number): void {
    const result = this.blockPicker.pickBlock(ray)
    // ...
  }
}

// GameOrchestrator adapts THREE.Camera to Ray
const ray = this.cameraToRay(this.camera)
this.interactionService.placeBlock(ray, selectedBlock)
```

**Impact**: Medium - Enables testing without THREE.js, cleaner architecture

#### Issue 1.2: Unused Scene Dependency

**Location**: `InteractionService.ts:17-18`

```typescript
constructor(
  private commandBus: CommandBus,
  private eventBus: EventBus,
  private scene: THREE.Scene,  // ❌ Only used to add highlight mesh
  private worldService: import('../../world/application/WorldService').WorldService
) {
  // scene only used in createHighlightMesh()
}
```

**Root Cause**: Highlight mesh management mixed with interaction logic.

**Recommendation**: Extract highlight rendering to RenderingService:

```typescript
// Interaction module emits event
this.eventBus.emit('interaction', {
  type: 'BlockHighlightedEvent',
  position: result.hitBlock,
  normal: result.normal
})

// RenderingService subscribes and manages mesh
this.eventBus.on('interaction', 'BlockHighlightedEvent', (event) => {
  this.updateHighlightMesh(event.position, event.normal)
})
```

**Impact**: Low - Minor cleanup, improves separation

#### Issue 1.3: WorldService Import Path Hack

**Location**: `InteractionService.ts:18`

```typescript
private worldService: import('../../world/application/WorldService').WorldService
```

**Root Cause**: Circular dependency workaround (poor design).

**Recommendation**: Use `IVoxelQuery` port instead:

```typescript
import { IVoxelQuery } from '../../../shared/ports/IVoxelQuery'

constructor(
  private commandBus: CommandBus,
  private eventBus: EventBus,
  private voxels: IVoxelQuery  // ✅ Port, not concrete implementation
) {
  this.blockPicker = new BlockPicker(this.voxels)
}
```

**Impact**: High - Eliminates circular dependency, follows hexagonal principles

### Dependency Graph

```
InteractionService (Application Layer)
  ↓ depends on
  ├─ CommandBus (Infrastructure) ✅ OK
  ├─ EventBus (Infrastructure) ✅ OK
  ├─ THREE.Scene (Infrastructure) ❌ VIOLATION
  └─ WorldService (Application) ❌ Should use IVoxelQuery port

BlockPicker (Application Layer)
  ↓ depends on
  ├─ THREE.Raycaster (Infrastructure) ❌ VIOLATION (unused)
  ├─ THREE.Camera (Infrastructure) ❌ VIOLATION
  └─ WorldService (Application) ❌ Should use IVoxelQuery port
```

**Correct Architecture**:
```
InteractionService
  ↓ depends on
  ├─ CommandBus ✅
  ├─ EventBus ✅
  └─ IVoxelQuery (Port) ✅

BlockPicker
  ↓ depends on
  └─ IVoxelQuery (Port) ✅
```

### Port Design Quality

**Current Port** (`IInteractionHandler`):
```typescript
export interface IInteractionHandler {
  placeBlock(camera: THREE.Camera, blockType: number): void
  removeBlock(camera: THREE.Camera): void
  getSelectedBlock(): number
  setSelectedBlock(blockType: number): void
}
```

**Issues**:
1. `camera` parameter leaks infrastructure
2. Missing `updateHighlight()` method (part of contract but not in port)
3. `getSelectedBlock()/setSelectedBlock()` violates SRP (should be in InventoryService)

**Improved Port**:
```typescript
// ports/IInteractionQuery.ts
export interface IInteractionQuery {
  getTargetBlock(ray: Ray): RaycastResult | null
}

// ports/IInteractionCommand.ts
export interface IInteractionCommand {
  placeBlock(ray: Ray, blockType: number): void
  removeBlock(ray: Ray): void
  interactWithBlock(ray: Ray, action: InteractionType): void
}

// domain/InteractionType.ts
export enum InteractionType {
  Place = 'place',
  Remove = 'remove',
  Copy = 'copy',      // Pick block
  Paint = 'paint',    // Change texture
  Rotate = 'rotate',  // Rotate block
  Inspect = 'inspect' // Show properties
}
```

**Score Breakdown**:
- Port abstraction: 4/10 (leaks infrastructure, incomplete)
- Dependency direction: 5/10 (some violations)
- Module boundaries: 7/10 (generally clean, but circular dependency hack)

---

## 2. Performance (7/10)

### Raycasting Algorithm

**Implementation**: Custom DDA voxel traversal (Amanatides & Woo algorithm)

**Location**: `BlockPicker.ts:20-102`

```typescript
private raycastVoxels(origin: THREE.Vector3, direction: THREE.Vector3): RaycastResult {
  // DDA setup
  const step = new THREE.Vector3(
    direction.x > 0 ? 1 : direction.x < 0 ? -1 : 0,
    direction.y > 0 ? 1 : direction.y < 0 ? -1 : 0,
    direction.z > 0 ? 1 : direction.z < 0 ? -1 : 0
  )

  const tMax = new THREE.Vector3(
    step.x !== 0 ? (nextBoundary.x - origin.x) / direction.x : Infinity,
    step.y !== 0 ? (nextBoundary.y - origin.y) / direction.y : Infinity,
    step.z !== 0 ? (nextBoundary.z - origin.z) / direction.z : Infinity
  )

  const tDelta = new THREE.Vector3(
    step.x !== 0 ? Math.abs(1 / direction.x) : Infinity,
    step.y !== 0 ? Math.abs(1 / direction.y) : Infinity,
    step.z !== 0 ? Math.abs(1 / direction.z) : Infinity
  )

  // Traverse voxels
  while (distanceTravelled <= maxDistance) {
    const blockType = this.world.getBlockType(voxel.x, voxel.y, voxel.z)
    if (blockType !== -1 && blockType !== 0) {
      return { hit: true, hitBlock: voxel.clone(), adjacentBlock, normal }
    }

    // Step to next voxel
    if (tMax.x < tMax.y) {
      if (tMax.x < tMax.z) {
        voxel.x += step.x
        distanceTravelled = tMax.x
        tMax.x += tDelta.x
        faceNormal.set(-step.x, 0, 0)
      }
      // ...
    }
  }
}
```

**Analysis**:
- **Algorithm**: Correct DDA implementation
- **Time Complexity**: O(distance) - linear in ray length
- **Average steps**: ~10-15 voxels per raycast (12 unit max distance)
- **Cost per frame**: ~10-20 `getBlockType()` calls

**Benchmark Estimate**:
- DDA overhead: ~0.01ms
- `getBlockType()` calls: 15 × 0.001ms = 0.015ms
- Vector operations: ~0.005ms
- **Total**: ~0.03ms per raycast

**Frame Cost**: Called every frame in `GameOrchestrator.update()`:
```typescript
update(): void {
  this.interactionService.updateHighlight(this.camera)  // ← Every frame
}
```

**Impact**: Negligible at 60fps (0.03ms << 16.67ms budget)

### Performance Issues

#### Issue 2.1: Unnecessary Raycaster Instance

**Location**: `BlockPicker.ts:6-9`

```typescript
export class BlockPicker {
  private raycaster = new THREE.Raycaster()  // ❌ Created but never used

  constructor(private world: WorldService) {
    this.raycaster.far = 12
  }

  pickBlock(camera: THREE.Camera, _scene: THREE.Scene): RaycastResult {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    const origin = this.raycaster.ray.origin.clone()
    const direction = this.raycaster.ray.direction.clone().normalize()

    return this.raycastVoxels(origin, direction)  // ← Custom DDA used instead
  }
}
```

**Root Cause**: Legacy code - THREE.Raycaster setup for camera-to-ray conversion only.

**Recommendation**: Remove `raycaster` instance, compute ray directly:

```typescript
export class BlockPicker {
  constructor(private world: IVoxelQuery, private maxDistance = 12) {}

  pickBlock(ray: Ray): RaycastResult {
    return this.raycastVoxels(
      new THREE.Vector3(ray.origin.x, ray.origin.y, ray.origin.z),
      new THREE.Vector3(ray.direction.x, ray.direction.y, ray.direction.z)
    )
  }
}
```

**Impact**: Minimal - saves 1 object allocation, cleaner code

#### Issue 2.2: No Result Caching

**Location**: `GameOrchestrator.ts:160`

```typescript
update(): void {
  this.interactionService.updateHighlight(this.camera)  // ← Every frame, even if camera hasn't moved
}
```

**Root Cause**: No caching of raycast results.

**Recommendation**: Cache last raycast result:

```typescript
export class InteractionService {
  private cachedRay?: Ray
  private cachedResult?: RaycastResult

  updateHighlight(ray: Ray): void {
    // Only recast if ray changed
    if (this.rayEquals(ray, this.cachedRay)) {
      this.updateHighlightMesh(this.cachedResult)
      return
    }

    const result = this.blockPicker.pickBlock(ray)
    this.cachedRay = ray
    this.cachedResult = result
    this.updateHighlightMesh(result)
  }
}
```

**Impact**: Medium - Reduces raycasts when standing still (60fps → 0fps raycast cost when idle)

#### Issue 2.3: Vector Allocations in Hot Path

**Location**: `BlockPicker.ts:23-51`

```typescript
// ❌ Allocates 3 Vector3 instances every raycast
const voxel = new THREE.Vector3(...)
const step = new THREE.Vector3(...)
const tMax = new THREE.Vector3(...)
const tDelta = new THREE.Vector3(...)
const nextBoundary = new THREE.Vector3(...)
const faceNormal = new THREE.Vector3()
```

**Root Cause**: No object pooling for hot path allocations.

**Recommendation**: Reuse Vector3 instances:

```typescript
export class BlockPicker {
  // Reusable vectors (reduce GC pressure)
  private _voxel = new THREE.Vector3()
  private _step = new THREE.Vector3()
  private _tMax = new THREE.Vector3()
  private _tDelta = new THREE.Vector3()

  private raycastVoxels(origin: THREE.Vector3, direction: THREE.Vector3): RaycastResult {
    this._voxel.set(Math.floor(origin.x), Math.floor(origin.y), Math.floor(origin.z))
    this._step.set(/* ... */)
    // ...
  }
}
```

**Impact**: Low - Reduces GC pressure by ~300KB/sec at 60fps

### Performance Summary

| Aspect | Score | Notes |
|--------|-------|-------|
| Algorithm Efficiency | 9/10 | Optimal DDA implementation |
| Hot Path Optimization | 5/10 | No caching, unnecessary allocations |
| Frame Budget Adherence | 8/10 | <0.03ms per frame (OK) |
| Memory Efficiency | 6/10 | Allocates vectors every frame |

**Overall Performance Score**: 7/10

---

## 3. Code Quality (7/10)

### SOLID Principles Analysis

#### Single Responsibility Principle (SRP): 6/10

**InteractionService Responsibilities**:
1. ✅ Coordinate block placement/removal (core)
2. ✅ Dispatch commands to CommandBus (core)
3. ❌ Manage selected block state (should be InventoryService)
4. ❌ Manage highlight mesh rendering (should be RenderingService)
5. ❌ Create/configure highlight mesh (should be RenderingService)

**BlockPicker Responsibilities**:
1. ✅ Voxel raycasting algorithm (core)
2. ✅ Hit detection and normal calculation (core)

**Violation Example**:
```typescript
export class InteractionService {
  private selectedBlock = 14  // ❌ Inventory concern

  getSelectedBlock(): number { return this.selectedBlock }  // ❌ Wrong module
  setSelectedBlock(blockType: number): void {
    this.selectedBlock = blockType
    this.eventBus.emit('interaction', { type: 'BlockSelectionChangedEvent', blockType })
  }
}
```

**Note**: In `GameOrchestrator.ts:310`, selected block is correctly managed by `InventoryService`, so this field is **redundant**:
```typescript
// GameOrchestrator.ts:309
this.eventBus.on('inventory', 'InventoryChangedEvent', (event: any) => {
  this.interactionService.setSelectedBlock(event.selectedBlock)  // ← Duplicates inventory state
  // ...
})
```

**Recommendation**: Remove selected block state from InteractionService entirely.

#### Open/Closed Principle (OCP): 4/10

**Current Design**: Hardcoded interaction types

```typescript
placeBlock(camera: THREE.Camera, blockType: number): void {
  // Hardcoded behavior
}

removeBlock(camera: THREE.Camera): void {
  // Hardcoded behavior
}

// ❌ Cannot add new interaction types without modifying service
```

**Violation**: Adding copy, paint, fill, rotate requires modifying `InteractionService`.

**Recommendation**: Strategy pattern for interaction types:

```typescript
// domain/interactions/IInteractionStrategy.ts
export interface IInteractionStrategy {
  execute(target: RaycastResult, context: InteractionContext): void
}

// domain/interactions/PlaceBlockStrategy.ts
export class PlaceBlockStrategy implements IInteractionStrategy {
  constructor(private commandBus: CommandBus) {}

  execute(target: RaycastResult, context: InteractionContext): void {
    if (!target.adjacentBlock) return
    this.commandBus.send(new PlaceBlockCommand(
      target.adjacentBlock.x,
      target.adjacentBlock.y,
      target.adjacentBlock.z,
      context.selectedBlock
    ))
  }
}

// application/InteractionService.ts
export class InteractionService {
  private strategies = new Map<InteractionType, IInteractionStrategy>()

  registerStrategy(type: InteractionType, strategy: IInteractionStrategy): void {
    this.strategies.set(type, strategy)
  }

  interact(ray: Ray, type: InteractionType, context: InteractionContext): void {
    const result = this.blockPicker.pickBlock(ray)
    const strategy = this.strategies.get(type)
    if (strategy && result.hit) {
      strategy.execute(result, context)
    }
  }
}
```

#### Liskov Substitution Principle (LSP): N/A

No inheritance in module.

#### Interface Segregation Principle (ISP): 7/10

**IInteractionHandler** has appropriate granularity, but missing query/command separation.

**Improvement**:
```typescript
// Separate query (read) from command (write)
export interface IInteractionQuery {
  getTargetBlock(ray: Ray): RaycastResult | null
}

export interface IInteractionCommand {
  placeBlock(ray: Ray, blockType: number): void
  removeBlock(ray: Ray): void
}
```

#### Dependency Inversion Principle (DIP): 5/10

**Violations**:
- Depends on `WorldService` (concrete) instead of `IVoxelQuery` (abstraction)
- Depends on `THREE.Camera` (infrastructure) instead of domain `Ray`

**Good Examples**:
- Depends on `CommandBus` interface (abstraction)
- Depends on `EventBus` interface (abstraction)

### Clean Code Metrics

| Metric | Target | Actual | Score |
|--------|--------|--------|-------|
| Function Length | <25 lines | Max 82 lines (`raycastVoxels`) | 6/10 |
| Function Complexity | <10 branches | Max 6 branches | 8/10 |
| Class Length | <200 lines | Max 103 lines | 10/10 |
| Naming Clarity | Descriptive | Good | 9/10 |
| Comments | Minimal, clear | Sparse | 6/10 |

**Issue 3.1: Long Function**

**Location**: `BlockPicker.ts:20-102` (82 lines)

**Recommendation**: Extract DDA setup into helper:

```typescript
private raycastVoxels(origin: THREE.Vector3, direction: THREE.Vector3): RaycastResult {
  const traversal = this.setupDDA(origin, direction)
  return this.traverseVoxels(traversal)
}

private setupDDA(origin: Vector3, direction: Vector3): DDATraversal {
  // Setup logic (30 lines)
}

private traverseVoxels(traversal: DDATraversal): RaycastResult {
  // Main loop (40 lines)
}
```

### Edge Case Handling

**Missing Validations**:

1. **Block placement at world boundaries** (Y < 0 or Y > 255)
   - ✅ Handled in `PlaceBlockHandler.ts:28-31`
   - ❌ Not validated in `InteractionService.placeBlock()`

2. **Division by zero in DDA setup**
   - ✅ Protected by `step.x !== 0` checks

3. **Infinite loop prevention**
   - ⚠️ Relies on `distanceTravelled <= maxDistance` (fragile if `step` is zero)
   - **Found**: Safety check at line 96-98:
     ```typescript
     if (step.x === 0 && step.y === 0 && step.z === 0) {
       break  // ✅ Prevents infinite loop
     }
     ```

4. **Concurrent block placement** (rapid clicking)
   - ❌ No debouncing or cooldown

**Recommendation**: Add validation layer:

```typescript
placeBlock(ray: Ray, blockType: number): void {
  if (blockType <= 0) {
    console.warn('Cannot place Air or Void block')
    return
  }

  const result = this.blockPicker.pickBlock(ray)

  if (!result.hit || !result.adjacentBlock) {
    return
  }

  const { x, y, z } = result.adjacentBlock

  // Validate world bounds
  if (y < 0 || y > 255) {
    console.warn('Block placement outside world bounds')
    return
  }

  this.commandBus.send(new PlaceBlockCommand(
    Math.floor(x),
    Math.floor(y),
    Math.floor(z),
    blockType
  ))
}
```

### Code Quality Summary

| Aspect | Score | Notes |
|--------|-------|-------|
| SOLID Principles | 5.5/10 | SRP and OCP violations |
| Clean Code | 7.5/10 | Good structure, some long functions |
| Edge Cases | 7/10 | Most cases handled, missing some validations |
| Testability | 6/10 | Hard to test due to THREE.js dependencies |

**Overall Code Quality Score**: 7/10

---

## 4. Extensibility (4/10)

### Current Limitations

#### Limitation 4.1: No Tool System

**Current State**: Only two hardcoded interactions (place, remove).

**Missing Features**:
1. Copy block (pick block tool)
2. Paint block (change texture/material)
3. Fill area (flood fill)
4. Rotate block (change orientation)
5. Multi-block selection (area select)
6. Measure distance
7. Inspect block properties

**Recommendation**: Implement tool abstraction:

```typescript
// domain/tools/ITool.ts
export interface ITool {
  id: string
  name: string
  icon: string
  cursor: string
  onPrimaryAction(target: RaycastResult, context: ToolContext): void
  onSecondaryAction?(target: RaycastResult, context: ToolContext): void
  onHover?(target: RaycastResult): void
}

// domain/tools/PlaceTool.ts
export class PlaceTool implements ITool {
  id = 'place'
  name = 'Place Block'
  icon = '🔨'
  cursor = 'crosshair'

  onPrimaryAction(target: RaycastResult, context: ToolContext): void {
    if (!target.adjacentBlock) return
    context.commandBus.send(new PlaceBlockCommand(
      target.adjacentBlock,
      context.selectedBlock
    ))
  }
}

// domain/tools/CopyTool.ts
export class CopyTool implements ITool {
  id = 'copy'
  name = 'Pick Block'
  icon = '👁️'
  cursor = 'copy'

  onPrimaryAction(target: RaycastResult, context: ToolContext): void {
    if (!target.hitBlock) return
    const blockType = context.voxels.getBlockType(
      target.hitBlock.x,
      target.hitBlock.y,
      target.hitBlock.z
    )
    context.inventoryService.selectBlock(blockType)
  }
}

// application/ToolManager.ts
export class ToolManager {
  private tools = new Map<string, ITool>()
  private activeTool: ITool

  registerTool(tool: ITool): void {
    this.tools.set(tool.id, tool)
  }

  setActiveTool(toolId: string): void {
    this.activeTool = this.tools.get(toolId)!
  }

  handlePrimaryAction(ray: Ray, context: ToolContext): void {
    const target = this.blockPicker.pickBlock(ray)
    if (target.hit && this.activeTool) {
      this.activeTool.onPrimaryAction(target, context)
    }
  }
}
```

#### Limitation 4.2: No Creative Mode Features

**Missing**:
1. Multi-block operations (fill, clone, rotate region)
2. Undo/redo support
3. Copy/paste clipboard
4. Symmetry mode (mirror placement)
5. Brush size/shape configuration
6. Block replacement (replace stone with wood)

**Recommendation**: Extend command system with composite commands:

```typescript
// domain/commands/CompositeCommand.ts
export class CompositeCommand implements Command {
  readonly type = 'CompositeCommand'
  readonly timestamp = Date.now()

  constructor(
    public readonly name: string,
    public readonly commands: Command[]
  ) {}
}

// domain/commands/FillCommand.ts
export class FillCommand implements Command {
  readonly type = 'FillCommand'
  readonly timestamp = Date.now()

  constructor(
    public readonly start: Vector3,
    public readonly end: Vector3,
    public readonly blockType: number
  ) {}
}

// application/handlers/FillCommandHandler.ts
export class FillCommandHandler implements CommandHandler<FillCommand> {
  execute(command: FillCommand): void {
    const commands: PlaceBlockCommand[] = []

    for (let x = command.start.x; x <= command.end.x; x++) {
      for (let y = command.start.y; y <= command.end.y; y++) {
        for (let z = command.start.z; z <= command.end.z; z++) {
          commands.push(new PlaceBlockCommand(x, y, z, command.blockType))
        }
      }
    }

    this.commandBus.send(new CompositeCommand('Fill', commands))
  }
}
```

#### Limitation 4.3: No Undo/Redo System

**Current State**: Command log exists (`CommandBus.getLog()`) but no undo mechanism.

**Recommendation**: Implement Command Pattern with inverse operations:

```typescript
// domain/commands/Command.ts
export interface Command {
  readonly type: string
  readonly timestamp: number

  // Undo support
  createInverse?(): Command
}

// domain/commands/PlaceBlockCommand.ts
export class PlaceBlockCommand implements Command {
  createInverse(): Command {
    return new RemoveBlockCommand(this.x, this.y, this.z)
  }
}

// infrastructure/CommandBus.ts
export class CommandBus {
  private history: Command[] = []
  private historyIndex = -1

  send(command: Command): void {
    // Execute command
    this.executeCommand(command)

    // Clear redo stack
    this.history = this.history.slice(0, this.historyIndex + 1)

    // Add to history
    this.history.push(command)
    this.historyIndex++
  }

  undo(): void {
    if (this.historyIndex < 0) return

    const command = this.history[this.historyIndex]
    if (command.createInverse) {
      const inverse = command.createInverse()
      this.executeCommand(inverse)  // Don't add to history
    }

    this.historyIndex--
  }

  redo(): void {
    if (this.historyIndex >= this.history.length - 1) return

    this.historyIndex++
    const command = this.history[this.historyIndex]
    this.executeCommand(command)  // Don't add to history
  }
}
```

#### Limitation 4.4: No Raycasting Configuration

**Missing**:
- Variable raycast distance (tools with different ranges)
- Ray filtering (ignore transparent blocks, fluids, etc.)
- Ray shape (sphere cast, box cast for brush tools)

**Recommendation**: Configurable raycasting:

```typescript
// domain/RaycastConfig.ts
export interface RaycastConfig {
  maxDistance: number
  ignoreTransparent?: boolean
  ignoreTypes?: number[]
  shape?: 'ray' | 'sphere' | 'box'
  shapeSize?: number
}

// application/BlockPicker.ts
export class BlockPicker {
  pickBlock(ray: Ray, config: RaycastConfig = defaultConfig): RaycastResult {
    // ...
  }

  pickBlocks(ray: Ray, config: RaycastConfig): RaycastResult[] {
    // For brush tools (multiple blocks)
  }
}
```

### Extensibility Summary

| Feature | Status | Priority |
|---------|--------|----------|
| Tool System | ❌ Missing | HIGH |
| Creative Mode Operations | ❌ Missing | HIGH |
| Undo/Redo | ❌ Missing | MEDIUM |
| Multi-block Selection | ❌ Missing | MEDIUM |
| Raycast Configuration | ❌ Missing | LOW |
| Custom Interaction Types | ❌ Missing | MEDIUM |

**Overall Extensibility Score**: 4/10

---

## Detailed Findings by Dimension

### Architecture Issues

1. **HIGH**: Replace `THREE.Camera` with domain `Ray` abstraction
2. **HIGH**: Use `IVoxelQuery` port instead of `WorldService`
3. **MEDIUM**: Remove unused `THREE.Scene` dependency
4. **MEDIUM**: Remove selected block state (duplicate of InventoryService)
5. **LOW**: Extract highlight mesh to RenderingService

### Performance Opportunities

1. **MEDIUM**: Cache raycast results when camera static
2. **LOW**: Pool Vector3 instances to reduce GC pressure
3. **LOW**: Remove unused `THREE.Raycaster` instance

### Code Quality Improvements

1. **MEDIUM**: Split `raycastVoxels()` into smaller functions
2. **LOW**: Add JSDoc comments to public methods
3. **LOW**: Add validation to `placeBlock()/removeBlock()`

### Extensibility Recommendations

1. **HIGH**: Implement tool system with `ITool` interface
2. **HIGH**: Add creative mode features (fill, clone, copy/paste)
3. **MEDIUM**: Implement undo/redo with command inversion
4. **MEDIUM**: Add configurable raycasting (shape, filters, distance)
5. **MEDIUM**: Support multi-block operations

---

## Code Examples

### Exemplar: Clean DDA Implementation

**Location**: `BlockPicker.ts:20-102`

**Why it's good**:
1. Correct Amanatides & Woo algorithm
2. Handles edge cases (zero direction, out of bounds)
3. Efficient (optimal path traversal)
4. Returns both hit block and adjacent block (crucial for placement)

```typescript
// ✅ Good: Correct DDA setup
const step = new THREE.Vector3(
  direction.x > 0 ? 1 : direction.x < 0 ? -1 : 0,
  direction.y > 0 ? 1 : direction.y < 0 ? -1 : 0,
  direction.z > 0 ? 1 : direction.z < 0 ? -1 : 0
)

// ✅ Good: Safe division (avoids division by zero)
const tMax = new THREE.Vector3(
  step.x !== 0 ? (nextBoundary.x - origin.x) / direction.x : Infinity,
  // ...
)

// ✅ Good: Infinite loop prevention
if (step.x === 0 && step.y === 0 && step.z === 0) {
  break
}
```

### Anti-Pattern: Infrastructure Leakage

**Location**: `InteractionService.ts:44-58`

**Why it's bad**:
```typescript
// ❌ Bad: Port accepts THREE.Camera (infrastructure dependency)
placeBlock(camera: THREE.Camera, blockType: number): void {
  const result = this.blockPicker.pickBlock(camera, this.scene)
  // ...
}

// ✅ Good: Port accepts domain abstraction
placeBlock(ray: Ray, blockType: number): void {
  const result = this.blockPicker.pickBlock(ray)
  // ...
}
```

### Anti-Pattern: Redundant State

**Location**: `InteractionService.ts:11, 69-82`

**Why it's bad**:
```typescript
export class InteractionService {
  private selectedBlock = 14  // ❌ Duplicates InventoryService state

  getSelectedBlock(): number {
    return this.selectedBlock  // ❌ Wrong module (inventory concern)
  }

  setSelectedBlock(blockType: number): void {
    this.selectedBlock = blockType
    this.eventBus.emit('interaction', {
      type: 'BlockSelectionChangedEvent',
      blockType
    })
  }
}

// GameOrchestrator.ts:310
this.eventBus.on('inventory', 'InventoryChangedEvent', (event: any) => {
  this.interactionService.setSelectedBlock(event.selectedBlock)  // ❌ Sync overhead
})
```

**Fix**: Remove from InteractionService, query InventoryService directly:
```typescript
placeBlock(ray: Ray): void {
  const blockType = this.inventoryService.getSelectedBlock()  // ✅ Single source of truth
  // ...
}
```

---

## Prioritized Recommendations

### Critical (Fix Before Production)

1. **Replace THREE.Camera with Ray abstraction** (Architecture)
   - Impact: Enables testing, cleaner architecture
   - Effort: 2 hours
   - Files: `IInteractionHandler.ts`, `InteractionService.ts`, `BlockPicker.ts`, `GameOrchestrator.ts`

2. **Use IVoxelQuery port instead of WorldService** (Architecture)
   - Impact: Eliminates circular dependency
   - Effort: 30 minutes
   - Files: `InteractionService.ts`, `BlockPicker.ts`

### High Priority (Next Sprint)

3. **Implement tool system** (Extensibility)
   - Impact: Enables creative mode features
   - Effort: 8 hours
   - Files: New files in `domain/tools/`, `application/ToolManager.ts`

4. **Add undo/redo support** (Extensibility)
   - Impact: Essential for creative gameplay
   - Effort: 4 hours
   - Files: `CommandBus.ts`, `PlaceBlockCommand.ts`, `RemoveBlockCommand.ts`

5. **Remove redundant selected block state** (Code Quality)
   - Impact: Reduces complexity, prevents sync bugs
   - Effort: 1 hour
   - Files: `InteractionService.ts`, `GameOrchestrator.ts`

### Medium Priority

6. **Extract highlight mesh to RenderingService** (Architecture)
   - Impact: Better separation of concerns
   - Effort: 2 hours
   - Files: `InteractionService.ts`, `RenderingService.ts`

7. **Cache raycast results** (Performance)
   - Impact: Reduces CPU when idle
   - Effort: 1 hour
   - Files: `InteractionService.ts`

8. **Add creative mode operations** (Extensibility)
   - Impact: Enables advanced building
   - Effort: 16 hours
   - Files: New command handlers, composite commands

### Low Priority

9. **Pool Vector3 instances** (Performance)
   - Impact: Reduces GC pressure
   - Effort: 1 hour
   - Files: `BlockPicker.ts`

10. **Add JSDoc comments** (Code Quality)
    - Impact: Improves maintainability
    - Effort: 2 hours
    - Files: All interaction module files

---

## Conclusion

The Interaction module provides a **solid foundation** for voxel interaction with a correct and efficient raycasting algorithm. However, it suffers from **architectural violations** (infrastructure leakage) and **limited extensibility** (no tool system, no creative features).

### Strengths
1. Correct DDA voxel traversal
2. Good integration with command bus
3. Clean separation of concerns (BlockPicker vs InteractionService)
4. Proper face normal calculation for block placement

### Critical Weaknesses
1. Leaky abstraction (THREE.Camera in ports)
2. No tool system (hardcoded place/remove)
3. No undo/redo support
4. Missing creative mode features

### Next Steps
1. Refactor to use domain `Ray` abstraction
2. Implement tool system for extensibility
3. Add undo/redo via command inversion
4. Extract rendering concerns to RenderingService

**Estimated Effort to Fix Critical Issues**: 12 hours
**Estimated Effort for Full Extensibility**: 32 hours

---

**Evaluation Date**: 2025-12-10
**Reviewer**: Claude Code (Sonnet 4.5)
**Module Version**: Based on `state-management` branch
**Next Review**: After hexagonal architecture refactor
