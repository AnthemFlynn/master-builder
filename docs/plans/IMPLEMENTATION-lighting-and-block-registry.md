# Implementation Plan: Lighting System & Block Registry

**Based on Design:** `/docs/plans/2025-12-03-lighting-and-block-registry-design.md`
**Target Branch:** `feature/lighting-system`
**Estimated Duration:** 6 weeks (6 phases)

---

## Overview

Implement Minecraft-style RGB lighting with centralized block registry. This plan assumes zero codebase knowledge and provides complete code examples for each task.

**Current State:**
- 14 block types scattered across 5 files
- No lighting system (emissive materials glow but don't illuminate)
- 332 textures available, only using 14

**End State:**
- BlockRegistry: Single source of truth for all blocks
- RGB colored lighting with flood-fill propagation
- 20+ blocks with gameplay properties (water, lava, ice, etc.)
- 60fps guaranteed with incremental light updates

---

# PHASE 1: BlockRegistry Foundation

**Goal:** Create centralized block registry without breaking existing game
**Duration:** 5-7 days
**Risk:** Zero (no existing code modified)

---

## Task 1.1: Create BlockRegistry Core Types

**File:** `/src/blocks/types.ts` (NEW)

**Create this exact file:**

```typescript
/**
 * Block categories for organization
 */
export enum BlockCategory {
  GROUND = 'ground',
  STONE = 'stone',
  WOOD = 'wood',
  ILLUMINATION = 'illumination',
  METALS = 'metals',
  TRANSPARENT = 'transparent',
  FLUIDS = 'fluids'
}

/**
 * RGB color value (0-15 per channel)
 */
export interface RGB {
  r: number  // 0-15
  g: number  // 0-15
  b: number  // 0-15
}

/**
 * Complete block definition
 */
export interface BlockDefinition {
  // Identity
  id: number  // BlockType value
  name: string
  category: BlockCategory

  // Visual properties
  textures: string | string[]  // Single texture or 6-face array [px, nx, py, ny, pz, nz]
  transparent: boolean

  // Lighting properties
  emissive: RGB  // Light emission (0-15 per channel)
  lightAbsorption: number  // 0.0 (glass, transmits all) to 1.0 (bedrock, blocks all)

  // Physics properties
  collidable: boolean  // Can player pass through?
  friction: number  // Movement speed multiplier (1.0 = normal, 0.5 = half speed)

  // Inventory properties
  icon: string  // Path to inventory icon
  inventorySlot?: number  // 1-9 for hotbar, null if not in hotbar
  categorySlot?: number  // Position in category (1-9)

  // Future properties (not used yet)
  hardness?: number
  tool?: string
  drops?: number  // BlockType
}
```

**Verification:**
```bash
# File should exist and TypeScript should compile
ls -la /Users/dblspeak/projects/kingdom-builder/src/blocks/types.ts
npm run build
```

---

## Task 1.2: Create BlockRegistry Class

**File:** `/src/blocks/BlockRegistry.ts` (NEW)

**Create this exact file:**

```typescript
import { BlockDefinition, BlockCategory } from './types'
import * as THREE from 'three'

/**
 * Centralized block registry
 * Single source of truth for all block definitions
 */
export class BlockRegistry {
  private blocks = new Map<number, BlockDefinition>()
  private textureLoader = new THREE.TextureLoader()

  /**
   * Register a block definition
   */
  register(block: BlockDefinition): void {
    if (this.blocks.has(block.id)) {
      console.warn(`⚠️ Block ID ${block.id} already registered. Overwriting.`)
    }
    this.blocks.set(block.id, block)
  }

  /**
   * Register multiple blocks at once
   */
  registerAll(blocks: BlockDefinition[]): void {
    blocks.forEach(block => this.register(block))
  }

  /**
   * Get block definition by ID
   */
  get(id: number): BlockDefinition | undefined {
    return this.blocks.get(id)
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): BlockDefinition[] {
    return Array.from(this.blocks.values())
  }

  /**
   * Get blocks by category
   */
  getByCategory(category: BlockCategory): BlockDefinition[] {
    return this.getAllBlocks().filter(b => b.category === category)
  }

  /**
   * Get blocks for inventory hotbar (slots 1-9)
   */
  getInventoryBlocks(): BlockDefinition[] {
    return this.getAllBlocks()
      .filter(b => b.inventorySlot !== undefined && b.inventorySlot !== null)
      .sort((a, b) => (a.inventorySlot ?? 0) - (b.inventorySlot ?? 0))
  }

  /**
   * Create Three.js material from block definition
   */
  createMaterial(id: number): THREE.Material | THREE.Material[] {
    const block = this.get(id)
    if (!block) {
      console.error(`❌ Block ${id} not found in registry`)
      return new THREE.MeshStandardMaterial({ color: 0xff00ff })  // Magenta = missing
    }

    // Multi-face materials (grass, logs)
    if (Array.isArray(block.textures)) {
      return block.textures.map(texturePath => {
        const texture = this.textureLoader.load(`/src/static/textures/block/${texturePath}`)
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter

        return new THREE.MeshStandardMaterial({
          map: texture,
          transparent: block.transparent,
          emissive: new THREE.Color(
            block.emissive.r / 15,
            block.emissive.g / 15,
            block.emissive.b / 15
          ),
          emissiveIntensity: block.emissive.r > 0 || block.emissive.g > 0 || block.emissive.b > 0 ? 0.8 : 0
        })
      })
    }

    // Single texture
    const texture = this.textureLoader.load(`/src/static/textures/block/${block.textures}`)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter

    return new THREE.MeshStandardMaterial({
      map: texture,
      transparent: block.transparent,
      emissive: new THREE.Color(
        block.emissive.r / 15,
        block.emissive.g / 15,
        block.emissive.b / 15
      ),
      emissiveIntensity: block.emissive.r > 0 || block.emissive.g > 0 || block.emissive.b > 0 ? 0.8 : 0
    })
  }

  /**
   * Get total number of registered blocks
   */
  size(): number {
    return this.blocks.size
  }
}

// Singleton instance
export const blockRegistry = new BlockRegistry()
```

**Verification:**
```bash
npm run build
# Should compile without errors
```

---

## Task 1.3: Create Ground Block Definitions

**File:** `/src/blocks/definitions/ground.ts` (NEW)

**Create this exact file:**

```typescript
import { BlockDefinition, BlockCategory } from '../types'

/**
 * Ground block definitions
 * Includes grass, dirt, sand, gravel, clay
 */
export const GROUND_BLOCKS: BlockDefinition[] = [
  {
    id: 0,  // BlockType.grass
    name: 'Grass Block',
    category: BlockCategory.GROUND,
    textures: [
      'grass_block_side.png',  // +X face
      'grass_block_side.png',  // -X face
      'grass_top_green.png',   // +Y face (top)
      'dirt.png',              // -Y face (bottom)
      'grass_block_side.png',  // +Z face
      'grass_block_side.png'   // -Z face
    ],
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,  // Fully opaque
    collidable: true,
    friction: 1.0,  // Normal movement speed
    icon: 'block-icon/grass.png',
    inventorySlot: 1,
    categorySlot: 1
  },

  {
    id: 1,  // BlockType.sand
    name: 'Sand',
    category: BlockCategory.GROUND,
    textures: 'sand.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 0.9,  // Slightly slower (sandy)
    icon: 'block-icon/sand.png',
    inventorySlot: null,  // Not in hotbar by default
    categorySlot: 2
  },

  {
    id: 4,  // BlockType.dirt
    name: 'Dirt',
    category: BlockCategory.GROUND,
    textures: 'dirt.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/dirt.png',
    inventorySlot: null,
    categorySlot: 3
  }
]
```

**Verification:**
```bash
npm run build
# Check for TypeScript errors
```

---

## Task 1.4: Create Stone Block Definitions

**File:** `/src/blocks/definitions/stone.ts` (NEW)

```typescript
import { BlockDefinition, BlockCategory } from '../types'

export const STONE_BLOCKS: BlockDefinition[] = [
  {
    id: 5,  // BlockType.stone
    name: 'Stone',
    category: BlockCategory.STONE,
    textures: 'stone.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/stone.png',
    inventorySlot: 2,
    categorySlot: 1
  },

  {
    id: 6,  // BlockType.coal
    name: 'Coal Ore',
    category: BlockCategory.STONE,
    textures: 'coal_ore.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/coal.png',
    inventorySlot: null,
    categorySlot: 2
  },

  {
    id: 11,  // BlockType.bedrock
    name: 'Bedrock',
    category: BlockCategory.STONE,
    textures: 'bedrock.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,  // Completely opaque
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/bedrock.png',
    inventorySlot: null,
    categorySlot: 3
  }
]
```

**Verification:**
```bash
npm run build
```

---

## Task 1.5: Create Wood Block Definitions

**File:** `/src/blocks/definitions/wood.ts` (NEW)

```typescript
import { BlockDefinition, BlockCategory } from '../types'

export const WOOD_BLOCKS: BlockDefinition[] = [
  {
    id: 2,  // BlockType.tree
    name: 'Oak Log',
    category: BlockCategory.WOOD,
    textures: [
      'oak_log.png',      // +X face
      'oak_log.png',      // -X face
      'oak_log_top.png',  // +Y face (top)
      'oak_log_top.png',  // -Y face (bottom)
      'oak_log.png',      // +Z face
      'oak_log.png'       // -Z face
    ],
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/tree.png',
    inventorySlot: 3,
    categorySlot: 1
  },

  {
    id: 7,  // BlockType.wood
    name: 'Oak Planks',
    category: BlockCategory.WOOD,
    textures: 'oak_planks.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/wood.png',
    inventorySlot: 4,
    categorySlot: 2
  },

  {
    id: 3,  // BlockType.leaf
    name: 'Oak Leaves',
    category: BlockCategory.TRANSPARENT,  // Leaves are transparent
    textures: 'oak_leaves.png',
    transparent: true,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.5,  // Partially transparent to light
    collidable: true,
    friction: 0.8,  // Slightly impedes movement
    icon: 'block-icon/leaf.png',
    inventorySlot: null,
    categorySlot: 1
  }
]
```

**Verification:**
```bash
npm run build
```

---

## Task 1.6: Create Illumination Block Definitions

**File:** `/src/blocks/definitions/illumination.ts` (NEW)

```typescript
import { BlockDefinition, BlockCategory } from '../types'

export const ILLUMINATION_BLOCKS: BlockDefinition[] = [
  {
    id: 12,  // BlockType.glowstone
    name: 'Glowstone',
    category: BlockCategory.ILLUMINATION,
    textures: 'glowstone.png',
    transparent: false,
    emissive: { r: 15, g: 13, b: 8 },  // Warm yellow-orange
    lightAbsorption: 0.0,  // Transparent to light
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/glowstone.png',
    inventorySlot: 8,
    categorySlot: 1
  },

  {
    id: 13,  // BlockType.redstone_lamp
    name: 'Redstone Lamp',
    category: BlockCategory.ILLUMINATION,
    textures: 'redstone_lamp_on.png',
    transparent: false,
    emissive: { r: 15, g: 4, b: 4 },  // Red glow
    lightAbsorption: 0.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/redstone-lamp.png',
    inventorySlot: 9,
    categorySlot: 2
  }
]
```

**Verification:**
```bash
npm run build
```

---

## Task 1.7: Create Metal Block Definitions

**File:** `/src/blocks/definitions/metals.ts` (NEW)

```typescript
import { BlockDefinition, BlockCategory } from '../types'

export const METAL_BLOCKS: BlockDefinition[] = [
  {
    id: 8,  // BlockType.diamond
    name: 'Diamond Block',
    category: BlockCategory.METALS,
    textures: 'diamond_block.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/diamond.png',
    inventorySlot: 5,
    categorySlot: 1
  },

  {
    id: 9,  // BlockType.quartz
    name: 'Quartz Block',
    category: BlockCategory.METALS,
    textures: 'quartz_block_side.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/quartz.png',
    inventorySlot: 6,
    categorySlot: 2
  }
]
```

**Verification:**
```bash
npm run build
```

---

## Task 1.8: Create Transparent Block Definitions

**File:** `/src/blocks/definitions/transparent.ts` (NEW)

```typescript
import { BlockDefinition, BlockCategory } from '../types'

export const TRANSPARENT_BLOCKS: BlockDefinition[] = [
  {
    id: 10,  // BlockType.glass
    name: 'Glass',
    category: BlockCategory.TRANSPARENT,
    textures: 'glass.png',
    transparent: true,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.0,  // Glass is fully transparent to light
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/glass.png',
    inventorySlot: 7,
    categorySlot: 2
  }
]
```

**Verification:**
```bash
npm run build
```

---

## Task 1.9: Initialize Registry with All Existing Blocks

**File:** `/src/blocks/index.ts` (NEW)

**Create this exact file:**

```typescript
import { blockRegistry } from './BlockRegistry'
import { GROUND_BLOCKS } from './definitions/ground'
import { STONE_BLOCKS } from './definitions/stone'
import { WOOD_BLOCKS } from './definitions/wood'
import { ILLUMINATION_BLOCKS } from './definitions/illumination'
import { METAL_BLOCKS } from './definitions/metals'
import { TRANSPARENT_BLOCKS } from './definitions/transparent'

/**
 * Initialize block registry with all block definitions
 * Call this once at application startup
 */
export function initializeBlockRegistry(): void {
  // Register all block types
  blockRegistry.registerAll([
    ...GROUND_BLOCKS,
    ...STONE_BLOCKS,
    ...WOOD_BLOCKS,
    ...ILLUMINATION_BLOCKS,
    ...METAL_BLOCKS,
    ...TRANSPARENT_BLOCKS
  ])

  console.log(`✅ BlockRegistry initialized with ${blockRegistry.size()} blocks`)
}

// Re-export for convenience
export { blockRegistry } from './BlockRegistry'
export * from './types'
```

**Verification:**
```bash
npm run build
```

---

## Task 1.10: Wire Up Registry in Main

**File:** `/src/main.ts`

**Find this code** (around line 10):
```typescript
import './style.css'

// Initialize InputManager
const inputManager = new InputManager()
```

**Add above it:**
```typescript
import './style.css'

// Initialize BlockRegistry
import { initializeBlockRegistry } from './blocks'
initializeBlockRegistry()

// Initialize InputManager
const inputManager = new InputManager()
```

**Verification:**
```bash
npm run dev
# Open browser console, should see:
# "✅ BlockRegistry initialized with 14 blocks"
```

---

## Task 1.11: Add Registry Query Test

**File:** `/src/main.ts` (temporary test code)

**After `initializeBlockRegistry()`, add:**

```typescript
// TEMPORARY: Test registry queries
import { blockRegistry, BlockCategory } from './blocks'

console.log('🧪 Testing BlockRegistry:')
console.log('  Glowstone:', blockRegistry.get(12))
console.log('  Ground blocks:', blockRegistry.getByCategory(BlockCategory.GROUND).map(b => b.name))
console.log('  Inventory blocks:', blockRegistry.getInventoryBlocks().map(b => b.name))
console.log('  Material creation:', blockRegistry.createMaterial(0))  // Grass material
```

**Verification:**
1. Run `npm run dev`
2. Open browser console
3. Should see:
   ```
   ✅ BlockRegistry initialized with 14 blocks
   🧪 Testing BlockRegistry:
     Glowstone: {id: 12, name: "Glowstone", ...}
     Ground blocks: ["Grass Block", "Sand", "Dirt"]
     Inventory blocks: ["Grass Block", "Stone", "Oak Log", ...]
     Material creation: MeshStandardMaterial {map: Texture, ...}
   ```
4. Game should run normally (registry exists but not used yet)
5. **Delete the test code after verification**

**Expected Output:** Registry working, game unchanged.

---

## Phase 1 Complete: Verification Checklist

Before proceeding to Phase 2, verify:

- [ ] BlockRegistry.ts compiles without errors
- [ ] All 7 definition files created
- [ ] Console shows "✅ BlockRegistry initialized with 14 blocks"
- [ ] Can query blocks by ID, category, inventory slot
- [ ] Materials can be created from registry
- [ ] **Game runs exactly as before (no visual changes)**
- [ ] No console errors
- [ ] 60fps maintained

**If all checks pass:** BlockRegistry foundation complete! Safe to proceed to Phase 2.

---

# PHASE 2: Material System Migration

**Goal:** Replace hardcoded materials with registry-generated materials
**Duration:** 3-5 days
**Risk:** Low (1:1 replacement)

---

## Task 2.1: Backup Current Materials

**File:** `/src/terrain/mesh/materials.ts`

**Before modifying, create backup:**

```bash
cp /Users/dblspeak/projects/kingdom-builder/src/terrain/mesh/materials.ts /Users/dblspeak/projects/kingdom-builder/src/terrain/mesh/materials.ts.backup
```

**Purpose:** Safety net if something goes wrong.

---

## Task 2.2: Replace Material Array with Registry

**File:** `/src/terrain/mesh/materials.ts`

**Current code** (lines 80-132):
```typescript
export const materials = [
  new THREE.MeshStandardMaterial({...}),  // grass (multi-face)
  new THREE.MeshStandardMaterial({...}),  // sand
  new THREE.MeshStandardMaterial({...}),  // tree (multi-face)
  // ... 14 entries total
]
```

**Replace entire file with:**

```typescript
import * as THREE from 'three'
import { blockRegistry } from '../blocks'
import { BlockType } from '../terrain'

/**
 * Create all block materials from BlockRegistry
 * Replaces hardcoded material definitions
 */
export function createMaterials(): (THREE.Material | THREE.Material[])[] {
  const materials: (THREE.Material | THREE.Material[])[] = []

  // Create material for each BlockType in order
  for (let i = 0; i <= 13; i++) {  // BlockType 0-13
    const material = blockRegistry.createMaterial(i)
    if (!material) {
      console.error(`❌ Failed to create material for block ${i}`)
      materials.push(new THREE.MeshStandardMaterial({ color: 0xff00ff }))  // Magenta fallback
    } else {
      materials.push(material)
    }
  }

  console.log(`✅ Created ${materials.length} materials from BlockRegistry`)
  return materials
}

// Export as array for backwards compatibility
export const materials = createMaterials()
```

**Verification:**
```bash
npm run dev
# Console should show:
# "✅ Created 14 materials from BlockRegistry"
```

---

## Task 2.3: Visual Regression Testing

**Test each block type visually:**

1. **Open game** (http://localhost:3000)
2. **Click Play**
3. **Test inventory blocks 1-9:**
   - Select each with number keys
   - Place blocks
   - Verify textures look correct
4. **Specific tests:**
   - **Grass (1)**: Check top is green, sides are brown/green
   - **Stone (2)**: Check gray texture
   - **Oak Log (3)**: Check bark texture, ring on top/bottom
   - **Oak Planks (4)**: Check plank texture
   - **Diamond (5)**: Check cyan texture
   - **Quartz (6)**: Check white texture
   - **Glass (7)**: Check transparency works
   - **Glowstone (8)**: Check it glows yellow
   - **Redstone Lamp (9)**: Check it glows red

**Screenshot each block type** and compare to pre-migration screenshots.

**Expected:** Pixel-perfect identical visuals.

---

## Task 2.4: Test Multi-Face Materials

**Specific test for grass and logs:**

1. Place grass block
2. **Top face** should show `grass_top_green.png` (green)
3. **Side faces** should show `grass_block_side.png` (brown with green stripe)
4. **Bottom face** should show `dirt.png` (brown)

5. Place oak log
6. **Top/bottom** should show rings (`oak_log_top.png`)
7. **Sides** should show bark (`oak_log.png`)

**If faces are wrong:** Check texture array order in ground.ts and wood.ts.

---

## Task 2.5: Test Transparency

**Glass and leaves must render correctly:**

1. Place glass block in front of another block
2. **Should see through glass** to block behind
3. Place oak leaves
4. **Should see through leaves** (semi-transparent)

**If transparency broken:**
- Check `transparent: true` in definitions
- Check material.transparent property

---

## Task 2.6: Test Emissive Materials

**Glowstone and redstone lamp should glow:**

1. Place glowstone
2. **Should have warm yellow glow** (visible in dark areas)
3. Place redstone lamp
4. **Should have red glow**

**If glow missing:**
- Check emissive RGB values in definitions
- Check emissiveIntensity in createMaterial()

---

## Task 2.7: Delete Old Material Code

**Only do this after ALL tests pass!**

**File:** `/src/terrain/mesh/materials.ts.backup`

```bash
# If everything works, delete backup
rm /Users/dblspeak/projects/kingdom-builder/src/terrain/mesh/materials.ts.backup

# Commit the changes
git add src/terrain/mesh/materials.ts src/blocks/
git commit -m "Migrate material creation to BlockRegistry

- Replace 132 lines of hardcoded materials with registry
- All 14 blocks now defined in centralized definitions
- Materials auto-generated from BlockDefinition properties
- Zero visual changes, tested all blocks
- Foundation for easy block additions"
```

---

## Phase 2 Complete: Verification Checklist

- [ ] All 14 block types visually identical to before
- [ ] Grass has correct multi-face textures (green top, brown sides)
- [ ] Oak logs have rings on top/bottom, bark on sides
- [ ] Glass and leaves are transparent
- [ ] Glowstone glows yellow
- [ ] Redstone lamp glows red
- [ ] No console errors
- [ ] 60fps maintained
- [ ] materials.ts reduced from 132 to ~30 lines

**If all checks pass:** Material migration complete! Registry now controls materials.

---

# PHASE 3: Chunk System & Light Storage

**Goal:** Add light storage to chunks (data exists but not used)
**Duration:** 5-7 days
**Risk:** Low (additive only)

---

## Task 3.1: Create Chunk Class

**File:** `/src/terrain/Chunk.ts` (NEW)

```typescript
/**
 * Chunk - 24×256×24 section of terrain with light data
 */
export class Chunk {
  x: number  // Chunk X coordinate
  z: number  // Chunk Z coordinate
  size: number = 24  // Blocks per side
  height: number = 256  // Max height

  // Light data storage
  // 6 arrays: sky RGB + block RGB
  // Each array: size × height × size = 24 × 256 × 24 = 147,456 bytes
  skyLightR: Uint8Array
  skyLightG: Uint8Array
  skyLightB: Uint8Array
  blockLightR: Uint8Array
  blockLightG: Uint8Array
  blockLightB: Uint8Array

  dirty: boolean = false  // Needs GPU texture update

  constructor(x: number, z: number) {
    this.x = x
    this.z = z

    const arraySize = this.size * this.height * this.size

    // Initialize with defaults
    // Sky light = 15 (full daylight)
    this.skyLightR = new Uint8Array(arraySize).fill(15)
    this.skyLightG = new Uint8Array(arraySize).fill(15)
    this.skyLightB = new Uint8Array(arraySize).fill(15)

    // Block light = 0 (no emission)
    this.blockLightR = new Uint8Array(arraySize)
    this.blockLightG = new Uint8Array(arraySize)
    this.blockLightB = new Uint8Array(arraySize)

    console.log(`📦 Chunk created at (${x}, ${z}) - ${(arraySize * 6 / 1024).toFixed(0)}KB`)
  }

  /**
   * Get light at local chunk coordinates
   */
  getLight(x: number, y: number, z: number): {
    sky: { r: number, g: number, b: number },
    block: { r: number, g: number, b: number }
  } {
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

  /**
   * Set light at local chunk coordinates
   */
  setLight(
    x: number,
    y: number,
    z: number,
    channel: 'sky' | 'block',
    color: { r: number, g: number, b: number }
  ): void {
    const index = this.getIndex(x, y, z)

    if (channel === 'sky') {
      this.skyLightR[index] = Math.max(0, Math.min(15, color.r))
      this.skyLightG[index] = Math.max(0, Math.min(15, color.g))
      this.skyLightB[index] = Math.max(0, Math.min(15, color.b))
    } else {
      this.blockLightR[index] = Math.max(0, Math.min(15, color.r))
      this.blockLightG[index] = Math.max(0, Math.min(15, color.g))
      this.blockLightB[index] = Math.max(0, Math.min(15, color.b))
    }

    this.dirty = true
  }

  /**
   * Convert local coordinates to array index
   */
  private getIndex(x: number, y: number, z: number): number {
    // Bounds check
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      console.warn(`⚠️ Out of bounds: (${x}, ${y}, ${z})`)
      return 0
    }

    return (z * this.height * this.size) + (y * this.size) + x
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    const arraySize = this.size * this.height * this.size
    return arraySize * 6  // 6 arrays
  }
}
```

**Verification:**
```bash
npm run build
# Should compile without errors
```

---

## Task 3.2: Create ChunkManager

**File:** `/src/terrain/ChunkManager.ts` (NEW)

```typescript
import { Chunk } from './Chunk'

/**
 * Manages chunk lifecycle and coordinate conversions
 */
export class ChunkManager {
  private chunks = new Map<string, Chunk>()
  private chunkSize: number = 24

  /**
   * Get or create chunk at chunk coordinates
   */
  getChunk(chunkX: number, chunkZ: number): Chunk {
    const key = `${chunkX},${chunkZ}`

    if (!this.chunks.has(key)) {
      const chunk = new Chunk(chunkX, chunkZ)
      this.chunks.set(key, chunk)
    }

    return this.chunks.get(key)!
  }

  /**
   * Convert world coordinates to chunk + local coordinates
   */
  worldToChunk(x: number, y: number, z: number): {
    chunkX: number
    chunkZ: number
    localX: number
    localY: number
    localZ: number
  } {
    const chunkX = Math.floor(x / this.chunkSize)
    const chunkZ = Math.floor(z / this.chunkSize)

    const localX = x - chunkX * this.chunkSize
    const localY = y
    const localZ = z - chunkZ * this.chunkSize

    return { chunkX, chunkZ, localX, localY, localZ }
  }

  /**
   * Get light at world coordinates
   */
  getLightAt(x: number, y: number, z: number): {
    sky: { r: number, g: number, b: number },
    block: { r: number, g: number, b: number }
  } {
    const { chunkX, chunkZ, localX, localY, localZ } = this.worldToChunk(x, y, z)
    const chunk = this.getChunk(chunkX, chunkZ)
    return chunk.getLight(localX, localY, localZ)
  }

  /**
   * Set light at world coordinates
   */
  setLightAt(
    x: number,
    y: number,
    z: number,
    channel: 'sky' | 'block',
    color: { r: number, g: number, b: number }
  ): void {
    const { chunkX, chunkZ, localX, localY, localZ } = this.worldToChunk(x, y, z)
    const chunk = this.getChunk(chunkX, chunkZ)
    chunk.setLight(localX, localY, localZ, channel, color)
  }

  /**
   * Get all loaded chunks
   */
  getAllChunks(): Chunk[] {
    return Array.from(this.chunks.values())
  }

  /**
   * Get total memory usage
   */
  getTotalMemoryUsage(): number {
    return this.getAllChunks().reduce((total, chunk) => total + chunk.getMemoryUsage(), 0)
  }

  /**
   * Unload chunks far from player (future optimization)
   */
  unloadDistantChunks(playerX: number, playerZ: number, maxDistance: number): void {
    // TODO: Implement chunk unloading
  }
}
```

**Verification:**
```bash
npm run build
```

---

## Task 3.3: Integrate ChunkManager with Terrain

**File:** `/src/terrain/index.ts`

**Find the Terrain class constructor** (around line 94):

```typescript
export default class Terrain {
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene
    this.camera = camera
    this.noise = new Noise()
```

**Add after `this.noise = new Noise()`:**

```typescript
    this.chunkManager = new ChunkManager()
    console.log('✅ ChunkManager initialized')
```

**Add property to class** (around line 106):

```typescript
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  distance: number
  noise: Noise
  chunkManager: ChunkManager  // NEW
```

**Add import at top:**

```typescript
import { ChunkManager } from './ChunkManager'
```

**Verification:**
```bash
npm run dev
# Console should show:
# "✅ ChunkManager initialized"
```

---

## Task 3.4: Test Light Storage

**File:** `/src/main.ts` (temporary test)

**After terrain initialization, add:**

```typescript
// TEMPORARY: Test chunk light storage
console.log('🧪 Testing ChunkManager light storage:')

// Set light at world position (10, 50, 10)
terrain.chunkManager.setLightAt(10, 50, 10, 'block', { r: 15, g: 0, b: 0 })  // Red light

// Read it back
const light = terrain.chunkManager.getLightAt(10, 50, 10)
console.log('  Block light at (10,50,10):', light.block)  // Should be {r: 15, g: 0, b: 0}

// Check memory usage
const memoryKB = terrain.chunkManager.getTotalMemoryUsage() / 1024
console.log(`  Total chunk memory: ${memoryKB.toFixed(0)}KB`)
```

**Verification:**
1. Run `npm run dev`
2. Console should show:
   ```
   🧪 Testing ChunkManager light storage:
     Block light at (10,50,10): {r: 15, g: 0, b: 0}
     Total chunk memory: 432KB
   ```
3. Memory usage should be ~400-600KB per chunk
4. Game should still run at 60fps
5. **Delete test code after verification**

---

## Task 3.5: Add Chunk Debug Command

**File:** `/src/ui/index.ts`

**Find the keyboard handler** (around line 187):

```typescript
    document.body.addEventListener('keydown', (e: KeyboardEvent) => {
```

**Add before the Cmd+B handler:**

```typescript
      // Cmd+L or Ctrl+L: Log chunk information
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        const pos = terrain.camera.position
        const { chunkX, chunkZ, localX, localY, localZ } = terrain.chunkManager.worldToChunk(
          Math.floor(pos.x),
          Math.floor(pos.y),
          Math.floor(pos.z)
        )
        console.log('📍 Player chunk info:')
        console.log(`  World: (${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)})`)
        console.log(`  Chunk: (${chunkX}, ${chunkZ})`)
        console.log(`  Local: (${localX}, ${localY}, ${localZ})`)

        const light = terrain.chunkManager.getLightAt(
          Math.floor(pos.x),
          Math.floor(pos.y),
          Math.floor(pos.z)
        )
        console.log(`  Sky light: R${light.sky.r} G${light.sky.g} B${light.sky.b}`)
        console.log(`  Block light: R${light.block.r} G${light.block.g} B${light.block.b}`)

        const totalMemory = terrain.chunkManager.getTotalMemoryUsage()
        console.log(`  Total chunks: ${terrain.chunkManager.getAllChunks().length}`)
        console.log(`  Memory: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`)
      }
```

**Verification:**
1. Run game
2. Press **Cmd+L** (or Ctrl+L)
3. Console should show your current position and light data
4. Useful for debugging in later phases

---

## Phase 3 Complete: Verification Checklist

- [ ] Chunk.ts created and compiles
- [ ] ChunkManager.ts created and compiles
- [ ] ChunkManager integrated into Terrain class
- [ ] Can store and retrieve light at any world position
- [ ] Memory usage ~400-600KB per chunk
- [ ] Cmd+L debug command shows chunk info
- [ ] Game still runs at 60fps
- [ ] No visual changes (light data exists but not rendered)

**If all checks pass:** Chunk system ready for lighting engine!

---

# PHASE 4: Lighting Engine Core

**Goal:** Implement light propagation algorithm
**Duration:** 7-10 days
**Risk:** Medium (complex algorithm)

---

## Task 4.1: Create Light Queue System

**File:** `/src/lighting/LightQueue.ts` (NEW)

```typescript
import { RGB } from '../blocks/types'

/**
 * Light update in the queue
 */
export interface LightUpdate {
  x: number
  y: number
  z: number
  channel: 'sky' | 'block'
  color: RGB
  priority: number  // Higher = process sooner
}

/**
 * Incremental light update queue
 * Processes updates with fixed time budget per frame
 */
export class LightQueue {
  private queue: LightUpdate[] = []
  private blocksPerFrame = 100  // Start conservative
  private frameBudget = 2.0  // milliseconds

  /**
   * Add light update to queue
   */
  add(update: LightUpdate): void {
    this.queue.push(update)

    // Sort by priority (high to low)
    this.queue.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Add multiple updates at once
   */
  addBatch(updates: LightUpdate[]): void {
    this.queue.push(...updates)
    this.queue.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Process queued updates within time budget
   * Call this every frame
   */
  update(processor: (update: LightUpdate) => void): number {
    if (this.queue.length === 0) return 0

    const startTime = performance.now()
    let processed = 0

    while (this.queue.length > 0 && performance.now() - startTime < this.frameBudget) {
      const update = this.queue.shift()
      if (update) {
        processor(update)
        processed++
      }
    }

    return processed
  }

  /**
   * Get queue status
   */
  getStatus(): { queued: number, budget: number } {
    return {
      queued: this.queue.length,
      budget: this.frameBudget
    }
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = []
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0
  }
}
```

**Verification:**
```bash
npm run build
```

---

## Task 4.2: Create Lighting Engine Foundation

**File:** `/src/lighting/LightingEngine.ts` (NEW)

```typescript
import { ChunkManager } from '../terrain/ChunkManager'
import { blockRegistry } from '../blocks'
import { RGB } from '../blocks/types'
import { LightQueue, LightUpdate } from './LightQueue'

/**
 * 6 directions for light propagation
 */
const DIRECTIONS = [
  { x: 1, y: 0, z: 0 },   // +X
  { x: -1, y: 0, z: 0 },  // -X
  { x: 0, y: 1, z: 0 },   // +Y
  { x: 0, y: -1, z: 0 },  // -Y
  { x: 0, y: 0, z: 1 },   // +Z
  { x: 0, y: 0, z: -1 }   // -Z
]

/**
 * Core lighting engine
 * Implements flood-fill light propagation
 */
export class LightingEngine {
  private chunkManager: ChunkManager
  private lightQueue: LightQueue
  private getBlockType: (x: number, y: number, z: number) => number  // Callback to get block at position

  constructor(
    chunkManager: ChunkManager,
    getBlockTypeFn: (x: number, y: number, z: number) => number
  ) {
    this.chunkManager = chunkManager
    this.lightQueue = new LightQueue()
    this.getBlockType = getBlockTypeFn

    console.log('✅ LightingEngine initialized')
  }

  /**
   * Update lighting (call every frame)
   */
  update(): void {
    const processed = this.lightQueue.update((update) => {
      this.processLightUpdate(update)
    })

    if (processed > 0) {
      // console.log(`💡 Processed ${processed} light updates`)
    }
  }

  /**
   * Process a single light update
   */
  private processLightUpdate(update: LightUpdate): void {
    // Get current light at this position
    const current = this.chunkManager.getLightAt(update.x, update.y, update.z)
    const currentChannel = update.channel === 'sky' ? current.sky : current.block

    // Check if this update is brighter
    if (!this.isBrighter(update.color, currentChannel)) {
      return  // Don't propagate dimmer light
    }

    // Set new light value
    this.chunkManager.setLightAt(update.x, update.y, update.z, update.channel, update.color)

    // Propagate to neighbors
    this.propagateToNeighbors(update.x, update.y, update.z, update.color, update.channel)
  }

  /**
   * Propagate light to 6 neighbors
   */
  private propagateToNeighbors(
    x: number,
    y: number,
    z: number,
    color: RGB,
    channel: 'sky' | 'block'
  ): void {
    for (const dir of DIRECTIONS) {
      const nx = x + dir.x
      const ny = y + dir.y
      const nz = z + dir.z

      // Get block at neighbor position
      const blockType = this.getBlockType(nx, ny, nz)
      if (blockType === -1) continue  // Out of bounds

      const blockDef = blockRegistry.get(blockType)
      if (!blockDef) continue

      // Calculate light reduction
      const absorption = blockDef.lightAbsorption  // 0.0 to 1.0
      const newColor: RGB = {
        r: Math.floor(color.r * (1 - absorption)) - 1,
        g: Math.floor(color.g * (1 - absorption)) - 1,
        b: Math.floor(color.b * (1 - absorption)) - 1
      }

      // Stop if too dim
      if (newColor.r <= 0 && newColor.g <= 0 && newColor.b <= 0) continue

      // Queue update for neighbor
      this.lightQueue.add({
        x: nx,
        y: ny,
        z: nz,
        channel,
        color: newColor,
        priority: 1
      })
    }
  }

  /**
   * Check if color A is brighter than color B
   */
  private isBrighter(a: RGB, b: RGB): boolean {
    const brightnessA = a.r + a.g + a.b
    const brightnessB = b.r + b.g + b.b
    return brightnessA > brightnessB
  }

  /**
   * Add light source (glowstone, torch, etc.)
   */
  addLightSource(x: number, y: number, z: number, color: RGB): void {
    console.log(`💡 Adding light source at (${x}, ${y}, ${z}): R${color.r} G${color.g} B${color.b}`)

    this.lightQueue.add({
      x, y, z,
      channel: 'block',
      color,
      priority: 10  // High priority
    })
  }

  /**
   * Remove light source
   */
  removeLightSource(x: number, y: number, z: number): void {
    console.log(`🔦 Removing light source at (${x}, ${y}, ${z})`)

    // Set to zero
    this.chunkManager.setLightAt(x, y, z, 'block', { r: 0, g: 0, b: 0 })

    // TODO: Recalculate light from neighboring sources
    // For now, just clearing is acceptable
  }

  /**
   * Update sky light level (sunrise/sunset)
   */
  updateSkyLight(level: number): void {
    console.log(`☀️ Updating sky light to level ${level}`)

    // TODO: Queue all exposed blocks
    // For now, just log
  }

  /**
   * Get queue status
   */
  getStatus(): { queued: number } {
    return this.lightQueue.getStatus()
  }
}
```

**Verification:**
```bash
npm run build
```

---

## Task 4.3: Integrate LightingEngine with Terrain

**File:** `/src/terrain/index.ts`

**In constructor, after ChunkManager:**

```typescript
    this.chunkManager = new ChunkManager()
    console.log('✅ ChunkManager initialized')

    // Initialize lighting engine
    this.lightingEngine = new LightingEngine(
      this.chunkManager,
      (x, y, z) => this.getBlockTypeAt(x, y, z)  // Callback
    )
```

**Add property:**

```typescript
  chunkManager: ChunkManager
  lightingEngine: LightingEngine  // NEW
```

**Add import:**

```typescript
import { LightingEngine } from '../lighting/LightingEngine'
```

**Add helper method to get block type:**

```typescript
  /**
   * Get block type at world coordinates
   * Returns -1 if out of bounds
   */
  getBlockTypeAt(x: number, y: number, z: number): number {
    // Check customBlocks first (player-placed)
    const custom = this.customBlocks.find(b =>
      Math.floor(b.x) === Math.floor(x) &&
      Math.floor(b.y) === Math.floor(y) &&
      Math.floor(b.z) === Math.floor(z)
    )

    if (custom) {
      return custom.placed ? custom.type : -1  // Return type if placed, -1 if removed
    }

    // Check generated terrain
    // For now, use noise to approximate
    // This will be more accurate in future
    const height = 30 + this.noise.get(x / this.noise.gap, z / this.noise.gap) * this.noise.amp

    if (y > height) return -1  // Air
    if (y === Math.floor(height)) return 0  // Grass (surface)
    if (y < height) return 5  // Stone (underground)

    return -1
  }
```

**Verification:**
```bash
npm run dev
# Console: "✅ LightingEngine initialized"
```

---

## Task 4.4: Hook Light Updates to Block Placement

**File:** `/src/terrain/index.ts`

**Find `buildBlock()` method** (around line 257):

**At the end of the method, add:**

```typescript
    // Trigger light update if block emits light
    const blockDef = blockRegistry.get(type)
    if (blockDef && (blockDef.emissive.r > 0 || blockDef.emissive.g > 0 || blockDef.emissive.b > 0)) {
      this.lightingEngine.addLightSource(
        Math.floor(x),
        Math.floor(y),
        Math.floor(z),
        blockDef.emissive
      )
    }
```

**Add import:**

```typescript
import { blockRegistry } from '../blocks'
```

**Verification:**
1. Run game
2. Place glowstone (slot 8)
3. Console should show:
   ```
   💡 Adding light source at (x, y, z): R15 G13 B8
   ```
4. No errors

---

## Task 4.5: Add Lighting Update to Game Loop

**File:** `/src/main.ts`

**Find the animation loop** (around line 33):

```typescript
;(function animate() {
  requestAnimationFrame(animate)

  control.update()
  terrain.update()
  ui.update()
  timeOfDay.update()

  renderer.render(scene, camera)
})()
```

**Add lighting update:**

```typescript
;(function animate() {
  requestAnimationFrame(animate)

  control.update()
  terrain.update()
  ui.update()
  timeOfDay.update()
  terrain.lightingEngine.update()  // NEW: Process light queue

  renderer.render(scene, camera)
})()
```

**Verification:**
```bash
npm run dev
# No errors, game runs normally
```

---

## Task 4.6: Test Light Propagation (Console Only)

**Test manually:**

1. Run game, place glowstone at position (10, 50, 10)
2. Console shows: `💡 Adding light source at (10, 50, 10): R15 G13 B8`
3. Wait 1 second (let queue process)
4. Press **Cmd+L** to check light at current position
5. Move away from glowstone
6. Press **Cmd+L** again - light should be dimmer

**Expected console output:**
```
Position (10, 50, 10): Block light: R15 G13 B8  (at source)
Position (11, 50, 10): Block light: R14 G12 B7  (1 block away)
Position (15, 50, 10): Block light: R10 G8 B3   (5 blocks away)
Position (25, 50, 10): Block light: R0 G0 B0    (15 blocks away, faded out)
```

**If light doesn't propagate:**
- Check console for errors
- Verify getBlockTypeAt() returns valid types
- Add debug logging to processLightUpdate()

---

## Task 4.7: Optimize Propagation Performance

**File:** `/src/lighting/LightingEngine.ts`

**Add visited set to prevent duplicate processing:**

```typescript
export class LightingEngine {
  private visited = new Set<string>()  // Add this property

  /**
   * Clear visited set each frame
   */
  update(): void {
    this.visited.clear()  // Reset each frame

    const processed = this.lightQueue.update((update) => {
      const key = `${update.x},${update.y},${update.z},${update.channel}`
      if (this.visited.has(key)) return  // Skip if already processed
      this.visited.add(key)

      this.processLightUpdate(update)
    })
  }
}
```

**Verification:**
- Place glowstone
- Check FPS (should stay 60fps)
- Console log processed count (should be <1000 blocks)

---

## Phase 4 Complete: Verification Checklist

- [ ] LightQueue.ts created and compiles
- [ ] LightingEngine.ts created with flood-fill algorithm
- [ ] Lighting engine integrated into terrain
- [ ] update() called every frame
- [ ] Place glowstone → console shows light source added
- [ ] Light propagates to neighbors (verify with Cmd+L)
- [ ] Light diminishes with distance (15 → 14 → 13 ... → 0)
- [ ] 60fps maintained during light updates
- [ ] No memory leaks (check Task Manager after 5 minutes)

**If all checks pass:** Light propagation working! Ready for visual integration.

---

# PHASE 5: Shader Integration (Visual!)

**Goal:** Make lighting visible in-game
**Duration:** 7-10 days
**Risk:** High (shader debugging is difficult)

---

## Task 5.1: Create Light Shader Module

**File:** `/src/lighting/LightShader.ts` (NEW)

```typescript
import * as THREE from 'three'
import { ChunkManager } from '../terrain/ChunkManager'

/**
 * Custom shader for applying lighting to blocks
 */
export function createLightShader(
  baseMaterial: THREE.MeshStandardMaterial,
  chunkManager: ChunkManager
): THREE.MeshStandardMaterial {

  baseMaterial.onBeforeCompile = (shader) => {
    // Add uniforms for light data
    shader.uniforms.chunkOffset = { value: new THREE.Vector3(0, 0, 0) }
    shader.uniforms.useBlockLighting = { value: 1.0 }  // Toggle for debugging

    // Inject light calculation into fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `
      #include <lights_fragment_begin>

      // Get block world position
      vec3 blockPos = floor(vWorldPosition);

      // TODO: Sample light data from texture
      // For now, use placeholder values for testing
      vec3 skyLight = vec3(1.0, 1.0, 1.0);    // Full daylight
      vec3 blockLight = vec3(0.0, 0.0, 0.0);  // No block light yet

      // Combine channels (max of both)
      vec3 finalLight = max(skyLight, blockLight);

      // Apply to diffuse color
      // Multiply base color by light level
      diffuseColor.rgb *= finalLight * useBlockLighting;
      `
    )

    // Store shader reference for updates
    baseMaterial.userData.customShader = shader
  }

  return baseMaterial
}
```

**Verification:**
```bash
npm run build
```

---

## Task 5.2: Apply Shader to Materials

**File:** `/src/terrain/mesh/materials.ts`

**Modify createMaterials() function:**

```typescript
import { createLightShader } from '../../lighting/LightShader'

export function createMaterials(chunkManager: ChunkManager): (THREE.Material | THREE.Material[])[] {
  const materials: (THREE.Material | THREE.Material[])[] = []

  for (let i = 0; i <= 13; i++) {
    let material = blockRegistry.createMaterial(i)

    if (!material) {
      materials.push(new THREE.MeshStandardMaterial({ color: 0xff00ff }))
      continue
    }

    // Apply lighting shader
    if (Array.isArray(material)) {
      // Multi-face materials
      material = material.map(mat => createLightShader(mat as THREE.MeshStandardMaterial, chunkManager))
    } else {
      material = createLightShader(material as THREE.MeshStandardMaterial, chunkManager)
    }

    materials.push(material)
  }

  console.log(`✅ Created ${materials.length} materials with lighting shaders`)
  return materials
}

// Update export
export function initializeMaterials(chunkManager: ChunkManager) {
  return createMaterials(chunkManager)
}
```

**File:** `/src/terrain/index.ts`

**Update material initialization** (around line 150):

```typescript
  initBlocks = () => {
    const materials = initializeMaterials(this.chunkManager)  // Pass chunkManager
```

**Verification:**
```bash
npm run dev
# Console: "✅ Created 14 materials with lighting shaders"
# Blocks should still look normal (shader using placeholder 1.0 light)
```

---

## Task 5.3: Create DataTexture for Light Data

**File:** `/src/lighting/LightDataTexture.ts` (NEW)

```typescript
import * as THREE from 'three'
import { Chunk } from '../terrain/Chunk'

/**
 * GPU texture containing chunk light data
 * Format: RGB (3 bytes per pixel)
 */
export class LightDataTexture {
  private texture: THREE.DataTexture
  private data: Uint8Array
  private width: number
  private height: number
  private depth: number

  constructor(chunkSize: number = 24, chunkHeight: number = 256) {
    this.width = chunkSize
    this.height = chunkHeight
    this.depth = chunkSize

    // Create 3D texture data (flattened)
    // Each block = 6 bytes (sky RGB + block RGB)
    const size = this.width * this.height * this.depth * 6
    this.data = new Uint8Array(size)

    // Initialize texture
    this.texture = new THREE.DataTexture(
      this.data,
      this.width * this.depth,  // Width includes depth dimension
      this.height,
      THREE.RGBFormat,
      THREE.UnsignedByteType
    )

    this.texture.needsUpdate = true
    console.log(`📊 LightDataTexture created: ${(size / 1024).toFixed(0)}KB`)
  }

  /**
   * Update texture from chunk data
   */
  updateFromChunk(chunk: Chunk): void {
    if (!chunk.dirty) return  // Skip if no changes

    const size = chunk.size
    const height = chunk.height

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < size; x++) {
          const light = chunk.getLight(x, y, z)

          // Calculate index in flattened texture
          const index = (z * height * size + y * size + x) * 6

          // Pack sky RGB
          this.data[index] = light.sky.r
          this.data[index + 1] = light.sky.g
          this.data[index + 2] = light.sky.b

          // Pack block RGB
          this.data[index + 3] = light.block.r
          this.data[index + 4] = light.block.g
          this.data[index + 5] = light.block.b
        }
      }
    }

    this.texture.needsUpdate = true
    chunk.dirty = false
  }

  /**
   * Get Three.js texture for shader
   */
  getTexture(): THREE.DataTexture {
    return this.texture
  }
}
```

**Verification:**
```bash
npm run build
```

---

## Task 5.4: Wire DataTexture to Shader

**File:** `/src/lighting/LightShader.ts`

**Update shader to actually sample light data:**

```typescript
export function createLightShader(
  baseMaterial: THREE.MeshStandardMaterial,
  lightTexture: THREE.DataTexture
): THREE.MeshStandardMaterial {

  baseMaterial.onBeforeCompile = (shader) => {
    // Add uniforms
    shader.uniforms.lightDataTexture = { value: lightTexture }
    shader.uniforms.chunkSize = { value: 24.0 }

    // Inject into fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      `
      #include <lights_fragment_begin>

      // Sample light data
      vec3 blockPos = floor(vWorldPosition);

      // Convert world pos to texture UV
      vec2 uv = vec2(
        (mod(blockPos.x, chunkSize) + mod(blockPos.z, chunkSize) * chunkSize) / (chunkSize * chunkSize),
        mod(blockPos.y, 256.0) / 256.0
      );

      // Sample texture (6 bytes per block)
      vec3 skyRGB = texture2D(lightDataTexture, uv).rgb / 15.0;
      vec3 blockRGB = texture2D(lightDataTexture, uv + vec2(0.5, 0.0)).rgb / 15.0;

      // Combine (take max like Minecraft)
      vec3 finalLight = max(skyRGB, blockRGB);

      // Apply to diffuse color
      diffuseColor.rgb *= max(finalLight, vec3(0.05));  // Minimum 5% visibility
      `
    )
  }

  return baseMaterial
}
```

**Verification:**
```bash
npm run build
# May have shader errors - will debug in next task
```

---

## Task 5.5: Test Shader Compilation

**File:** `/src/main.ts` (temporary test)

**Add after game initialization:**

```typescript
// TEMPORARY: Test shader compilation
console.log('🧪 Testing shader compilation...')

setTimeout(() => {
  const testMaterial = terrain.blocks[0]?.material
  if (testMaterial && (testMaterial as any).userData.customShader) {
    console.log('✅ Custom shader compiled successfully')
  } else {
    console.error('❌ Custom shader not found')
  }
}, 2000)  // Wait for materials to compile
```

**Verification:**
1. Run game
2. Wait 2 seconds
3. Console should show: "✅ Custom shader compiled successfully"
4. Check for WebGL errors in console
5. If errors: Check shader syntax carefully

---

## Task 5.6: Debug Shader Visual Output

**Create toggle to see shader effect:**

**File:** `/src/ui/index.ts`

**Add debug key** (Cmd+Shift+L):

```typescript
      // Cmd+Shift+L: Toggle lighting shader (debug)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        // TODO: Toggle shader uniform
        console.log('🔦 Lighting shader toggle (not implemented)')
      }
```

**Expected at this stage:**
- Blocks may appear very dark (shader is working but light data not fully wired)
- This is expected - we'll fix in next tasks

---

## Task 5.7: Fix Shader UV Mapping

**This task requires careful tuning based on visual results.**

**Common issues:**
- Blocks all black → Light texture not uploading correctly
- Blocks flickering → UV coordinates wrong
- Blocks pink/magenta → Shader compile error

**Debug steps:**
1. Add console.log in shader to verify it's running
2. Output light values as color to see if sampling works
3. Verify texture dimensions match chunk size

**File to modify:** `/src/lighting/LightShader.ts`

**Add debug output:**

```glsl
// Replace finalLight application with debug visualization:
diffuseColor.rgb = vec3(skyRGB.r, 0.0, 0.0);  // Show just red channel
```

This will visualize sky light red channel. Adjust until blocks brighten/darken correctly.

---

## Phase 5 Complete: Verification Checklist

- [ ] Custom shader compiles without WebGL errors
- [ ] LightDataTexture created and uploading to GPU
- [ ] Blocks visibly darken away from light sources
- [ ] Place glowstone → nearby blocks brighten (warm yellow tint)
- [ ] Light fades over ~15 blocks
- [ ] 60fps maintained
- [ ] No WebGL warnings in console

**If visual issues:** This is the hardest phase. Shader debugging may take extra time. Use debug visualizations and careful logging.

---

# PHASE 6: Add New Blocks

**Goal:** Add water, lava, dirt, sand, cobblestone, ice
**Duration:** 3-5 days
**Risk:** Low (registry makes this trivial)

---

## Task 6.1: Extend BlockType Enum

**File:** `/src/terrain/index.ts`

**Find BlockType enum** (lines 9-24):

```typescript
export enum BlockType {
  grass = 0,
  sand = 1,
  tree = 2,
  leaf = 3,
  dirt = 4,
  stone = 5,
  coal = 6,
  wood = 7,
  diamond = 8,
  quartz = 9,
  glass = 10,
  bedrock = 11,
  glowstone = 12,
  redstone_lamp = 13
}
```

**Add new types:**

```typescript
export enum BlockType {
  grass = 0,
  sand = 1,
  tree = 2,
  leaf = 3,
  dirt = 4,
  stone = 5,
  coal = 6,
  wood = 7,
  diamond = 8,
  quartz = 9,
  glass = 10,
  bedrock = 11,
  glowstone = 12,
  redstone_lamp = 13,
  // NEW BLOCKS:
  water = 14,
  lava = 15,
  cobblestone = 16,
  ice = 17,
  iron_ore = 18,
  gold_ore = 19
}
```

**Verification:**
```bash
npm run build
```

---

## Task 6.2: Create Fluid Block Definitions

**File:** `/src/blocks/definitions/fluids.ts` (NEW)

```typescript
import { BlockDefinition, BlockCategory } from '../types'
import { BlockType } from '../../terrain'

export const FLUID_BLOCKS: BlockDefinition[] = [
  {
    id: BlockType.water,
    name: 'Water',
    category: BlockCategory.FLUIDS,
    textures: 'water_still.png',
    transparent: true,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.3,  // Transmits 70% of light
    collidable: false,  // Can walk through
    friction: 0.5,  // Half speed movement
    icon: 'block-icon/water.png',
    inventorySlot: null,
    categorySlot: 1
  },

  {
    id: BlockType.lava,
    name: 'Lava',
    category: BlockCategory.FLUIDS,
    textures: 'lava_still.png',
    transparent: false,
    emissive: { r: 15, g: 6, b: 0 },  // Orange-red emission
    lightAbsorption: 0.2,
    collidable: false,  // Can walk through
    friction: 0.3,  // Very slow (30% speed)
    icon: 'block-icon/lava.png',
    inventorySlot: null,
    categorySlot: 2
  },

  {
    id: BlockType.ice,
    name: 'Ice',
    category: BlockCategory.TRANSPARENT,
    textures: 'ice.png',
    transparent: true,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 0.1,  // Very transparent
    collidable: true,
    friction: 1.5,  // Slippery (50% faster)
    icon: 'block-icon/ice.png',
    inventorySlot: null,
    categorySlot: 3
  }
]
```

**Verification:**
```bash
npm run build
```

---

## Task 6.3: Add New Stone Blocks

**File:** `/src/blocks/definitions/stone.ts`

**Add to existing STONE_BLOCKS array:**

```typescript
  {
    id: BlockType.cobblestone,
    name: 'Cobblestone',
    category: BlockCategory.STONE,
    textures: 'cobblestone.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/cobblestone.png',
    inventorySlot: null,
    categorySlot: 4
  },

  {
    id: BlockType.iron_ore,
    name: 'Iron Ore',
    category: BlockCategory.STONE,
    textures: 'iron_ore.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/iron.png',
    inventorySlot: null,
    categorySlot: 5
  },

  {
    id: BlockType.gold_ore,
    name: 'Gold Ore',
    category: BlockCategory.STONE,
    textures: 'gold_ore.png',
    transparent: false,
    emissive: { r: 0, g: 0, b: 0 },
    lightAbsorption: 1.0,
    collidable: true,
    friction: 1.0,
    icon: 'block-icon/gold.png',
    inventorySlot: null,
    categorySlot: 6
  }
```

---

## Task 6.4: Register New Blocks

**File:** `/src/blocks/index.ts`

**Add fluid blocks:**

```typescript
import { TRANSPARENT_BLOCKS } from './definitions/transparent'
import { FLUID_BLOCKS } from './definitions/fluids'  // NEW

export function initializeBlockRegistry(): void {
  blockRegistry.registerAll([
    ...GROUND_BLOCKS,
    ...STONE_BLOCKS,
    ...WOOD_BLOCKS,
    ...ILLUMINATION_BLOCKS,
    ...METAL_BLOCKS,
    ...TRANSPARENT_BLOCKS,
    ...FLUID_BLOCKS  // NEW
  ])
```

**Verification:**
```bash
npm run dev
# Console: "✅ BlockRegistry initialized with 20 blocks"
```

---

## Task 6.5: Update Material Array Size

**File:** `/src/terrain/mesh/materials.ts`

**Change loop:**

```typescript
export function createMaterials(chunkManager: ChunkManager) {
  const materials = []

  // Loop through all registered blocks
  const maxBlockId = Math.max(...blockRegistry.getAllBlocks().map(b => b.id))

  for (let i = 0; i <= maxBlockId; i++) {
    let material = blockRegistry.createMaterial(i)
    // ... rest of function
  }
}
```

**Verification:**
```bash
npm run dev
# Console: "✅ Created 20 materials with lighting shaders"
```

---

## Task 6.6: Test Water Physics

**Manual test:**

1. Add water to inventory (modify categorySlot temporarily or use Tab → category selection)
2. Place water block
3. Walk through it
4. **Should move at half speed**
5. **Should be able to pass through** (not solid collision)

**File to check if not working:** `/src/control/index.ts` - verify friction is applied

---

## Task 6.7: Test Lava Lighting

**Manual test:**

1. Place lava block
2. **Should emit orange-red light** (R15 G6 B0)
3. Nearby blocks should have orange tint
4. Light should spread ~15 blocks
5. Walk through lava - very slow (30% speed)

**If light color wrong:** Check emissive RGB in fluids.ts definition

---

## Task 6.8: Test Ice Slipperiness

**Manual test:**

1. Place ice blocks on ground
2. Walk across ice
3. **Should move 50% faster** (friction = 1.5)
4. Should feel slippery/fast

**If not slippery:** Check friction application in control/index.ts collision code

---

## Phase 6 Complete: Verification Checklist

- [ ] BlockType enum has 20 entries (0-19)
- [ ] All 6 new blocks registered in BlockRegistry
- [ ] Materials created for all 20 blocks
- [ ] Water: transparent, half speed, light transmission
- [ ] Lava: opaque, orange light emission, very slow movement
- [ ] Ice: transparent, slippery (fast), light transmission
- [ ] Dirt, cobblestone, iron ore, gold ore: standard blocks
- [ ] No regressions on existing 14 blocks
- [ ] 60fps maintained

**If all checks pass:** New blocks complete! Lighting and block system fully functional.

---

# Post-Implementation Tasks

## Documentation Updates

**File:** `/CLAUDE.md`

Update with new block system architecture:

```markdown
## Block System

### BlockRegistry
- Centralized block definitions in `/src/blocks/`
- Single source of truth for all block properties
- Add new blocks by creating definition in appropriate file

### Lighting System
- RGB colored lighting (glowstone=yellow, lava=orange)
- Flood-fill propagation with incremental updates
- Two channels: sky light + block light
- 2ms/frame budget, always 60fps

### Available Blocks (20 total)
... list blocks ...
```

## Performance Monitoring

**Add FPS tracking for light updates:**

```typescript
// In LightQueue.update()
const frameTime = performance.now() - startTime
if (frameTime > 2.0) {
  console.warn(`⚠️ Lighting exceeded budget: ${frameTime.toFixed(2)}ms`)
}
```

## Future Enhancements

**Document in design doc:**
- Smooth lighting (per-vertex)
- Light reflection (single bounce)
- Baked lighting for static chunks
- More blocks (use remaining 300+ textures)

---

# Troubleshooting Guide

## Common Issues

### Issue: Blocks all black after shader integration
**Cause:** Light data not uploading to GPU
**Fix:** Check DataTexture.needsUpdate = true in updateFromChunk()

### Issue: Light doesn't propagate
**Cause:** getBlockTypeAt() returning invalid values
**Fix:** Add logging, verify block types are correct

### Issue: Frame drops during sunrise
**Cause:** Budget too high or too many blocks
**Fix:** Reduce blocksPerFrame from 100 to 50

### Issue: WebGL errors in console
**Cause:** Shader syntax errors
**Fix:** Check fragment shader carefully, test in isolation

### Issue: Water/lava don't slow movement
**Cause:** Friction not applied in collision code
**Fix:** Verify Control.collideCheckAll() reads block properties

---

# File Summary

## New Files (12 total)

**Block System:**
- `/src/blocks/types.ts`
- `/src/blocks/BlockRegistry.ts`
- `/src/blocks/index.ts`
- `/src/blocks/definitions/ground.ts`
- `/src/blocks/definitions/stone.ts`
- `/src/blocks/definitions/wood.ts`
- `/src/blocks/definitions/illumination.ts`
- `/src/blocks/definitions/metals.ts`
- `/src/blocks/definitions/transparent.ts`
- `/src/blocks/definitions/fluids.ts`

**Lighting System:**
- `/src/terrain/Chunk.ts`
- `/src/terrain/ChunkManager.ts`
- `/src/lighting/LightQueue.ts`
- `/src/lighting/LightingEngine.ts`
- `/src/lighting/LightShader.ts`
- `/src/lighting/LightDataTexture.ts`

## Modified Files (6 total)

- `/src/main.ts` - Initialize registry and lighting
- `/src/terrain/index.ts` - Add chunk manager and lighting engine
- `/src/terrain/mesh/materials.ts` - Generate from registry
- `/src/control/index.ts` - Apply block friction properties
- `/src/ui/index.ts` - Add debug commands
- `/src/core/TimeOfDay.ts` - Integrate with sky light updates

## Deleted Files (1 total)

- `/src/control/BlockCategories.ts` - Replaced by registry

---

# Success Criteria

## Functional Requirements

✅ Can add new block in <20 lines of code (single definition)
✅ Glowstone illuminates 15 blocks around it with yellow light
✅ Lava emits orange-red light
✅ Water slows movement to 50% speed
✅ Ice is slippery (150% speed)
✅ Sunrise → World brightens over 1 second smoothly
✅ Caves stay dark during day (only block light)
✅ Light propagates through glass without reduction

## Performance Requirements

✅ Maintain 60fps during all light updates
✅ Sunrise/sunset < 1 second transition time
✅ Memory usage < 10MB for lighting system
✅ No frame drops when placing/breaking light sources

## Code Quality Requirements

✅ Zero scattered block definitions
✅ BlockRegistry is single source of truth
✅ Well-tested (no regressions)
✅ Documented (README, code comments)

---

# Timeline Estimate

**Phase 1:** 5-7 days - BlockRegistry foundation
**Phase 2:** 3-5 days - Material migration
**Phase 3:** 5-7 days - Chunk light storage
**Phase 4:** 7-10 days - Lighting engine
**Phase 5:** 7-10 days - Shader integration (hardest)
**Phase 6:** 3-5 days - Add new blocks

**Total:** 30-44 days (6-9 weeks calendar time with testing/debugging)

**Critical path:** Phase 5 (shader) is highest risk and may need extra time.

---

# Next Steps

1. Review this plan with stakeholders
2. Create feature branch: `git checkout -b feature/lighting-system`
3. Start with Phase 1, Task 1.1
4. Test thoroughly after each task
5. Commit frequently with descriptive messages
6. Request code review after each phase

---

**Plan complete and ready for implementation!**
