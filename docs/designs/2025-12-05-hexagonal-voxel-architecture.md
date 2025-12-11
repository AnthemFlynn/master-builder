# Hexagonal Voxel Architecture - Design Document

**Date**: 2025-12-05
**Status**: Validated, Ready for Implementation
**Problem**: Black block rendering due to architectural chaos (lighting/world data mixed, unclear initialization order, tight coupling)
**Solution**: Enterprise-grade modular hexagonal architecture with CQRS-lite event system

---

## Executive Summary

Refactor the voxel terrain system into 5 feature modules with hexagonal architecture, CQRS-lite for orchestration, and event-driven coordination. This separates world data (voxels) from rendering data (lighting), fixes black block rendering, and provides enterprise-grade foundation for future features (colored lighting, water physics, dynamic effects).

**Key Outcomes:**
- ✅ Fixes black block bug (proper lighting initialization order)
- ✅ Clean module boundaries (testable, debuggable)
- ✅ Event-driven (ready for time-based lighting, dynamic features)
- ✅ CQRS-lite (command replay, debugging, undo foundation)
- ✅ Token-efficient (small focused files, clean context)

---

## Module Structure

### Five Feature Modules

```
src/modules/
├─ world/              # Module 1: Voxel data (blockTypes only)
├─ lighting/           # Module 2: Lighting calculation & storage
├─ meshing/            # Module 3: Geometry generation
├─ rendering/          # Module 4: Three.js rendering
└─ terrain/            # Module 5: Orchestrator (CQRS + events)
```

### Internal Hexagonal Structure (Each Module)

```
modules/{module}/
├─ domain/             # Pure logic, no external deps
├─ application/        # Use cases, business logic
├─ ports/              # Interfaces (inbound + outbound)
├─ adapters/           # Implementations of ports
└─ index.ts            # Public API ONLY (strict exports)
```

### Architectural Rules

1. **Strict exports**: Only `index.ts` is importable from outside the module
2. **No circular dependencies**: Modules depend only on "lower" modules via ports
3. **Ports for coupling**: All cross-module dependencies via interfaces
4. **Deprecation markers**: Old code marked `@deprecated` with migration paths
5. **Event-driven**: Modules communicate via event bus (decoupled)

---

## Module 1: World (Pure Voxel Data)

### Responsibility
Store and query voxel data (block types). NO rendering concerns (no lighting, no materials).

### Structure
```
modules/world/
├─ domain/
│  ├─ VoxelChunk.ts         # ONLY blockTypes: Int8Array
│  ├─ ChunkCoordinate.ts    # Value object (x, z)
│  └─ BlockType.ts          # Enum
├─ application/
│  ├─ ChunkStorage.ts       # Map<chunkKey, VoxelChunk>
│  └─ WorldService.ts       # Public API
├─ ports/
│  ├─ IChunkGenerator.ts    # Generate blocks (implemented by adapters)
│  └─ IVoxelQuery.ts        # Query interface (for other modules)
├─ adapters/
│  └─ NoiseGenerator.ts     # Implements IChunkGenerator (Perlin noise)
└─ index.ts
```

### VoxelChunk (Cleaned!)
```typescript
class VoxelChunk {
  readonly coord: ChunkCoordinate
  private blockTypes: Int8Array

  constructor(coord: ChunkCoordinate) {
    this.blockTypes = new Int8Array(24 * 256 * 24).fill(-1)  // Air
  }

  getBlockType(x: number, y: number, z: number): number
  setBlockType(x: number, y: number, z: number, type: number): void

  // NO getLight() - that's in lighting module!
  // NO dirty flag - that's in meshing module!
  // NO mesh references - pure data!
}
```

### IVoxelQuery Port
```typescript
// What other modules need from world
interface IVoxelQuery {
  getBlockType(worldX: number, worldY: number, worldZ: number): number
  isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean
  getChunk(chunkX: number, chunkZ: number): VoxelChunk | null
}

// WorldService implements this
class WorldService implements IVoxelQuery {
  getBlockType(x: number, y: number, z: number): number {
    const chunk = this.getChunkForWorld(x, y, z)
    const local = this.worldToLocal(x, y, z)
    return chunk.getBlockType(local.x, local.y, local.z)
  }
}
```

### Key Points
- VoxelChunk is pure data (24×256×24 Int8Array)
- WorldService handles coordinate conversion (world ↔ chunk ↔ local)
- IVoxelQuery is the ONLY way other modules access voxel data

---

## Module 2: Lighting (Calculation & Storage)

### Responsibility
Calculate lighting (sky shadows + block emission) and store lighting data. SEPARATED from voxel data.

### Structure
```
modules/lighting/
├─ domain/
│  ├─ LightData.ts           # Storage (6 Uint8Arrays per chunk)
│  ├─ LightValue.ts          # {sky: RGB, block: RGB}
│  └─ ChunkLightStorage.ts   # Map<chunkKey, LightData>
├─ application/
│  ├─ LightingPipeline.ts    # Orchestrates passes
│  ├─ passes/
│  │  ├─ SkyLightPass.ts     # Phase 1: Vertical shadows
│  │  └─ PropagationPass.ts  # Phase 2: RGB flood-fill
│  └─ LightingService.ts     # Public API
├─ ports/
│  ├─ IVoxelQuery.ts         # Query blocks (from world)
│  └─ ILightingQuery.ts      # Query lighting (for meshing)
└─ index.ts
```

### LightData (Separated Storage!)

```typescript
class LightData {
  private skyLightR: Uint8Array
  private skyLightG: Uint8Array
  private skyLightB: Uint8Array
  private blockLightR: Uint8Array
  private blockLightG: Uint8Array
  private blockLightB: Uint8Array

  constructor(chunkCoord: ChunkCoordinate) {
    const size = 24 * 256 * 24
    // Initialize to 0 (will be calculated by pipeline)
    this.skyLightR = new Uint8Array(size)
    this.skyLightG = new Uint8Array(size)
    this.skyLightB = new Uint8Array(size)
    this.blockLightR = new Uint8Array(size)
    this.blockLightG = new Uint8Array(size)
    this.blockLightB = new Uint8Array(size)
  }

  getLight(x: number, y: number, z: number): LightValue {
    const index = this.getIndex(x, y, z)
    return {
      sky: {
        r: this.skyLightR[index],
        g: this.skyLightG[index],
        b: this.skyLightB[index]
      },
      block: {
        r: this.blockLightR[index],
        g: this.blockLightG[index],
        b: this.blockLightB[index]
      }
    }
  }

  setLight(x: number, y: number, z: number, value: LightValue): void
}
```

### LightingPipeline (Fixes Black Block Bug!)

```typescript
class LightingPipeline {
  private passes: ILightingPass[] = [
    new SkyLightPass(),      // Phase 1: Vertical shadows
    new PropagationPass(),   // Phase 2: Horizontal flood-fill
  ]

  constructor(private voxelQuery: IVoxelQuery) {}

  execute(chunkCoord: ChunkCoordinate): LightData {
    const lightData = new LightData(chunkCoord)

    // Run all passes in sequence (EXPLICIT ORDER - fixes timing bug!)
    for (const pass of this.passes) {
      pass.execute(lightData, this.voxelQuery, chunkCoord)
    }

    // Lighting guaranteed complete
    return lightData
  }
}
```

### SkyLightPass (Phase 1)

```typescript
class SkyLightPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoord): void {
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Vertical shadow pass (same as calculateInitialSkyLight but cleaner)
    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        let skyLight = 15

        for (let localY = 255; localY >= 0; localY--) {
          const blockType = voxels.getBlockType(
            worldX + localX,
            localY,
            worldZ + localZ
          )

          if (blockType !== -1) {
            skyLight = 0  // Shadow below solid blocks
          }

          lightData.setLight(localX, localY, localZ, {
            sky: { r: skyLight, g: skyLight, b: skyLight },
            block: { r: 0, g: 0, b: 0 }  // Block light comes from PropagationPass
          })
        }
      }
    }
  }
}
```

### PropagationPass (Phase 2)

```typescript
class PropagationPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoord): void {
    // RGB flood-fill (reuse existing LightingEngine logic)
    // This spreads block light (torches, glowstone)
    // Also spreads sky light horizontally

    // Budget: 100 iterations per call (spread over frames)
    this.floodFill(lightData, voxels, coord, budget: 100)
  }
}
```

### Why This Fixes Black Blocks

**Current Bug Flow:**
```
generateChunk() → chunk has blocks
markDirty() → mesh builds immediately
getLight() → reads default values (all 15 or all 0)
Result: Black or wrong colors
```

**New Fixed Flow:**
```
GenerateChunkCommand
  ↓ handler
WorldService.generateChunk()
  ↓ emits
ChunkGeneratedEvent
  ↓ listener
LightingPipeline.execute()
  ├─ SkyLightPass (phase 1 complete)
  └─ PropagationPass (phase 2 complete)
  ↓ emits
LightingCalculatedEvent
  ↓ listener
MeshingService.buildMesh()
  ↓ reads via ILightingQuery
getLight() → returns VALID lighting (both phases done)
Result: Correct colors!
```

**Does this lighting module with explicit pipeline phases make sense? This is the core fix.**
---

## Module 3: Meshing (Geometry Generation)

### Responsibility
Generate BufferGeometry from voxel + lighting data. Greedy meshing, vertex colors, face culling.

### Structure
```
modules/meshing/
├─ domain/
│  ├─ ChunkGeometry.ts      # Wrapper for BufferGeometry
│  └─ MeshBuildQueue.ts     # Priority queue (block > light > global)
├─ application/
│  ├─ GreedyMesher.ts       # Face merging algorithm
│  ├─ VertexBuilder.ts      # Vertex generation
│  └─ MeshingService.ts     # Public API
├─ ports/
│  ├─ IVoxelQuery.ts        # Query blocks (from world)
│  └─ ILightingQuery.ts     # Query lighting (from lighting)
└─ index.ts
```

### VertexBuilder (Decoupled!)

```typescript
class VertexBuilder {
  constructor(
    private voxels: IVoxelQuery,      // Port to world
    private lighting: ILightingQuery  // Port to lighting
  ) {}

  buildQuad(x, y, z, width, height, axis, direction, blockType): void {
    const vertices = this.getQuadVertices(...)
    const normal = this.getFaceNormal(axis, direction)

    for (const v of vertices) {
      // Position
      this.positions.push(v.x, v.y, v.z)

      // Read from lighting module (NO calculation here!)
      const light = this.lighting.getLight(v.x, v.y, v.z)
      const ao = this.calculateAO(v, normal)  // Geometry-based

      // Apply lighting
      this.colors.push(
        light.r * ao,
        light.g * ao,
        light.b * ao
      )
    }
  }
}
```

### ILightingQuery Port

```typescript
// What meshing needs from lighting
interface ILightingQuery {
  getLight(worldX: number, worldY: number, worldZ: number): LightValue
  isLightingReady(chunkCoord: ChunkCoordinate): boolean
}

// LightingService implements this
class LightingService implements ILightingQuery {
  getLight(x: number, y: number, z: number): LightValue {
    const lightData = this.getLightDataForWorld(x, y, z)
    const local = this.worldToLocal(x, y, z)
    return lightData.getLight(local.x, local.y, local.z)
  }
}
```

### Key Points
- Meshing knows NOTHING about Chunk internals
- Dependencies via interfaces (mockable, testable)
- VertexBuilder is pure geometry + data reading (no calculation)
- Event-driven: waits for LightingCalculatedEvent before building

---

## Module 4: Rendering (Three.js Layer)

### Responsibility
Manage THREE.Mesh lifecycle, materials, scene graph. Pure rendering concerns.

### Structure
```
modules/rendering/
├─ domain/
│  ├─ ChunkMesh.ts          # Wrapper for THREE.Mesh
│  └─ RenderState.ts        # Visibility, culling info
├─ application/
│  ├─ ChunkRenderer.ts      # Mesh lifecycle
│  ├─ MaterialSystem.ts     # Material creation
│  └─ RenderingService.ts   # Public API
├─ ports/
│  └─ IGeometryProvider.ts  # Get geometry from meshing
└─ index.ts
```

### ChunkRenderer (Event-Driven)

```typescript
class ChunkRenderer {
  private meshes = new Map<string, THREE.Mesh>()

  constructor(
    private scene: THREE.Scene,
    private materials: MaterialSystem,
    eventBus: EventBus
  ) {
    // Listen for mesh ready
    eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e) => {
      this.updateMesh(e.chunkCoord, e.geometry)
    })
  }

  private updateMesh(coord: ChunkCoord, geometry: BufferGeometry): void {
    // Remove old
    const key = coordToKey(coord)
    const oldMesh = this.meshes.get(key)
    if (oldMesh) {
      this.scene.remove(oldMesh)
      oldMesh.geometry.dispose()
    }

    // Add new
    const mesh = new THREE.Mesh(geometry, this.materials.getChunkMaterial())
    mesh.position.set(coord.x * 24, 0, coord.z * 24)
    this.scene.add(mesh)
    this.meshes.set(key, mesh)
  }
}
```

### MaterialSystem

```typescript
class MaterialSystem {
  private materials = new Map<string, THREE.Material>()

  constructor() {
    // All chunk materials have vertex colors enabled
    this.materials.set('chunk', new THREE.MeshStandardMaterial({
      vertexColors: true
    }))
  }

  getChunkMaterial(): THREE.Material {
    return this.materials.get('chunk')
  }
}
```

### Key Points
- Rendering knows NOTHING about voxels or lighting calculations
- Only consumes THREE.BufferGeometry from meshing
- Event-driven lifecycle (no polling, no manual coordination)

---

## Module 5: Terrain Orchestrator (CQRS + Event Mediator)

### Responsibility
Command/event infrastructure, module wiring, game loop coordination.

### Structure
```
modules/terrain/
├─ domain/
│  ├─ commands/             # All commands
│  │  ├─ PlaceBlockCommand.ts
│  │  ├─ RemoveBlockCommand.ts
│  │  ├─ GenerateChunkCommand.ts
│  │  └─ UpdateTimeCommand.ts
│  └─ events/               # All events
│     ├─ WorldEvents.ts     # ChunkGenerated, BlockPlaced, etc.
│     ├─ LightingEvents.ts  # LightingCalculated, LightingInvalidated
│     └─ MeshingEvents.ts   # ChunkMeshBuilt, MeshDirty
├─ application/
│  ├─ CommandBus.ts         # Command routing + logging
│  ├─ EventBus.ts           # Event pub/sub (categorized)
│  ├─ handlers/             # Command handlers
│  │  ├─ PlaceBlockHandler.ts
│  │  ├─ RemoveBlockHandler.ts
│  │  └─ GenerateChunkHandler.ts
│  └─ TerrainOrchestrator.ts # Main coordinator
└─ index.ts                 # Exports: TerrainOrchestrator, CommandBus
```

### CommandBus (CQRS Core)

```typescript
interface Command {
  readonly type: string
  readonly timestamp: number
}

class CommandBus {
  private handlers = new Map<string, CommandHandler>()
  private log: Command[] = []  // For replay/debug

  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler)
  }

  send<T extends Command>(command: T): void {
    this.log.push(command)
    const handler = this.handlers.get(command.type)
    
    if (!handler) {
      throw new Error(`No handler for command: ${command.type}`)
    }
    
    handler.execute(command)  // Handler emits events
  }

  replay(fromIndex: number): void {
    // Debugging: replay commands to reproduce state
    for (let i = fromIndex; i < this.log.length; i++) {
      this.send(this.log[i])
    }
  }
}
```

### EventBus (Categorized)

```typescript
type EventCategory = 'world' | 'lighting' | 'meshing' | 'rendering' | 'time'

interface DomainEvent {
  readonly type: string
  readonly timestamp: number
}

class EventBus {
  private listeners = new Map<string, EventHandler[]>()
  private trace: boolean = false  // Debug mode

  emit(category: EventCategory, event: DomainEvent): void {
    if (this.trace) {
      console.log(`📢 [${category}] ${event.type}`, event)
    }

    const key = `${category}:${event.type}`
    const handlers = this.listeners.get(key) || []
    
    for (const handler of handlers) {
      handler(event)
    }
  }

  on(
    category: EventCategory,
    eventType: string,
    handler: EventHandler
  ): void {
    const key = `${category}:${eventType}`
    const handlers = this.listeners.get(key) || []
    handlers.push(handler)
    this.listeners.set(key, handlers)
  }

  enableTracing(): void {
    this.trace = true  // Shows full event cascade in console
  }
}
```

### Command Handler Example

```typescript
class PlaceBlockHandler implements CommandHandler<PlaceBlockCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus
  ) {}

  execute(cmd: PlaceBlockCommand): void {
    // 1. Validate
    if (cmd.position.y < 0 || cmd.position.y > 255) {
      throw new Error('Invalid Y position')
    }

    // 2. Execute on world
    this.worldService.setBlock(cmd.position, cmd.blockType)

    // 3. Emit event (triggers cascade)
    this.eventBus.emit('world', new BlockPlacedEvent({
      position: cmd.position,
      blockType: cmd.blockType,
      timestamp: Date.now()
    }))

    // Lighting/Meshing/Rendering react via their event listeners
  }
}
```

### TerrainOrchestrator (Wires Everything)

```typescript
class TerrainOrchestrator {
  constructor(
    private worldService: WorldService,
    private lightingService: LightingService,
    private meshingService: MeshingService,
    private renderingService: RenderingService,
    private commandBus: CommandBus,
    private eventBus: EventBus
  ) {
    this.registerCommandHandlers()
    this.wireEventListeners()
  }

  private registerCommandHandlers(): void {
    this.commandBus.register('PlaceBlock', 
      new PlaceBlockHandler(this.worldService, this.eventBus)
    )
    this.commandBus.register('GenerateChunk',
      new GenerateChunkHandler(this.worldService, this.eventBus)
    )
  }

  private wireEventListeners(): void {
    // World → Lighting
    this.eventBus.on('world', 'ChunkGeneratedEvent', (e) => {
      this.lightingService.calculateForChunk(e.chunkCoord)
    })

    // Lighting → Meshing
    this.eventBus.on('lighting', 'LightingCalculatedEvent', (e) => {
      this.meshingService.buildMesh(e.chunkCoord)
    })

    // Meshing → Rendering
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e) => {
      this.renderingService.updateChunkMesh(e.chunkCoord, e.geometry)
    })

    // Block changes → Lighting invalidation
    this.eventBus.on('world', 'BlockPlacedEvent', (e) => {
      this.lightingService.invalidateChunk(e.chunkCoord)
    })
  }

  update(): void {
    // Per-frame updates (budgeted)
    this.lightingService.updatePropagation()  // Flood-fill spreading
    this.meshingService.processDirtyQueue()   // Mesh rebuilds
  }
}
```

---

## CQRS-lite Details

### Command Lifecycle

```
User Action (click, key press)
  ↓
CommandBus.send(new PlaceBlockCommand(...))
  ↓
Command logged (for replay)
  ↓
Handler.execute()
  ↓
Domain operation (worldService.setBlock)
  ↓
Event emitted (BlockPlacedEvent)
  ↓
Modules react via listeners
```

### Event Categories (Hybrid Pattern)

**User Commands (Coarse):**
- PlaceBlockCommand
- RemoveBlockCommand
- GenerateChunkCommand

**Domain Events (High-level):**
- ChunkGeneratedEvent
- BlockPlacedEvent
- BlockRemovedEvent

**System Events (Module-internal):**
- LightingInvalidatedEvent (lighting module)
- ChunkMeshDirtyEvent (meshing module)
- MeshUpdatedEvent (rendering module)

### Debugging Capabilities

```typescript
// Reproduce bug
commandBus.replay(fromIndex: 1500)

// Trace event cascade
eventBus.enableTracing()
// Console shows:
// 📢 [world] BlockPlacedEvent {...}
// 📢 [lighting] LightingInvalidatedEvent {...}
// 📢 [meshing] ChunkMeshDirtyEvent {...}

// Inspect specific chunk
lightingService.debugChunk(0, 0)
// → Shows: light values, which passes ran, timing
```

---

## Migration Strategy (Strangler Pattern)

### Three Phases

**Phase 1: World + Lighting Extraction (Parallel Subagents)**
```
Create:
  modules/world/ (VoxelChunk, WorldService)
  modules/lighting/ (LightData, LightingPipeline)

Keep:
  terrain/Chunk.ts (@deprecated, adapts to new modules)

Parallel agents:
  Agent 1: Extract World module
  Agent 2: Extract Lighting module
```

**Phase 2: Meshing + CQRS Foundation**
```
Create:
  modules/meshing/ (GreedyMesher, VertexBuilder)
  modules/terrain/ (CommandBus, EventBus, handlers)

Adapter:
  terrain/index.ts sends commands instead of direct calls
```

**Phase 3: Rendering + Cutover**
```
Create:
  modules/rendering/ (ChunkRenderer, MaterialSystem)

Cutover:
  main.ts uses TerrainOrchestrator (new entry point)

Cleanup:
  Delete terrain/Chunk.ts
  Delete terrain/index.ts (old)
```

### Strangler Boundary Enforcement

**Rule: Old code CAN import new, new code CANNOT import old**

```typescript
// ✅ ALLOWED
// terrain/index.ts (old)
import { WorldService } from '../modules/world'

// ❌ FORBIDDEN (lint error)
// modules/world/WorldService.ts
import { Chunk } from '../../terrain/Chunk'
```

**Enforcement:**
1. **Strict exports** - Only `modules/*/index.ts` importable
2. **@deprecated markers** - ESLint rule warns on old imports
3. **Code review** - No PR merges with old→new imports

### Migration Checklist

**Phase 1 Complete When:**
- [ ] modules/world exports WorldService implementing IVoxelQuery
- [ ] modules/lighting exports LightingService implementing ILightingQuery
- [ ] terrain/Chunk.ts adapts to both (delegates to new modules)
- [ ] All existing code still works (no regressions)

**Phase 2 Complete When:**
- [ ] modules/meshing reads via IVoxelQuery + ILightingQuery
- [ ] CommandBus + EventBus operational
- [ ] terrain/index.ts sends commands (not direct calls)
- [ ] Event cascade works (ChunkGenerated → ... → MeshBuilt)

**Phase 3 Complete When:**
- [ ] modules/rendering manages all THREE.Mesh instances
- [ ] TerrainOrchestrator is new entry point
- [ ] terrain/Chunk.ts deleted (no old code remains)
- [ ] All tests pass, no black blocks

---

## Visibility-Aware Initialization

### Hybrid Eager/Progressive Strategy

```typescript
class GenerateChunkHandler {
  execute(cmd: GenerateChunkCommand): void {
    const chunk = this.worldService.generateChunk(cmd.chunkCoord)
    
    // Event emitted
    eventBus.emit('world', new ChunkGeneratedEvent(cmd.chunkCoord))
    
    // Lighting listens and checks visibility
  }
}

class LightingService {
  constructor(eventBus: EventBus) {
    eventBus.on('world', 'ChunkGeneratedEvent', (e) => {
      if (this.isInRenderDistance(e.chunkCoord)) {
        // EAGER: Calculate immediately (visible chunk)
        this.calculateForChunk(e.chunkCoord)
      } else {
        // PROGRESSIVE: Defer until needed
        this.deferredChunks.add(e.chunkCoord)
      }
    })
    
    eventBus.on('world', 'EnteringRenderDistanceEvent', (e) => {
      // Calculate deferred chunks when they become visible
      if (this.deferredChunks.has(e.chunkCoord)) {
        this.calculateForChunk(e.chunkCoord)
        this.deferredChunks.delete(e.chunkCoord)
      }
    })
  }
}
```

**Benefits:**
- No wasted calculation (distant chunks skip lighting)
- No pop-in (visible chunks fully ready)
- Scales to larger render distances

---

## Testing Strategy

### Unit Tests (Per Module)

**World Module:**
```typescript
test('VoxelChunk stores and retrieves blocks', () => {
  const chunk = new VoxelChunk(new ChunkCoordinate(0, 0))
  chunk.setBlockType(0, 0, 0, BlockType.stone)
  expect(chunk.getBlockType(0, 0, 0)).toBe(BlockType.stone)
})
```

**Lighting Module:**
```typescript
test('SkyLightPass creates shadows below blocks', () => {
  const mockVoxels: IVoxelQuery = {
    getBlockType: (x, y, z) => y === 30 ? BlockType.stone : -1
  }
  const lightData = new LightData(coord)
  const pass = new SkyLightPass()
  
  pass.execute(lightData, mockVoxels, coord)
  
  expect(lightData.getLight(0, 31, 0).sky.r).toBe(15)  // Above block
  expect(lightData.getLight(0, 29, 0).sky.r).toBe(0)   // Below block
})
```

**Meshing Module:**
```typescript
test('VertexBuilder reads lighting from ILightingQuery', () => {
  const mockLighting: ILightingQuery = {
    getLight: () => ({ sky: {r: 10, g: 10, b: 10}, block: {r: 0, g: 0, b: 0} })
  }
  const builder = new VertexBuilder(mockVoxels, mockLighting)
  
  builder.buildQuad(...)
  
  expect(builder.colors[0]).toBeCloseTo(10/15)  // Normalized
})
```

### Integration Tests

```typescript
test('Full pipeline: chunk generation to mesh rendering', async () => {
  const orchestrator = new TerrainOrchestrator(...)
  
  // Send command
  commandBus.send(new GenerateChunkCommand(0, 0, renderDistance: 3))
  
  // Wait for event cascade
  await waitForEvent('meshing', 'ChunkMeshBuiltEvent')
  
  // Verify
  const mesh = renderingService.getMesh(0, 0)
  expect(mesh).toBeDefined()
  expect(mesh.geometry.attributes.color).toBeDefined()
  
  // Check no black vertices
  const colors = mesh.geometry.attributes.color.array
  for (let i = 0; i < colors.length; i += 3) {
    const r = colors[i]
    const g = colors[i+1]
    const b = colors[i+2]
    expect(r + g + b).toBeGreaterThan(0)  // No pure black
  }
})
```

### Manual Testing Protocol

```bash
npm run dev
```

**Checklist:**
1. Open console, enable event tracing: `window.eventBus.enableTracing()`
2. Watch event cascade when chunk generates
3. Verify no black blocks (all vertices have color > 0)
4. Place block → see command logged → event cascade → mesh updates
5. Check FPS (should maintain 60)

---

## Success Criteria

### Black Block Bug Fixed
- ✅ All blocks have light values > 0
- ✅ Surface blocks bright (≈ 1.0)
- ✅ Underground blocks dark (≈ 0.1-0.5)
- ✅ Smooth gradients visible

### Architecture Quality
- ✅ No imports from terrain/ into modules/
- ✅ All modules < 150 lines per file
- ✅ All tests pass with mocked ports
- ✅ TypeScript compiles with no errors
- ✅ Event cascade visible in console (when tracing enabled)

### Performance (Maintain Current)
- ✅ 60 FPS at render distance 3
- ✅ Chunk mesh build < 3ms
- ✅ No regression from current system

### Developer Experience
- ✅ Command replay works (can reproduce bugs)
- ✅ Event tracing shows full cascade
- ✅ Each module testable in isolation
- ✅ Clear error messages when things fail

---

## Future Extensibility

### Adding Colored Sunrise/Sunset

```typescript
// Just add a new lighting pass!
class SunsetTintPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoord): void {
    const timeOfDay = this.timeService.getTime()
    const tint = this.calculateSunsetColor(timeOfDay)
    
    // Multiply sky light by tint
    lightData.applySkyTint(tint)
  }
}

// Add to pipeline
this.passes = [
  new SkyLightPass(),
  new PropagationPass(),
  new SunsetTintPass()  // ← NEW!
]
```

### Adding Water Movement Physics

```typescript
// World module emits BlockPlacedEvent
// Physics module listens
class PhysicsService {
  constructor(eventBus: EventBus) {
    eventBus.on('world', 'BlockPlacedEvent', (e) => {
      if (e.blockType === BlockType.water) {
        this.updateFluidCollider(e.position)
      }
    })
  }
}
```

### Adding GI Bounce Lighting

```typescript
// Just add another pass!
class IndirectLightPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoord): void {
    // Sample surrounding chunks, add bounce light
  }
}
```

**Clean modules make features easy to add.**

---

## File Size Targets

### Per-File Limits (Token Efficiency)
- Domain classes: 50-100 lines
- Application services: 100-150 lines  
- Ports (interfaces): 20-50 lines
- Adapters: 50-100 lines
- Handlers: 30-50 lines

### Module Totals
- World: ~500 lines total
- Lighting: ~600 lines total (2 passes + pipeline)
- Meshing: ~400 lines total
- Rendering: ~300 lines total
- Terrain: ~400 lines total (CQRS infrastructure)

**Total new code: ~2200 lines** (current terrain/index.ts is 350 lines but doing everything wrong)

---

## Appendix: Dependency Graph

```
terrain (orchestrator)
  ↓
  ├─ world (no deps)
  ├─ lighting (depends on world via IVoxelQuery)
  ├─ meshing (depends on world + lighting via ports)
  └─ rendering (depends on meshing via IGeometryProvider)

Event flow:
  world emits → lighting listens → lighting emits → meshing listens
              → meshing emits → rendering listens
```

**No circular dependencies. Clean unidirectional flow.**

---

**Design Complete!**

Next steps:
1. Write this design to `docs/designs/2025-12-05-hexagonal-voxel-architecture.md` ✅
2. Commit design document
3. Create detailed implementation plan (use superpowers:writing-plans)
4. Set up git worktree for implementation
5. Execute with parallel subagents where applicable

