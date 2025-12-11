# Kingdom Builder - Technical Roadmap

**Prioritized by**: Severity, Dependencies, Impact
**Format**: Issue → Fix → Blockers → Effort

---

## CRITICAL PATH (Dependencies Matter)

These must be done in order due to technical dependencies.

---

## Phase 1: CRITICAL FIXES (Week 1) - BLOCKING EVERYTHING

**These issues will crash the platform. Fix first.**

### 1.1 Memory Leak: CommandBus Log (1 hour)
**File**: `src/modules/game/infrastructure/CommandBus.ts`
**Issue**: Unbounded log growth (7MB in 5 hours, 58MB in 1 week)
**Blocks**: Nothing, but will crash production
**Fix**:
```typescript
private log: Command[] = []
private maxLogSize = 10000

send<T extends Command>(command: T): void {
  this.log.push(command)
  if (this.log.length > this.maxLogSize) {
    this.log.shift()
  }
  // ... rest
}
```

### 1.2 Error Handling: All Workers (2 hours)
**Files**:
- `src/modules/physics/workers/PhysicsWorker.ts`
- `src/modules/world/workers/ChunkWorker.ts`
- `src/modules/rendering/workers/MeshingWorker.ts`
- `src/modules/environment/workers/LightingWorker.ts`

**Issue**: No try/catch - any error silently crashes worker and freezes game
**Blocks**: Nothing, but will crash production
**Fix**: Wrap all `onmessage` handlers in try/catch

### 1.3 Error Handling: EventBus/CommandBus (1 hour)
**Files**:
- `src/modules/game/infrastructure/EventBus.ts`
- `src/modules/game/infrastructure/CommandBus.ts`

**Issue**: Handler errors crash entire bus
**Blocks**: Nothing, but will crash production
**Fix**: Wrap handler calls in try/catch, log errors, continue

### 1.4 Lighting Bug: Glass Opacity (30 min)
**File**: `src/modules/environment/workers/WorkerVoxelQuery.ts`
**Issue**: Glass blocks light propagation (checks transparent flag instead of collidable)
**Blocks**: Nothing
**Fix**: Change `!block.transparent` to `block.collidable` in `isBlockSolid()`

### 1.5 Memory Leak: Chunk Unloading (6 hours)
**File**: `src/modules/world/application/WorldService.ts`
**Issue**: Chunks never unloaded, unbounded growth crashes in long sessions
**Blocks**: Nothing
**Dependencies**: Need ChunkUnloadedEvent
**Fix**: Implement `unloadDistantChunks()` method

### 1.6 Memory Leak: Material Cache (4 hours)
**File**: `src/modules/rendering/application/MaterialSystem.ts`
**Issue**: Unbounded cache (300 materials × 100KB = 30MB)
**Blocks**: Nothing
**Fix**: Implement LRU cache with disposal

### 1.7 Save/Load System - Basic (2 days)
**Files**: New `src/modules/world/adapters/IndexedDBAdapter.ts`
**Issue**: World resets on page refresh (data loss)
**Blocks**: Nothing, but needed for real usage
**Dependencies**: Chunk serialization
**Fix**: IndexedDB persistence for chunks

**Phase 1 Total: 3 days (24 hours)**

---

## Phase 2: PERFORMANCE OPTIMIZATIONS (Week 2-3)

**These fixes provide 10× performance improvement. Do after Phase 1.**

### 2.1 Implement Greedy Meshing Algorithm (6 hours)
**File**: `src/modules/rendering/meshing-application/GreedyMesher.ts` (NEW)
**Issue**: Missing algorithm causes 10× polygon count (30k instead of 3k per chunk)
**Blocks**: Phase 1 must complete first
**Dependencies**: Needs stable platform
**Fix**: Implement 0fps.net greedy meshing algorithm

### 2.2 Physics: Transferable ArrayBuffers (4 hours)
**File**: `src/modules/physics/application/PhysicsService.ts`
**Issue**: Copies 589KB every frame, 8-15ms serialization overhead
**Blocks**: Phase 1 complete
**Dependencies**: None
**Fix**: Use transferList parameter in postMessage()

### 2.3 Physics: Dirty Chunk Tracking (4 hours)
**File**: `src/modules/physics/application/PhysicsService.ts`
**Issue**: Sends 318MB/s unchanged data every frame
**Blocks**: 2.2 must complete first (same file)
**Dependencies**: Needs event listener for BlockPlaced
**Fix**: Only send changed chunks

### 2.4 Enforce Rebuild Budget (1 hour)
**File**: `src/modules/rendering/meshing-application/MeshingService.ts`
**Issue**: 3ms budget declared but not enforced, causes frame drops
**Blocks**: 2.1 complete (greedy meshing must work first)
**Dependencies**: Needs performance.now() checks
**Fix**: Break processing loop when budget exceeded

### 2.5 Worker Code Consolidation (16 hours)
**Files**: Create `src/shared/workers/WorkerVoxelQuery.ts`
**Issue**: 467 lines duplicated across 3 workers, diverging behavior
**Blocks**: Phase 1.4 complete (lighting bug must be fixed first)
**Dependencies**: None beyond Phase 1
**Fix**: Extract shared WorkerVoxelQuery to shared module

### 2.6 Input: O(1) Key Lookups (2 hours)
**File**: `src/modules/input/application/InputService.ts`
**Issue**: O(n) iteration over all bindings for every keypress
**Blocks**: Nothing
**Dependencies**: None
**Fix**: Create reverse index Map<key, actionId[]>

### 2.7 UI: Throttle Radial Menu (1 hour)
**File**: `src/modules/ui/application/components/RadialMenuManager.ts`
**Issue**: Redraws on every mouse move (60+ Hz)
**Blocks**: Nothing
**Dependencies**: None
**Fix**: Use requestAnimationFrame throttling

**Phase 2 Total: 2 weeks (34 hours)**

---

## Phase 3: ARCHITECTURE COMPLIANCE (Week 4-6)

**Make all modules truly hexagonal. Requires Phase 1-2 complete for stable foundation.**

### 3.1 Blocks: Remove Three.js Coupling (4 hours)
**Files**:
- `src/modules/blocks/application/BlockRegistry.ts`
- `src/modules/rendering/application/MaterialSystem.ts`

**Issue**: BlockRegistry imports Three.js (violates hexagonal, bloats workers 600KB)
**Blocks**: Phase 1-2 complete (need stable build)
**Dependencies**: MaterialSystem must exist
**Fix**: Move material creation to rendering module

### 3.2 Blocks: Create IBlockRegistry Port (2 hours)
**File**: New `src/modules/blocks/ports/IBlockRegistry.ts`
**Issue**: No interface for dependency injection
**Blocks**: 3.1 complete (same module)
**Dependencies**: None
**Fix**: Extract interface, use in constructors

### 3.3 Interaction: Domain Ray Abstraction (2 hours)
**Files**:
- New `src/modules/interaction/domain/Ray.ts`
- `src/modules/interaction/application/InteractionService.ts`

**Issue**: Port accepts THREE.Camera (violates hexagonal)
**Blocks**: Phase 1-2 complete
**Dependencies**: None
**Fix**: Create domain Ray class, adapt from Camera

### 3.4 Interaction: Use IVoxelQuery Port (30 min)
**File**: `src/modules/interaction/application/InteractionService.ts`
**Issue**: Imports WorldService directly (circular dependency)
**Blocks**: 3.3 complete (same module)
**Dependencies**: None
**Fix**: Change constructor to accept IVoxelQuery

### 3.5 UI: DOM Adapter Layer (1 day)
**Files**:
- New `src/modules/ui/adapters/DOMAdapter.ts`
- New `src/modules/ui/ports/IDOMAdapter.ts`
- `src/modules/ui/application/UIService.ts`
- All UI components

**Issue**: Direct DOM manipulation violates hexagonal
**Blocks**: Phase 1-2 complete
**Dependencies**: None
**Fix**: Create adapter interface, implement, inject

### 3.6 UI: Extract Inline CSS (2 hours)
**Files**:
- `src/modules/ui/application/components/CreativeModalManager.ts`
- `src/style.css`

**Issue**: 130 lines of CSS in TypeScript
**Blocks**: Nothing
**Dependencies**: None
**Fix**: Move CSS to stylesheet, use classes

### 3.7 Game: Create Service Interfaces (1 day)
**Files**: New `src/modules/game/ports/*.ts` (10 interfaces)
**Issue**: GameOrchestrator imports 11 concrete classes (violates DIP)
**Blocks**: Phases 3.1-3.5 complete (need all modules compliant first)
**Dependencies**: All module ports must exist
**Fix**: Create IWorldService, IPhysicsService, etc. for all 10 services

### 3.8 Game: Split GameOrchestrator (1 day)
**Files**:
- `src/modules/game/application/GameOrchestrator.ts`
- New `src/modules/game/application/InputActionRegistry.ts`
- New `src/modules/game/application/ChunkLoadCoordinator.ts`

**Issue**: God object (462 lines, too many responsibilities)
**Blocks**: 3.7 complete (needs interfaces first)
**Dependencies**: Service interfaces
**Fix**: Extract input registration and chunk loading

### 3.9 Environment: Split EnvironmentService (1 day)
**Files**:
- `src/modules/environment/application/EnvironmentService.ts`
- New `src/modules/environment/application/TimeCycleService.ts`
- New `src/modules/environment/application/SkyService.ts`
- New `src/modules/environment/application/LightingService.ts`

**Issue**: God object manages 4 concerns
**Blocks**: Phase 1-2 complete
**Dependencies**: None
**Fix**: Split into 3 focused services

### 3.10 Audio: Complete Module Rewrite (3 weeks)
**Files**: Entire `src/modules/audio/` directory
**Issue**: No hexagonal structure, 90% non-functional, broken mappings
**Blocks**: Phase 1-2 complete (need stable foundation)
**Dependencies**: Rendering module for spatial audio
**Fix**:
- Implement domain/application/ports/adapters structure
- Add spatial audio (PositionalAudio)
- Fix block sound mappings
- Implement all commented code
- Add error handling

**Phase 3 Total: 6 weeks (240 hours)**

---

## Phase 4: DEVELOPER EXPERIENCE (Week 10-12)

**Improve iteration speed. Requires stable architecture from Phase 3.**

### 4.1 HMR Implementation (1 week)
**Files**:
- `vite.config.ts` (for dev)
- `build.ts` (for prod)
- `package.json`

**Issue**: No hot module replacement (10× slower development)
**Blocks**: Phase 3 complete (need stable architecture)
**Dependencies**: None
**Fix**: Hybrid Vite (dev) + Bun (prod)

### 4.2 Enable Source Maps (30 min)
**File**: `build.ts`
**Issue**: No source maps in production (debugging impossible)
**Blocks**: Nothing
**Dependencies**: None
**Fix**: Add `sourcemap: "external"`

### 4.3 Remove Unused Vite Dependency (30 min)
**File**: `package.json`
**Issue**: 100MB wasted in node_modules
**Blocks**: 4.1 complete (if using hybrid) OR can do now (if Bun-only)
**Dependencies**: Depends on HMR decision
**Fix**: Remove from devDependencies (if not needed)

### 4.4 Comprehensive Test Suite (2 weeks)
**Files**: New `src/**/*.test.ts` (100+ test files)
**Issue**: 0% test coverage, cannot safely refactor
**Blocks**: Phase 3 complete (need stable architecture)
**Dependencies**: Test framework setup
**Fix**:
- Unit tests for all modules
- Integration tests for event/command flow
- E2E tests for game states
- Performance regression tests
- Target: 80% coverage

**Phase 4 Total: 3 weeks (120 hours)**

---

## Phase 5: ESSENTIAL FEATURES (Week 13-16)

**Modding readiness. Requires Phases 1-4 complete.**

### 5.1 Plugin System (2 weeks)
**Files**:
- New `src/modules/plugin/` module
- New `src/modules/plugin/ports/IPlugin.ts`
- `src/modules/game/application/GameOrchestrator.ts` (integrate)

**Issue**: No plugin loading, cannot mod
**Blocks**: Phase 3 complete (need service interfaces for API)
**Dependencies**: All module ports must be stable
**Fix**: ES module dynamic imports from `/mods/` directory

### 5.2 Undo/Redo System (1 day)
**Files**:
- `src/modules/game/domain/commands/InvertibleCommand.ts` (NEW)
- Modify all 3 existing commands (PlaceBlock, RemoveBlock, GenerateChunk)
- `src/modules/game/infrastructure/CommandBus.ts` (add undo stack)

**Issue**: No undo/redo (poor creative UX)
**Blocks**: Phase 1.1 complete (CommandBus stable)
**Dependencies**: Command inversion pattern
**Fix**: Implement InvertibleCommand interface

### 5.3 Tool System (1 week)
**Files**:
- New `src/modules/interaction/domain/ITool.ts`
- New `src/modules/interaction/application/tools/` (FillTool, CopyTool, etc.)
- `src/modules/interaction/application/InteractionService.ts` (integrate)

**Issue**: Hardcoded place/remove only, no creative tools
**Blocks**: Phase 3.3-3.4 complete (Interaction module hexagonal)
**Dependencies**: Domain Ray abstraction
**Fix**: Implement tool interface + 5 basic tools (Fill, Copy, Paste, Select, Paint)

### 5.4 Gamepad Support (1 week)
**Files**:
- New `src/modules/input/adapters/GamepadAdapter.ts`
- `src/modules/input/application/InputService.ts` (integrate)

**Issue**: Declared but unimplemented (incomplete input coverage)
**Blocks**: Phase 2.6 complete (Input optimizations done)
**Dependencies**: Action system must be stable
**Fix**: Polling, button mapping, dead zones, axis handling

### 5.5 Input: Unsubscribe Method (1 hour)
**File**: `src/modules/input/application/InputService.ts`
**Issue**: Memory leak (no cleanup for action subscriptions)
**Blocks**: Nothing
**Dependencies**: None
**Fix**: Return cleanup function from `onAction()`

### 5.6 Input: Binding Persistence (3 hours)
**File**: `src/modules/input/application/InputService.ts`
**Issue**: Key bindings reset every session
**Blocks**: 5.5 complete (same file)
**Dependencies**: localStorage
**Fix**: Save/load bindings from localStorage

**Phase 5 Total: 4 weeks (160 hours)**

---

## Phase 6: ADVANCED FEATURES (Week 17-20)

**Major systems. Requires stable platform from Phases 1-5.**

### 6.1 Texture System (2 weeks)
**Files**:
- New `src/modules/rendering/application/TextureAtlas.ts`
- `src/modules/rendering/meshing-application/GreedyMesher.ts` (add UV mapping)
- `src/modules/blocks/domain/BlockDefinition.ts` (add texture paths)

**Issue**: Solid colors only (major visual limitation)
**Blocks**: Phase 2.1 complete (greedy meshing must work first)
**Dependencies**: Greedy meshing needs UV support
**Fix**:
- Texture atlas generation
- UV mapping in meshing
- Block texture definitions

### 6.2 Block State Management (1 week)
**Files**:
- `src/modules/blocks/domain/BlockDefinition.ts` (add states property)
- `src/modules/world/application/WorldService.ts` (store state data)
- New `src/modules/blocks/domain/BlockState.ts`

**Issue**: Cannot support doors, lamps, furnaces (on/off states)
**Blocks**: Phase 3.1-3.2 complete (Blocks module hexagonal)
**Dependencies**: Blocks architecture must be clean
**Fix**: Add state storage in chunks (separate from block type)

### 6.3 Entity System (3 weeks)
**Files**:
- New `src/modules/entity/` (entire new module)
- New `src/modules/entity/domain/Entity.ts`
- New `src/modules/entity/application/EntityService.ts`

**Issue**: No NPCs, mobs, projectiles, vehicles
**Blocks**: Phases 1-5 complete (need stable foundation)
**Dependencies**: Physics system for entity movement
**Fix**: Implement Entity-Component-System (ECS)

### 6.4 Advanced Creative Tools (2 weeks)
**Files**:
- Extend tool system from 5.3
- New tools: Rotate, Mirror, Clone, Replace, Terraform

**Issue**: Limited creative workflow efficiency
**Blocks**: Phase 5.3 complete (tool system must exist)
**Dependencies**: Tool system + undo/redo
**Fix**: Implement 6 additional advanced tools

**Phase 6 Total: 8 weeks (320 hours)**

---

## DEPENDENCY GRAPH

```
Phase 1 (Critical Fixes)
  └─ All independent, can run parallel
      ├─ 1.1 CommandBus leak
      ├─ 1.2 Worker errors
      ├─ 1.3 Bus errors
      ├─ 1.4 Lighting bug
      ├─ 1.5 Chunk unloading
      ├─ 1.6 Material cache
      └─ 1.7 Save/load

Phase 2 (Performance) - Requires Phase 1 complete
  ├─ 2.1 Greedy meshing (independent)
  ├─ 2.2 → 2.3 Physics transfer (sequential)
  ├─ 2.4 Rebuild budget (requires 2.1)
  ├─ 2.5 Worker consolidation (requires 1.4)
  ├─ 2.6 Input O(1) (independent)
  └─ 2.7 UI throttle (independent)

Phase 3 (Architecture) - Requires Phase 1-2 complete
  ├─ 3.1 → 3.2 Blocks module (sequential)
  ├─ 3.3 → 3.4 Interaction module (sequential)
  ├─ 3.5 → 3.6 UI module (sequential)
  ├─ 3.7 → 3.8 Game module (sequential)
  ├─ 3.9 Environment split (independent)
  └─ 3.10 Audio rewrite (independent, can run parallel)

Phase 4 (DevEx) - Requires Phase 3 complete
  ├─ 4.1 HMR (independent)
  ├─ 4.2 Source maps (independent)
  ├─ 4.3 Remove Vite (depends on 4.1 decision)
  └─ 4.4 Tests (requires stable architecture)

Phase 5 (Features) - Requires Phase 3-4 complete
  ├─ 5.1 Plugin system (requires 3.7 service interfaces)
  ├─ 5.2 Undo/redo (requires 1.1 stable CommandBus)
  ├─ 5.3 Tool system (requires 3.3-3.4 Interaction hexagonal)
  ├─ 5.4 Gamepad (requires 2.6 Input optimized)
  ├─ 5.5 → 5.6 Input features (sequential)

Phase 6 (Advanced) - Requires Phase 5 complete
  ├─ 6.1 Textures (requires 2.1 greedy meshing)
  ├─ 6.2 Block states (requires 3.1-3.2 Blocks hexagonal)
  ├─ 6.3 Entities (requires all prior phases)
  └─ 6.4 Advanced tools (requires 5.3 tool system)
```

---

## PARALLEL WORKSTREAMS

**These can run simultaneously to accelerate development:**

### Workstream A: Infrastructure (Week 1-3)
- Phase 1.1-1.6 (critical fixes)
- Phase 2.2-2.3 (physics optimization)
- Phase 2.5 (worker consolidation)

### Workstream B: Rendering (Week 2-4)
- Phase 2.1 (greedy meshing) - Requires Phase 1 complete
- Phase 2.4 (rebuild budget) - Requires 2.1 complete
- Phase 3.1-3.2 (blocks module) - Requires 2.1 complete

### Workstream C: Input/Interaction (Week 3-5)
- Phase 2.6-2.7 (input/UI optimization) - Requires Phase 1 complete
- Phase 3.3-3.4 (interaction module) - Requires Phase 2 complete
- Phase 3.5-3.6 (UI module) - Requires Phase 2 complete

### Workstream D: Audio (Week 4-7)
- Phase 3.10 (audio rewrite) - Requires Phase 1-2 complete
- Can run completely parallel to B & C

---

## EFFORT BY PRIORITY

### P0 - CRITICAL (Will Crash)
- Total: 3 days (24 hours)
- Items: 1.1-1.7
- **Must do first**

### P1 - HIGH (Performance + Architecture)
- Total: 8 weeks (320 hours)
- Items: 2.1-2.7, 3.1-3.10
- **Enables 10× performance + true hexagonal**

### P2 - MEDIUM (Features + Polish)
- Total: 4 weeks (160 hours)
- Items: 4.1-4.4, 5.1-5.6
- **Makes platform production-ready**

### P3 - LOW (Advanced Features)
- Total: 8 weeks (320 hours)
- Items: 6.1-6.4
- **Nice to have, not essential**

**Critical Path: 17 weeks (P0 + P1 + P2)**

---

## MODULE-SPECIFIC PRIORITIES

### Audio Module
**Priority**: P1 (3 weeks in Phase 3)
**Why**: Most broken module (3.5/10), no hexagonal structure
**Blocks**: Phase 1-2 (need stable foundation)
**Can Run Parallel**: Yes (independent module)

### Blocks Module
**Priority**: P1 (6 hours in Phase 3)
**Why**: Three.js coupling bloats workers, violates architecture
**Blocks**: Phase 2.1 (greedy meshing must work first)
**Can Run Parallel**: Partially (after rendering fixes)

### Environment Module
**Priority**: P1 (1 day in Phase 3)
**Why**: God object, but otherwise best module (7.5/10)
**Blocks**: Phase 1-2 complete
**Can Run Parallel**: Yes (independent)

### Game Module
**Priority**: P0 + P1 (3 hours in Phase 1, 2 days in Phase 3)
**Why**: Memory leak + god object
**Blocks**: Phase 3 (all modules must be hexagonal first)
**Can Run Parallel**: No (depends on all other modules)

### Input Module
**Priority**: P1-P2 (3 hours in Phase 2, 4 hours in Phase 5)
**Why**: O(n) lookups, no gamepad
**Blocks**: Phase 1 complete
**Can Run Parallel**: Yes (independent)

### Interaction Module
**Priority**: P1 (2.5 hours in Phase 3)
**Why**: Architecture violations (THREE.Camera, circular dependency)
**Blocks**: Phase 1-2 complete
**Can Run Parallel**: Yes

### Physics Module
**Priority**: P1 (8 hours in Phase 2)
**Why**: 318MB/s data transfer bottleneck
**Blocks**: Phase 1 complete
**Can Run Parallel**: Partially (after Phase 1)

### Player Module
**Priority**: P2 (1 hour critical, rest future)
**Why**: Reference leakage, but otherwise functional
**Blocks**: Phase 1 complete
**Can Run Parallel**: Yes

### Rendering Module
**Priority**: P1 (7 hours in Phase 2)
**Why**: Missing greedy meshing (10× performance)
**Blocks**: Phase 1 complete
**Can Run Parallel**: Yes (critical path item)

### UI Module
**Priority**: P1 (1 day in Phase 3)
**Why**: Inline CSS, DOM coupling
**Blocks**: Phase 1-2 complete
**Can Run Parallel**: Yes

### World Module
**Priority**: P0 + P1 (6 hours in Phase 1)
**Why**: Chunk memory leak (will crash)
**Blocks**: Nothing (can start immediately)
**Can Run Parallel**: Yes

---

## EXECUTION STRATEGIES

### Single Developer (17 weeks sequential)
1. Week 1: Phase 1 (critical fixes)
2. Week 2-3: Phase 2 (performance)
3. Week 4-9: Phase 3 (architecture)
4. Week 10-12: Phase 4 (dev experience)
5. Week 13-16: Phase 5 (features)
6. Optional: Week 17-24: Phase 6 (advanced)

### Two Developers (10 weeks parallel)
**Developer A**: Infrastructure + Performance
- Week 1: Phase 1.1-1.6
- Week 2-3: Phase 2.2-2.5
- Week 4-6: Phase 3.7-3.8, 3.9
- Week 7-9: Phase 4.1-4.4

**Developer B**: Modules + Features
- Week 1: Phase 1.7
- Week 2-3: Phase 2.1, 2.4
- Week 4-6: Phase 3.1-3.6
- Week 7-9: Phase 3.10 (Audio)
- Week 10: Phase 5.2-5.3

### Three Developers (7 weeks parallel)
**Developer A**: Infrastructure (Phases 1-2)
**Developer B**: Architecture (Phase 3 modules)
**Developer C**: Features (Phases 4-5)

---

## TECHNICAL DEPENDENCIES DETAIL

### Cannot Start Before:

**2.1 Greedy Meshing** → Needs:
- Phase 1 complete (stable platform)

**2.4 Rebuild Budget** → Needs:
- 2.1 complete (greedy meshing working)

**2.5 Worker Consolidation** → Needs:
- 1.4 complete (lighting bug fixed)

**3.1-3.2 Blocks Module** → Needs:
- 2.1 complete (rendering working)

**3.7 Service Interfaces** → Needs:
- 3.1-3.6 complete (all module ports exist)

**3.8 Split Orchestrator** → Needs:
- 3.7 complete (interfaces available)

**4.4 Comprehensive Tests** → Needs:
- Phase 3 complete (architecture stable)

**5.1 Plugin System** → Needs:
- 3.7 complete (service interfaces for API)

**5.3 Tool System** → Needs:
- 3.3-3.4 complete (domain Ray abstraction)

**6.1 Textures** → Needs:
- 2.1 complete (greedy meshing with UV)

**6.2 Block States** → Needs:
- 3.1-3.2 complete (Blocks hexagonal)

**6.3 Entity System** → Needs:
- Phases 1-5 complete (stable foundation)

---

## FILES REQUIRING CHANGES

### Immediate (Phase 1)
- `src/modules/game/infrastructure/CommandBus.ts`
- `src/modules/game/infrastructure/EventBus.ts`
- `src/modules/physics/workers/PhysicsWorker.ts`
- `src/modules/world/workers/ChunkWorker.ts`
- `src/modules/rendering/workers/MeshingWorker.ts`
- `src/modules/environment/workers/LightingWorker.ts`
- `src/modules/environment/workers/WorkerVoxelQuery.ts`
- `src/modules/world/application/WorldService.ts`
- `src/modules/rendering/application/MaterialSystem.ts`
- New: `src/modules/world/adapters/IndexedDBAdapter.ts`

**Total: 10 files (9 edits, 1 new)**

### Near-term (Phase 2)
- New: `src/modules/rendering/meshing-application/GreedyMesher.ts`
- `src/modules/physics/application/PhysicsService.ts`
- `src/modules/rendering/meshing-application/MeshingService.ts`
- New: `src/shared/workers/WorkerVoxelQuery.ts`
- `src/modules/input/application/InputService.ts`
- `src/modules/ui/application/components/RadialMenuManager.ts`

**Total: 6 files (4 edits, 2 new)**

### Architecture (Phase 3)
- 30+ files across all modules (ports, adapters, service splits)

### Features (Phase 4-5)
- 50+ files (HMR, tests, plugin system, tools)

---

## ESTIMATED LINES OF CODE

### Phase 1 (Critical)
- New code: ~500 lines
- Modified code: ~200 lines
- **Total**: 700 LOC

### Phase 2 (Performance)
- New code: ~1,200 lines (greedy meshing 400, consolidation 600, tests 200)
- Modified code: ~300 lines
- **Total**: 1,500 LOC

### Phase 3 (Architecture)
- New code: ~3,000 lines (ports, adapters, audio rewrite)
- Modified code: ~1,500 lines
- **Total**: 4,500 LOC

### Phase 4-5 (DevEx + Features)
- New code: ~5,000 lines (tests 3000, plugin system 1000, tools 1000)
- Modified code: ~500 lines
- **Total**: 5,500 LOC

**Grand Total: ~12,200 lines of code to add/modify**

---

## RISK MITIGATION

### High-Risk Changes (Test Carefully)

1. **Greedy Meshing** (2.1)
   - Risk: Visual artifacts, incorrect geometry
   - Mitigation: Extensive visual testing, compare to simple meshing

2. **Worker Consolidation** (2.5)
   - Risk: Breaking all 3 workers simultaneously
   - Mitigation: Implement incrementally, test each worker separately

3. **Audio Rewrite** (3.10)
   - Risk: 3 weeks of work on lowest-priority module
   - Mitigation: Can defer to Phase 6 if needed

4. **Service Interfaces** (3.7)
   - Risk: Breaking all module integrations
   - Mitigation: Use TypeScript compiler to catch breaks

5. **Plugin System** (5.1)
   - Risk: Security vulnerabilities, sandboxing failures
   - Mitigation: Read-only API for MVP, add permissions later

---

## QUICK WINS (Can Do Anytime)

**These have no dependencies and provide immediate value:**

1. Extract inline CSS (3.6) - 2 hours
2. Enable source maps (4.2) - 30 min
3. Fix lighting bug (1.4) - 30 min
4. Input unsubscribe (5.5) - 1 hour
5. UI throttle (2.7) - 1 hour
6. Input O(1) lookups (2.6) - 2 hours

**Total Quick Wins: 7 hours, can parallelize**

---

## LONG POLES (Longest Duration)

**These items block the most work:**

1. **Audio Rewrite** (3.10) - 3 weeks
2. **Comprehensive Tests** (4.4) - 2 weeks
3. **Greedy Meshing** (2.1) - 6 hours (not long, but blocks 2.4, 6.1)
4. **Plugin System** (5.1) - 2 weeks
5. **Entity System** (6.3) - 3 weeks

---

## MINIMUM VIABLE FIXES

**If you want the absolute minimum to make this stable:**

1. Phase 1.1-1.6 (skip 1.7 save/load) - 1 day
2. Phase 2.1 (greedy meshing) - 6 hours
3. Phase 2.2-2.3 (physics transfer) - 8 hours
4. Phase 1.4 (lighting bug) - 30 min

**Total MVP: 2.5 days → Platform won't crash, performs well**

**Skip everything else** if you just want it to work.

---

## RECOMMENDED SEQUENCE

**For single developer working full-time:**

### Week 1
- Mon: 1.1, 1.2, 1.3 (memory + error handling)
- Tue: 1.4, 1.5 (lighting + chunk unloading)
- Wed: 1.6 (material cache)
- Thu-Fri: 1.7 (save/load basic implementation)

### Week 2-3
- Mon-Tue: 2.1 (greedy meshing)
- Wed: 2.2-2.3 (physics transfer)
- Thu: 2.4, 2.6, 2.7 (rebuild budget, input, UI)
- Fri-Next Mon: 2.5 (worker consolidation)

### Week 4-6
- Week 4: 3.1-3.6 (Blocks, Interaction, UI modules)
- Week 5: 3.7-3.8 (Game module interfaces)
- Week 6: 3.9, start 3.10 (Environment split, begin Audio)

### Week 7-9
- Week 7-9: 3.10 (Audio rewrite - 3 weeks)

### Week 10-12
- Week 10: 4.1-4.3 (HMR, source maps, cleanup)
- Week 11-12: 4.4 (comprehensive tests)

### Week 13-16
- Week 13-14: 5.1 (plugin system)
- Week 15: 5.2-5.3 (undo/redo, tool system)
- Week 16: 5.4-5.6 (gamepad, input features)

**Total: 16 weeks to production-ready platform**

---

## FINAL CHECKLIST

### Before Starting Any Phase:
- [ ] Previous phase 100% complete
- [ ] All tests passing (once tests exist)
- [ ] No regressions introduced
- [ ] Git committed with clear message

### Phase 1 Complete When:
- [ ] No memory leaks (run 24+ hours)
- [ ] All workers have error handling
- [ ] Buses have error isolation
- [ ] Glass propagates light correctly
- [ ] Chunks unload when distant
- [ ] Material cache bounded
- [ ] Save/load works (basic)

### Phase 2 Complete When:
- [ ] Greedy meshing reduces polygons 90%
- [ ] 60 FPS at render distance 5+
- [ ] Physics transfer <10MB/s
- [ ] Rebuild budget enforced
- [ ] Worker code consolidated
- [ ] Input lookups O(1)
- [ ] Radial menu throttled

### Phase 3 Complete When:
- [ ] 90% hexagonal compliance (9/10 modules)
- [ ] All modules have port interfaces
- [ ] No Three.js in application layer
- [ ] No DOM in application layer
- [ ] Audio module has hexagonal structure
- [ ] GameOrchestrator <300 lines

### Phase 4 Complete When:
- [ ] HMR working (instant refresh)
- [ ] Source maps in production
- [ ] 80% test coverage
- [ ] Build time <2s with HMR

### Phase 5 Complete When:
- [ ] Plugin system loads ES modules
- [ ] Undo/redo implemented
- [ ] 5+ creative tools working
- [ ] Gamepad support complete
- [ ] Input bindings persist

---

**This is your technical roadmap. No business advice. Just: what to build, in what order, why.**

**Start with Phase 1. Everything else depends on it.**
