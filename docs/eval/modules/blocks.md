# Blocks Module Evaluation

**Module**: `src/modules/blocks/`
**Date**: 2025-12-10
**Evaluator**: Code Review Agent
**Status**: Operational

---

## Executive Summary

The Blocks module serves as the centralized registry and definition system for all voxel block types in Kingdom Builder. It provides a clean separation between block definitions (domain) and the registry service (application layer).

### Scores

| Dimension | Score | Grade |
|-----------|-------|-------|
| **Architecture Purity** | 6/10 | C+ |
| **Performance** | 8/10 | B+ |
| **Code Quality** | 7/10 | B |
| **Extensibility** | 7/10 | B |
| **Overall** | **7.0/10** | **B** |

### Key Findings

✅ **Strengths**:
- Clean domain-driven design with well-structured block definitions
- Efficient Map-based lookup (O(1) access)
- Good organizational structure by block category
- Comprehensive block properties (lighting, physics, visuals)

⚠️ **Concerns**:
- **Critical**: Direct THREE.js dependency violates hexagonal architecture
- No port/adapter abstraction for BlockRegistry
- Missing block state management (on/off lamps, door states)
- No validation or schema enforcement for block definitions
- Singleton pattern limits testability

---

## 1. Architecture Purity (6/10)

### 1.1 Module Structure

**Current Structure**:
```
src/modules/blocks/
├── domain/
│   ├── types.ts              # BlockDefinition, BlockCategory
│   └── definitions/
│       ├── air.ts
│       ├── ground.ts
│       ├── stone.ts
│       ├── wood.ts
│       ├── illumination.ts
│       ├── metals.ts
│       └── transparent.ts
├── application/
│   └── BlockRegistry.ts      # Singleton registry + THREE.js coupling
└── index.ts                   # Initialization + exports
```

**Strengths**:
- ✅ Clean separation of domain (definitions) from application (registry)
- ✅ Block definitions organized by category
- ✅ Single responsibility: Each definition file contains related blocks

**Violations**:

#### Critical: Three.js Dependency in Application Layer

**File**: `src/modules/blocks/application/BlockRegistry.ts` (Lines 2, 10-11, 63-86)

```typescript
import * as THREE from 'three'

export class BlockRegistry {
  private textureLoader?: THREE.TextureLoader  // ❌ Infrastructure dependency

  createMaterial(id: number): THREE.Material {  // ❌ Returns concrete Three.js type
    // ... creates THREE.MeshStandardMaterial
  }

  getBaseColor(id: number): THREE.Color {      // ❌ Returns Three.js type
    return new THREE.Color(...)
  }
}
```

**Impact**:
- Cannot use BlockRegistry in Web Workers without bundling Three.js
- Tight coupling to rendering library
- Difficult to unit test without Three.js
- Violates Dependency Inversion Principle

**Evidence in Codebase**:

From `src/modules/rendering/meshing-application/VertexBuilder.ts`:
```typescript
// Line 63: Direct usage in meshing (should be rendering concern)
const baseColor = blockRegistry.getFaceColor(blockType, normal)
```

From `src/modules/physics/workers/WorkerVoxelQuery.ts`:
```typescript
// Line 5: BlockRegistry imported in physics worker (requires Three.js bundling)
import { blockRegistry } from '../../../modules/blocks/index.ts'
```

#### No Port Abstraction

**Missing**: `src/modules/blocks/ports/IBlockRegistry.ts`

Expected interface:
```typescript
export interface IBlockRegistry {
  get(id: number): BlockDefinition | undefined
  getByCategory(category: BlockCategory): BlockDefinition[]
  isTransparent(id: number): boolean
  isCollidable(id: number): boolean
  getLightEmission(id: number): RGB
  getLightAbsorption(id: number): number
}
```

This would allow:
- Mock implementations for testing
- Multiple registry implementations (client vs. worker)
- Dependency injection instead of singleton

### 1.2 Domain Model Quality

**BlockDefinition Interface** (`src/modules/blocks/domain/types.ts`):

```typescript
export interface BlockDefinition {
  // Identity
  id: number
  name: string
  category: BlockCategory

  // Visual properties (7 fields)
  textures: string | string[]
  transparent: boolean
  baseColor?: { r: number, g: number, b: number }
  faceColors?: { top?, bottom?, side? }
  sideOverlay?: { color, height }

  // Lighting (2 fields)
  emissive: RGB
  lightAbsorption: number

  // Physics (2 fields)
  collidable: boolean
  friction: number

  // Inventory (3 fields)
  icon: string
  inventorySlot?: number
  categorySlot?: number

  // Future properties (3 fields)
  hardness?: number
  tool?: string
  drops?: number
}
```

**Strengths**:
- ✅ Comprehensive properties for voxel game needs
- ✅ Optional fields for future extensibility
- ✅ Well-documented with comments

**Issues**:
- ⚠️ No validation (e.g., lightAbsorption should be 0-1, but no enforcement)
- ⚠️ RGB values inconsistent (0-15 for emissive, 0-1 for colors)
- ⚠️ No block state management (on/off, open/closed)
- ⚠️ Mixes rendering concerns (textures) with physics (collidable)

### 1.3 Dependency Flow

```
┌─────────────────────────────────────┐
│  BlockRegistry (application)        │
│  ❌ Depends on THREE.js              │
└─────────────┬───────────────────────┘
              │
              ├─> World Module        ✅
              ├─> Rendering Module    ✅
              ├─> Physics Module      ✅
              ├─> Environment Module  ✅
              └─> Inventory Module    ✅
```

**Problem**: Application layer depends on infrastructure (Three.js), should be reversed.

**Recommendation**: Extract material creation to rendering module:

```typescript
// blocks/application/BlockRegistry.ts (cleaned)
export class BlockRegistry {
  get(id: number): BlockDefinition | undefined
  // No Three.js dependencies
}

// rendering/application/MaterialSystem.ts
export class MaterialSystem {
  createMaterial(block: BlockDefinition): THREE.Material
  // Three.js lives here
}
```

---

## 2. Performance (8/10)

### 2.1 Lookup Efficiency

**Implementation**: `Map<number, BlockDefinition>`

```typescript
// O(1) lookup - Excellent
get(id: number): BlockDefinition | undefined {
  return this.blocks.get(id)
}
```

**Benchmark Estimate**:
- Single lookup: ~1-2ns (hash table)
- 1M lookups: ~2ms
- No performance bottleneck

### 2.2 Memory Footprint

**Current Block Count**: 13 blocks
- Grass, Sand, Dirt (ground)
- Stone, Coal, Bedrock (stone)
- Oak Log, Oak Planks, Oak Leaves (wood)
- Diamond, Quartz (metals)
- Glass (transparent)
- Glowstone, Redstone Lamp (illumination)

**Memory Analysis**:
```
Per BlockDefinition:
- Object overhead: ~40 bytes
- Strings (name, textures, icon): ~200 bytes
- Numbers/booleans: ~64 bytes
- Total: ~300 bytes/block

13 blocks × 300 bytes = 3.9 KB
```

**Assessment**: ✅ Negligible memory impact

### 2.3 Initialization Cost

**From** `src/modules/blocks/index.ts`:

```typescript
export function initializeBlockRegistry(): void {
  blockRegistry.registerAll([
    ...AIR_BLOCKS,           // 1 block
    ...GROUND_BLOCKS,        // 3 blocks
    ...STONE_BLOCKS,         // 3 blocks
    ...WOOD_BLOCKS,          // 3 blocks
    ...ILLUMINATION_BLOCKS,  // 2 blocks
    ...METAL_BLOCKS,         // 2 blocks
    ...TRANSPARENT_BLOCKS    // 1 block
  ])
}
```

**Cost**: O(n) where n = 13 blocks
- 13 Map insertions: ~100ns
- ID collision checks: ~13 comparisons
- **Total**: < 1μs (negligible)

### 2.4 Texture Loading

**Lazy Loading**: ❌ Not implemented

```typescript
private createTexture(textureName: string): THREE.Texture {
  const texture = this.textureLoader.load(`${this.textureBasePath}${textureName}`)
  // Synchronous - blocks on first use per texture
  return texture
}
```

**Issue**: Each texture load is synchronous on first access. For 13 unique textures, this could cause frame drops.

**Recommendation**: Preload all textures during initialization:

```typescript
async preloadTextures(): Promise<void> {
  const promises = this.getAllBlocks().map(block => {
    // Load all textures asynchronously
  })
  await Promise.all(promises)
}
```

### 2.5 Worker Compatibility

**Current**: BlockRegistry imported in 3 workers:
1. `src/modules/physics/workers/WorkerVoxelQuery.ts` ✅ (no Three.js usage)
2. `src/modules/environment/workers/WorkerVoxelQuery.ts` ✅
3. `src/modules/rendering/workers/MeshingWorker.ts` ⚠️ (uses getFaceColor - Three.js)

**Problem**: MeshingWorker imports blockRegistry, which imports Three.js, bloating worker bundle.

**Bundle Size Impact** (estimate):
- Three.js: ~600KB minified
- BlockRegistry: ~5KB
- Worker should be: ~50KB
- **Actual**: ~655KB (13x larger)

**Recommendation**: Pass block color data as plain objects in worker messages.

---

## 3. Code Quality (7/10)

### 3.1 SOLID Principles Analysis

#### Single Responsibility Principle (SRP): 6/10

**BlockRegistry Responsibilities**:
1. ✅ Store block definitions
2. ✅ Lookup blocks by ID
3. ✅ Filter blocks by category
4. ❌ Create Three.js materials (should be MaterialSystem)
5. ❌ Load textures (should be TextureLoader adapter)
6. ❌ Calculate face colors (should be ColorSystem or in domain)

**Violation Example**:
```typescript
// BlockRegistry.ts - Lines 63-86
createMaterial(id: number): THREE.Material {
  // Material creation is rendering concern, not registry concern
}

// Lines 88-111
getFaceColor(id: number, normal: {...}): THREE.Color {
  // Color calculation mixes with registry logic
}
```

**Recommendation**: Extract to separate services.

#### Open/Closed Principle (OCP): 7/10

**Good**: Adding new blocks doesn't require modifying BlockRegistry
```typescript
// Just create new definition file
export const NEW_CATEGORY_BLOCKS: BlockDefinition[] = [...]

// Add to index.ts
blockRegistry.registerAll([..., ...NEW_CATEGORY_BLOCKS])
```

**Issue**: Block property extensions require interface changes:
```typescript
// Adding "animated" property requires:
// 1. Update BlockDefinition interface
// 2. Update all 13 block definitions (or make optional)
// 3. Update any code checking properties
```

**Recommendation**: Consider property bags for extensibility:
```typescript
interface BlockDefinition {
  // Core properties...
  metadata?: Record<string, any>  // Custom properties
}
```

#### Liskov Substitution Principle (LSP): N/A

No inheritance hierarchy in blocks module.

#### Interface Segregation Principle (ISP): 5/10

**Issue**: Single large BlockDefinition interface

```typescript
// Client only needs physics info, but gets entire definition
function checkCollision(blockId: number) {
  const block = blockRegistry.get(blockId)
  return block?.collidable  // Only needs 1 boolean, gets 17 fields
}
```

**Recommendation**: Create focused interfaces:
```typescript
interface IPhysicsProperties {
  collidable: boolean
  friction: number
}

interface IRenderProperties {
  textures: string | string[]
  transparent: boolean
  // ...
}

interface ILightingProperties {
  emissive: RGB
  lightAbsorption: number
}

interface BlockDefinition extends
  IPhysicsProperties,
  IRenderProperties,
  ILightingProperties {
  // ...
}
```

#### Dependency Inversion Principle (DIP): 4/10

**Violation**: Direct dependency on concrete Three.js classes

```typescript
// High-level module (BlockRegistry) depends on low-level module (Three.js)
import * as THREE from 'three'

// Should depend on abstractions
interface IColor { r: number, g: number, b: number }
interface IMaterial { /* ... */ }
```

### 3.2 Type Safety

**Strengths**:
- ✅ All block definitions are strongly typed
- ✅ BlockCategory enum prevents typos
- ✅ RGB interface enforces structure

**Issues**:

#### 1. Magic Numbers for Block IDs

```typescript
// From definitions/ground.ts
{ id: 14, name: 'Grass Block' }  // Why 14? No explanation

// From definitions/metals.ts
{ id: 8, name: 'Diamond Block' }  // Conflicts avoided, but fragile
```

**Problem**: Manual ID management led to conflicts (see comment in ground.ts line 9).

**Evidence** (`ground.ts` Line 9):
```typescript
id: 14,  // BlockType.grass (Moved from 8 to avoid Diamond Block conflict)
```

**Recommendation**: Use auto-incrementing IDs or enum-based system:

```typescript
// world/domain/BlockType.ts already exists!
export enum BlockType {
  air = 0,
  sand = 1,
  tree = 2,
  // ...
}

// blocks/domain/definitions/ground.ts
{
  id: BlockType.grass,  // Type-safe, no conflicts
  name: 'Grass Block'
}
```

#### 2. Inconsistent Color Representations

```typescript
// RGB for emissive: 0-15 scale
emissive: { r: 15, g: 13, b: 8 }

// RGB for baseColor: 0-1 normalized
baseColor: { r: 0.35, g: 0.9, b: 0.4 }
```

**Recommendation**: Use separate types:
```typescript
interface LightRGB { r: 0..15, g: 0..15, b: 0..15 }
interface ColorRGB { r: 0..1, g: 0..1, b: 0..1 }
```

### 3.3 Code Organization

**Block Definitions Quality**: 8/10

Example from `illumination.ts`:
```typescript
{
  id: 12,
  name: 'Glowstone',
  category: BlockCategory.ILLUMINATION,
  textures: 'glowstone.png',
  transparent: false,
  emissive: { r: 15, g: 13, b: 8 },  // ✅ Clear warm yellow
  lightAbsorption: 0.0,               // ✅ Transparent to light
  collidable: true,
  friction: 1.0,
  icon: '/textures/block/glowstone.png',
  inventorySlot: 8,
  categorySlot: 1
}
```

**Good**:
- Clear, consistent formatting
- Logical property grouping
- Inline comments for non-obvious values

**Issue**: Duplicate texture paths
```typescript
textures: 'glowstone.png',
icon: '/textures/block/glowstone.png',  // Could derive from textures
```

### 3.4 Error Handling

**Registration**:
```typescript
register(block: BlockDefinition): void {
  if (this.blocks.has(block.id)) {
    throw new Error(`❌ Block ID Collision! ID ${block.id} already registered`)
  }
  this.blocks.set(block.id, block)
}
```

✅ **Good**: Collision detection prevents runtime bugs

**Lookup**:
```typescript
get(id: number): BlockDefinition | undefined {
  return this.blocks.get(id)
}

createMaterial(id: number): THREE.Material {
  const block = this.get(id)
  if (!block) {
    console.error(`❌ Block ${id} not found`)
    return new THREE.MeshStandardMaterial({ color: 0xff00ff })  // Magenta
  }
  // ...
}
```

✅ **Good**: Fallback to magenta "missing texture" material

**Missing**:
- ⚠️ No validation of block properties (lightAbsorption 0-1, etc.)
- ⚠️ No schema validation at registration time
- ⚠️ Silent failures in workers (console.error doesn't throw)

### 3.5 Testing

**Current State**: ❌ No tests found

Expected tests:
```typescript
// blocks/application/__tests__/BlockRegistry.test.ts
describe('BlockRegistry', () => {
  test('should register block without collision')
  test('should throw on duplicate ID')
  test('should filter by category')
  test('should return undefined for missing block')
  test('getInventoryBlocks sorts by inventorySlot')
})

// blocks/domain/__tests__/BlockDefinitions.test.ts
describe('Block Definitions', () => {
  test('all blocks have unique IDs')
  test('all blocks have valid lightAbsorption (0-1)')
  test('all blocks have valid emissive values (0-15)')
  test('all texture paths exist')
})
```

---

## 4. Extensibility (7/10)

### 4.1 Adding New Block Types

**Current Process**:
1. Add entry to `BlockType` enum (world module) ⚠️ Coupling
2. Create definition in appropriate category file
3. Add to `registerAll()` call in `index.ts`

**Example**: Adding "Marble" block

```typescript
// 1. world/domain/BlockType.ts
export enum BlockType {
  // ...
  marble = 15  // ⚠️ Manual ID management
}

// 2. blocks/domain/definitions/stone.ts
export const STONE_BLOCKS: BlockDefinition[] = [
  // ... existing blocks
  {
    id: BlockType.marble,  // or just 15
    name: 'Marble',
    category: BlockCategory.STONE,
    textures: 'marble.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/marble.png',
    inventorySlot: null,
    categorySlot: 4
  }
]

// 3. No changes needed in index.ts (already spreads STONE_BLOCKS)
```

**Assessment**: ⭐⭐⭐⭐ (4/5 stars)
- Easy to add blocks
- But requires BlockType enum update in different module

### 4.2 Custom Block Behaviors

**Current**: ❌ Not supported

**Missing**:
- Block state (on/off lamps, door open/closed)
- Block interactions (furnace GUI, crafting table)
- Block updates (falling sand, growing crops)
- Block entities (chests with inventory)

**Example Need**: Redstone Lamp with on/off states

```typescript
// Current (single definition)
{ id: 13, name: 'Redstone Lamp', emissive: { r: 15, g: 4, b: 4 } }

// Needed (state-based)
{
  id: 13,
  name: 'Redstone Lamp',
  states: {
    off: { emissive: { r: 0, g: 0, b: 0 }, textures: 'redstone_lamp.png' },
    on:  { emissive: { r: 15, g: 4, b: 4 }, textures: 'redstone_lamp_on.png' }
  },
  defaultState: 'off'
}
```

**Recommendation**: Add state management:

```typescript
interface BlockState {
  name: string
  properties: Partial<BlockDefinition>  // Override base properties
}

interface BlockDefinition {
  // ... existing fields
  states?: Record<string, BlockState>
  defaultState?: string
}

// Registry methods
getBlockState(id: number, state: string): BlockDefinition
```

### 4.3 Mod Support Potential

**Current Architecture**: 6/10 for modding

**Possible Mod Interactions**:

```typescript
// ✅ Easy: Add new blocks
modAPI.blocks.register({
  id: 1000,  // Mod uses 1000+ range
  name: 'Copper Ore',
  // ...
})

// ⚠️ Hard: Modify existing blocks
modAPI.blocks.modify(BlockType.stone, {
  hardness: 2.0  // Can't currently change properties
})

// ❌ Impossible: Custom behaviors
modAPI.blocks.registerBehavior(BlockType.stone, {
  onBreak: () => { /* custom logic */ }
})
```

**Limitations**:
1. No lifecycle hooks (onPlace, onBreak, onInteract)
2. No behavior injection system
3. Singleton registry prevents parallel mod registries
4. No mod namespace/priority system

**Recommendation**: Behavior system

```typescript
interface IBlockBehavior {
  onPlace?(world: IVoxelQuery, pos: Vector3): void
  onBreak?(world: IVoxelQuery, pos: Vector3): void
  onInteract?(world: IVoxelQuery, pos: Vector3, player: IPlayer): void
  onUpdate?(world: IVoxelQuery, pos: Vector3, deltaTime: number): void
}

class BlockRegistry {
  registerBehavior(blockId: number, behavior: IBlockBehavior): void
  getBehavior(blockId: number): IBlockBehavior | undefined
}
```

### 4.4 Data-Driven Configuration

**Current**: ❌ Hardcoded in TypeScript

**Recommendation**: JSON-based definitions for modding

```json
// data/blocks/ground.json
[
  {
    "id": 14,
    "name": "Grass Block",
    "category": "ground",
    "textures": {
      "top": "grass_top_green.png",
      "bottom": "dirt.png",
      "sides": "grass_block_side.png"
    },
    "baseColor": [0.25, 0.85, 0.35],
    "physics": {
      "collidable": true,
      "friction": 1.0
    }
  }
]
```

**Benefits**:
- Mods can add blocks without code changes
- Hot-reload during development
- Schema validation with JSON Schema
- Easier for non-programmers to add content

### 4.5 Integration Points

**Current Module Consumers**:
- World (block ID storage)
- Rendering (materials, textures)
- Physics (collision, friction)
- Environment (lighting properties)
- Inventory (hotbar, icons)

**Coupling Assessment**:
```
WorldService         → blockRegistry.get() → ✅ Minimal
MaterialSystem       → blockRegistry.createMaterial() → ⚠️ Tight
PhysicsWorker        → blockRegistry.get() → ✅ Minimal
VertexBuilder        → blockRegistry.getFaceColor() → ⚠️ Should be MaterialSystem
InventoryService     → blockRegistry.getInventoryBlocks() → ✅ Appropriate
```

**Recommendation**: Add focused query interfaces:

```typescript
interface IPhysicsBlockQuery {
  isCollidable(id: number): boolean
  getFriction(id: number): number
}

interface ILightingBlockQuery {
  getLightEmission(id: number): RGB
  getLightAbsorption(id: number): number
}

// BlockRegistry implements all interfaces
class BlockRegistry implements
  IPhysicsBlockQuery,
  ILightingBlockQuery {
  // ...
}
```

---

## Detailed Findings Summary

### Critical Issues (Must Fix)

1. **Architecture Violation: Three.js Dependency** (Priority: HIGH)
   - **Location**: `BlockRegistry.ts` lines 2, 10-11, 63-160
   - **Impact**: Cannot use in workers, tight coupling, testing difficulty
   - **Fix**: Move material creation to `rendering/application/MaterialSystem.ts`
   - **Effort**: 4 hours

2. **Missing Port Abstraction** (Priority: MEDIUM)
   - **Location**: No `ports/IBlockRegistry.ts` exists
   - **Impact**: Hard to test, no dependency injection, singleton coupling
   - **Fix**: Create port interface, inject in consumers
   - **Effort**: 2 hours

3. **No Block State Management** (Priority: MEDIUM)
   - **Location**: `domain/types.ts` - BlockDefinition has no state concept
   - **Impact**: Can't support redstone lamps (on/off), doors (open/closed)
   - **Fix**: Add `states` property and state transition logic
   - **Effort**: 6 hours

### High-Value Improvements

4. **Manual Block ID Management** (Priority: MEDIUM)
   - **Location**: All definition files use hardcoded IDs
   - **Impact**: ID collision (already occurred), error-prone
   - **Fix**: Use existing `BlockType` enum from world module
   - **Effort**: 1 hour

5. **No Property Validation** (Priority: LOW)
   - **Location**: `BlockRegistry.register()` doesn't validate
   - **Impact**: Runtime bugs from invalid values (lightAbsorption > 1)
   - **Fix**: Add Zod schema or manual validation
   - **Effort**: 2 hours

6. **Missing Tests** (Priority: HIGH)
   - **Location**: No `__tests__/` directory
   - **Impact**: Can't safely refactor, no regression protection
   - **Fix**: Add unit tests for registry and definitions
   - **Effort**: 4 hours

### Nice-to-Haves

7. **JSON-Based Block Definitions** (Priority: LOW)
   - **Impact**: Enable data-driven modding
   - **Effort**: 8 hours

8. **Block Behavior System** (Priority: LOW)
   - **Impact**: Enable custom block logic (falling sand, growing crops)
   - **Effort**: 12 hours

---

## Code Examples

### Exemplary Code

**Well-Organized Block Definition** (`illumination.ts`):
```typescript
export const ILLUMINATION_BLOCKS: BlockDefinition[] = [
  {
    id: 12,
    name: 'Glowstone',
    category: BlockCategory.ILLUMINATION,
    textures: 'glowstone.png',
    transparent: false,
    emissive: { r: 15, g: 13, b: 8 },  // Warm yellow-orange glow
    lightAbsorption: 0.0,               // Fully transparent to light
    collidable: true,
    friction: 1.0,
    icon: '/textures/block/glowstone.png',
    inventorySlot: 8,
    categorySlot: 1
  }
]
```

**Why Good**:
- Clear property grouping (visual, lighting, physics, inventory)
- Meaningful comments for non-obvious values
- Consistent formatting
- Self-documenting structure

### Problem Code

**Three.js Coupling** (`BlockRegistry.ts` lines 63-86):
```typescript
createMaterial(id: number): THREE.Material {
  const block = this.get(id)
  if (!block) {
    console.error(`❌ Block ${id} not found in registry`)
    return new THREE.MeshStandardMaterial({ color: 0xff00ff, vertexColors: true })
  }

  const textureName = Array.isArray(block.textures) ? block.textures[0] : block.textures
  const map = this.createTexture(textureName)

  return new THREE.MeshStandardMaterial({
    map,
    transparent: block.transparent,
    vertexColors: true,
    roughness: 1.0,
    metalness: 0.0,
    emissive: new THREE.Color(
      block.emissive.r / 15,
      block.emissive.g / 15,
      block.emissive.b / 15
    ),
    emissiveIntensity: block.emissive.r > 0 || block.emissive.g > 0 || block.emissive.b > 0 ? 0.8 : 0
  })
}
```

**Problems**:
1. ❌ Material creation is rendering concern, not registry concern
2. ❌ Direct dependency on Three.js violates hexagonal architecture
3. ❌ Mixes texture loading (I/O) with business logic
4. ❌ Cannot be used in workers without bundling Three.js

**Refactored**:

```typescript
// blocks/application/BlockRegistry.ts (cleaned)
export class BlockRegistry implements IBlockRegistry {
  get(id: number): BlockDefinition | undefined {
    return this.blocks.get(id)
  }

  getTextureNames(id: number): string[] {
    const block = this.get(id)
    if (!block) return []
    return Array.isArray(block.textures)
      ? block.textures
      : [block.textures]
  }

  // No Three.js code
}

// rendering/application/MaterialSystem.ts
export class MaterialSystem {
  constructor(
    private blockRegistry: IBlockRegistry,
    private textureLoader: THREE.TextureLoader
  ) {}

  createMaterial(blockId: number): THREE.Material {
    const block = this.blockRegistry.get(blockId)
    if (!block) {
      return this.createMissingMaterial()
    }

    const textures = this.blockRegistry.getTextureNames(blockId)
    const map = this.textureLoader.load(textures[0])

    return new THREE.MeshStandardMaterial({
      map,
      transparent: block.transparent,
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.0,
      emissive: new THREE.Color(
        block.emissive.r / 15,
        block.emissive.g / 15,
        block.emissive.b / 15
      )
    })
  }
}
```

---

## Prioritized Recommendations

### Phase 1: Architecture Fixes (16 hours)

1. **Extract Material Creation to Rendering Module** (4h)
   - Move `createMaterial()`, `createMaterialForFace()`, `createTexture()` to MaterialSystem
   - Remove Three.js import from BlockRegistry
   - Update all callsites (4 files)

2. **Create IBlockRegistry Port** (2h)
   - Define interface in `blocks/ports/IBlockRegistry.ts`
   - Implement in BlockRegistry
   - Add factory function for dependency injection

3. **Add Block Type Enum Integration** (1h)
   - Import BlockType enum from world module
   - Update all definition files to use enum values
   - Remove magic numbers

4. **Add Unit Tests** (4h)
   - Test BlockRegistry (register, get, filter)
   - Test block definitions (validate all properties)
   - Test error cases (collisions, missing blocks)

5. **Add Property Validation** (2h)
   - Validate lightAbsorption (0-1 range)
   - Validate emissive (0-15 per channel)
   - Validate required fields
   - Throw on invalid definitions

6. **Extract Color System** (3h)
   - Move `getBaseColor()`, `getFaceColor()` to domain
   - Return plain `{r, g, b}` objects, not THREE.Color
   - Create `ColorUtils` for normalization

### Phase 2: Feature Additions (18 hours)

7. **Block State Management** (6h)
   - Add `states` property to BlockDefinition
   - Add `defaultState` property
   - Create `getBlockState(id, state)` method
   - Update redstone lamp to use states

8. **Interface Segregation** (4h)
   - Extract `IPhysicsBlockQuery` interface
   - Extract `ILightingBlockQuery` interface
   - Extract `IRenderingBlockQuery` interface
   - Update consumers to use focused interfaces

9. **Block Behavior System** (8h)
   - Create `IBlockBehavior` interface
   - Add behavior registration to BlockRegistry
   - Add lifecycle hooks (onPlace, onBreak, onInteract)
   - Implement example behavior (falling sand)

### Phase 3: Extensibility (12 hours)

10. **JSON-Based Definitions** (6h)
    - Create JSON schema for BlockDefinition
    - Add JSON loader with validation
    - Support loading from `data/blocks/*.json`
    - Maintain TypeScript definitions for type safety

11. **Mod API Foundation** (4h)
    - Add namespace support (vanilla, mod:copper_ore)
    - Add priority system for definition overrides
    - Add mod registry isolation
    - Create mod API documentation

12. **Performance Optimization** (2h)
    - Implement texture preloading
    - Add texture atlas support planning
    - Profile worker bundle sizes
    - Optimize serialization for workers

---

## Testing Protocol

### Unit Tests

```typescript
// blocks/application/__tests__/BlockRegistry.test.ts
describe('BlockRegistry', () => {
  let registry: BlockRegistry

  beforeEach(() => {
    registry = new BlockRegistry()
  })

  describe('register', () => {
    it('should register valid block', () => {
      const block: BlockDefinition = { id: 100, name: 'Test', /* ... */ }
      expect(() => registry.register(block)).not.toThrow()
      expect(registry.get(100)).toEqual(block)
    })

    it('should throw on duplicate ID', () => {
      const block1: BlockDefinition = { id: 100, name: 'Test1', /* ... */ }
      const block2: BlockDefinition = { id: 100, name: 'Test2', /* ... */ }
      registry.register(block1)
      expect(() => registry.register(block2)).toThrow('Block ID Collision')
    })

    it('should validate lightAbsorption range', () => {
      const block: BlockDefinition = { id: 100, lightAbsorption: 1.5, /* ... */ }
      expect(() => registry.register(block)).toThrow('lightAbsorption must be 0-1')
    })
  })

  describe('getByCategory', () => {
    it('should return only blocks in category', () => {
      const stones = registry.getByCategory(BlockCategory.STONE)
      expect(stones).toHaveLength(3)
      expect(stones.every(b => b.category === BlockCategory.STONE)).toBe(true)
    })
  })

  describe('getInventoryBlocks', () => {
    it('should return blocks sorted by inventorySlot', () => {
      const inventory = registry.getInventoryBlocks()
      const slots = inventory.map(b => b.inventorySlot)
      expect(slots).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
  })
})
```

### Integration Tests

```typescript
// blocks/__tests__/BlockDefinitions.integration.test.ts
describe('Block Definitions', () => {
  beforeAll(() => {
    initializeBlockRegistry()
  })

  it('all blocks have unique IDs', () => {
    const allBlocks = blockRegistry.getAllBlocks()
    const ids = allBlocks.map(b => b.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('all blocks have valid lightAbsorption', () => {
    const allBlocks = blockRegistry.getAllBlocks()
    allBlocks.forEach(block => {
      expect(block.lightAbsorption).toBeGreaterThanOrEqual(0)
      expect(block.lightAbsorption).toBeLessThanOrEqual(1)
    })
  })

  it('all blocks have valid emissive values', () => {
    const allBlocks = blockRegistry.getAllBlocks()
    allBlocks.forEach(block => {
      expect(block.emissive.r).toBeGreaterThanOrEqual(0)
      expect(block.emissive.r).toBeLessThanOrEqual(15)
      // Same for g, b
    })
  })

  it('all texture files exist', async () => {
    const allBlocks = blockRegistry.getAllBlocks()
    const texturePaths = allBlocks.flatMap(b =>
      Array.isArray(b.textures) ? b.textures : [b.textures]
    )

    for (const path of texturePaths) {
      const response = await fetch(`/textures/block/${path}`)
      expect(response.ok).toBe(true)
    }
  })
})
```

---

## Conclusion

The Blocks module provides a **solid foundation** for block management in Kingdom Builder, with clean domain organization and efficient lookup performance. However, it suffers from **critical architecture violations** (Three.js coupling) that limit its use in workers and violate hexagonal principles.

### Immediate Actions

1. ✅ **Acknowledge**: Module is operational but has technical debt
2. 🔧 **Prioritize**: Fix Three.js coupling (Phase 1, Item 1)
3. 🧪 **Test**: Add unit tests before refactoring (Phase 1, Item 4)
4. 📋 **Track**: Create issues for each Phase 1 recommendation

### Long-Term Vision

With proper refactoring, this module could support:
- ✨ 1000+ modded blocks with JSON definitions
- 🎮 Complex block behaviors (redstone circuits, growing crops)
- 🔧 Hot-reload during development
- 🌐 Multiplayer block synchronization
- 📦 Block pack distribution (community content)

**Overall Grade**: **B (7.0/10)** - Good foundation, needs architecture cleanup

---

**Evaluation Date**: 2025-12-10
**Next Review**: After Phase 1 completion (estimate: 2025-12-17)
