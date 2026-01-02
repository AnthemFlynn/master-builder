# Epic 1: World Generation Infrastructure Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild core infrastructure with multi-scale noise, Gaussian distributions, and enhanced GenerationContext for proper multi-pass generation.

**Architecture:** Add climate data (temperature/humidity), surface tracking, feature tracking, and helper methods to GenerationContext. Add Gaussian random to SeededRandom. Prepare for proper pass ordering.

**Tech Stack:** TypeScript, simplex-noise, Zod

**Dependencies:** Must complete BEFORE Epic 2 (Pass Redesign)

---

## Task 1: Add Gaussian Distribution to SeededRandom

**Files:**
- Modify: `src/modules/world/generation/utils/SeededRandom.ts:20-25`
- Create: `src/modules/world/generation/utils/__tests__/SeededRandom.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/world/generation/utils/__tests__/SeededRandom.test.ts
import { describe, it, expect } from 'bun:test'
import { SeededRandom } from '../SeededRandom'

describe('SeededRandom', () => {
  it('should generate deterministic Gaussian values', () => {
    const rng1 = new SeededRandom(12345)
    const rng2 = new SeededRandom(12345)

    const val1 = rng1.gaussian(10, 2)
    const val2 = rng2.gaussian(10, 2)

    expect(val1).toBe(val2)  // Same seed = same value
  })

  it('should generate values centered around mean', () => {
    const rng = new SeededRandom(999)
    const samples = []

    for (let i = 0; i < 100; i++) {
      samples.push(rng.gaussian(50, 10))
    }

    const mean = samples.reduce((a, b) => a + b) / samples.length
    expect(Math.abs(mean - 50)).toBeLessThan(5)  // Should be near 50
  })

  it('should clamp Gaussian values to range', () => {
    const rng = new SeededRandom(777)

    for (let i = 0; i < 100; i++) {
      const val = rng.clampedGaussian(10, 5, 2, 18)
      expect(val).toBeGreaterThanOrEqual(2)
      expect(val).toBeLessThanOrEqual(18)
    }
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/utils/__tests__/SeededRandom.test.ts
```

Expected: FAIL with "gaussian is not a function"

**Step 3: Write minimal implementation**

```typescript
// Modify src/modules/world/generation/utils/SeededRandom.ts
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296
    return this.state / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  // NEW: Box-Muller transform for Gaussian distribution
  gaussian(mean: number, stdDev: number): number {
    const u1 = this.next()
    const u2 = this.next()
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
    return mean + stdDev * z0
  }

  // NEW: Clamped Gaussian to prevent extreme outliers
  clampedGaussian(mean: number, stdDev: number, min: number, max: number): number {
    let value = this.gaussian(mean, stdDev)
    return Math.max(min, Math.min(max, value))
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/utils/__tests__/SeededRandom.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/utils/SeededRandom.ts src/modules/world/generation/utils/__tests__/SeededRandom.test.ts
git commit -m "feat: add Gaussian distribution to SeededRandom (Box-Muller)"
```

---

## Task 2: Add Climate Data to GenerationContext

**Files:**
- Modify: `src/modules/world/generation/GenerationContext.ts:10-20`
- Modify: `src/modules/world/generation/__tests__/GenerationContext.test.ts:75-90`

**Step 1: Write the failing test**

```typescript
// Add to GenerationContext.test.ts
it('should initialize temperature and humidity maps', () => {
  const coord = new ChunkCoordinate(0, 0)
  const context = new GenerationContext(coord, testWorldDef)

  expect(context.temperature.length).toBe(24)
  expect(context.temperature[0].length).toBe(24)
  expect(context.humidity.length).toBe(24)
  expect(context.humidity[0].length).toBe(24)

  // Should initialize to 0
  expect(context.temperature[0][0]).toBe(0)
  expect(context.humidity[0][0]).toBe(0)
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: FAIL with "temperature is not defined"

**Step 3: Write minimal implementation**

```typescript
// Modify GenerationContext.ts
export class GenerationContext {
  public seed: number
  public heightMap: number[][]
  public temperature: number[][]  // NEW
  public humidity: number[][]     // NEW
  public minY: number = 256
  public maxY: number = 0

  private readonly size: number = 24
  private readonly height: number = 256
  private data: Uint8Array
  private _cachedBlockTypes: number[][][] | null = null

  constructor(
    public chunkCoord: ChunkCoordinate,
    public worldDef: WorldDefinition
  ) {
    this.seed = worldDef.meta.seed

    // Initialize heightmap
    this.heightMap = []
    for (let x = 0; x < this.size; x++) {
      this.heightMap[x] = []
      for (let z = 0; z < this.size; z++) {
        this.heightMap[x][z] = 0
      }
    }

    // NEW: Initialize climate maps
    this.temperature = []
    this.humidity = []
    for (let x = 0; x < this.size; x++) {
      this.temperature[x] = []
      this.humidity[x] = []
      for (let z = 0; z < this.size; z++) {
        this.temperature[x][z] = 0
        this.humidity[x][z] = 0
      }
    }

    // Initialize Uint8Array for block storage
    const length = this.size * this.height * this.size
    this.data = new Uint8Array(length)

    console.log(`🌍 GenerationContext initialized for chunk (${chunkCoord.x}, ${chunkCoord.z})`)
  }

  // ... existing methods ...
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/GenerationContext.ts src/modules/world/generation/__tests__/GenerationContext.test.ts
git commit -m "feat: add climate data (temperature/humidity) to GenerationContext"
```

---

## Task 3: Add Surface Tracking to GenerationContext

**Files:**
- Modify: `src/modules/world/generation/GenerationContext.ts:20-30`
- Modify: `src/modules/world/generation/__tests__/GenerationContext.test.ts:91-120`

**Step 1: Write the failing test**

```typescript
// Add to GenerationContext.test.ts
it('should track surface information', () => {
  const coord = new ChunkCoordinate(0, 0)
  const context = new GenerationContext(coord, testWorldDef)

  // Set some blocks to create surface
  context.setBlock(5, 40, 10, BlockType.grass)
  context.setBlock(5, 39, 10, BlockType.dirt)

  // Surface map should be empty initially
  expect(context.surfaceMap.size).toBe(0)

  // Update surface map
  context.updateSurfaceAt(5, 10)

  const surface = context.surfaceMap.get('5,10')
  expect(surface).toBeDefined()
  expect(surface?.y).toBe(40)
  expect(surface?.blockType).toBe(BlockType.grass)
  expect(surface?.isCave).toBe(false)
})

it('should detect cave surfaces', () => {
  const coord = new ChunkCoordinate(0, 0)
  const context = new GenerationContext(coord, testWorldDef)

  // Create terrain
  for (let y = 0; y <= 50; y++) {
    context.setBlock(5, y, 10, BlockType.stone)
  }
  context.heightMap[5][10] = 50

  // Carve cave (remove blocks at Y=30)
  context.setBlock(5, 30, 10, BlockType.air)

  // Update surface (should find Y=29 as cave ceiling)
  context.updateSurfaceAt(5, 10)

  const surface = context.surfaceMap.get('5,10')
  expect(surface?.y).toBe(29)
  expect(surface?.isCave).toBe(true)  // More than 5 blocks below original height
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: FAIL with "surfaceMap is not defined"

**Step 3: Write minimal implementation**

```typescript
// Modify GenerationContext.ts
interface SurfaceInfo {
  y: number
  blockType: number
  isCave: boolean
}

export class GenerationContext {
  // ... existing properties ...

  public surfaceMap: Map<string, SurfaceInfo> = new Map()  // NEW

  // ... existing constructor and methods ...

  // NEW: Update surface information at X,Z
  updateSurfaceAt(x: number, z: number): void {
    // Find topmost solid block
    for (let y = 255; y >= 0; y--) {
      const block = this.getBlock(x, y, z)
      if (block !== BlockType.air) {
        const originalHeight = this.heightMap[x]?.[z] ?? 0

        this.surfaceMap.set(`${x},${z}`, {
          y: y,
          blockType: block,
          isCave: y < originalHeight - 5  // More than 5 blocks below = cave
        })
        return
      }
    }

    // No solid blocks found
    this.surfaceMap.delete(`${x},${z}`)
  }

  // NEW: Find surface Y at X,Z
  findSurface(x: number, z: number): number | null {
    const surface = this.surfaceMap.get(`${x},${z}`)
    return surface ? surface.y : null
  }

  // NEW: Get surface block type at X,Z
  getSurfaceBlock(x: number, z: number): number {
    const surface = this.surfaceMap.get(`${x},${z}`)
    return surface ? surface.blockType : BlockType.air
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/GenerationContext.ts src/modules/world/generation/__tests__/GenerationContext.test.ts
git commit -m "feat: add surface tracking to GenerationContext with cave detection"
```

---

## Task 4: Add Cave and Feature Tracking

**Files:**
- Modify: `src/modules/world/generation/GenerationContext.ts:30-50`
- Modify: `src/modules/world/generation/__tests__/GenerationContext.test.ts:121-160`

**Step 1: Write the failing test**

```typescript
// Add to GenerationContext.test.ts
it('should track cave blocks', () => {
  const coord = new ChunkCoordinate(0, 0)
  const context = new GenerationContext(coord, testWorldDef)

  expect(context.isCave(10, 20, 10)).toBe(false)

  context.markCave(10, 20, 10)

  expect(context.isCave(10, 20, 10)).toBe(true)
})

it('should track placed features', () => {
  const coord = new ChunkCoordinate(0, 0)
  const context = new GenerationContext(coord, testWorldDef)

  expect(context.hasNearbyFeature(10, 10, 5, 'tree')).toBe(false)

  context.markFeature(10, 10, 'tree')

  expect(context.hasNearbyFeature(10, 10, 3, 'tree')).toBe(true)
  expect(context.hasNearbyFeature(16, 10, 3, 'tree')).toBe(false)  // Too far
  expect(context.hasNearbyFeature(10, 10, 3, 'island')).toBe(false)  // Wrong type
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: FAIL with "isCave is not a function"

**Step 3: Write minimal implementation**

```typescript
// Modify GenerationContext.ts
export class GenerationContext {
  // ... existing properties ...

  public surfaceMap: Map<string, SurfaceInfo> = new Map()
  public caveBlocks: Set<string> = new Set()        // NEW: "x,y,z"
  public placedFeatures: Set<string> = new Set()    // NEW: "type:x,z"

  // ... existing methods ...

  // NEW: Mark block as cave
  markCave(x: number, y: number, z: number): void {
    this.caveBlocks.add(`${x},${y},${z}`)
  }

  // NEW: Check if block is in cave
  isCave(x: number, y: number, z: number): boolean {
    return this.caveBlocks.has(`${x},${y},${z}`)
  }

  // NEW: Mark feature placement
  markFeature(x: number, z: number, type: string): void {
    this.placedFeatures.add(`${type}:${x},${z}`)
  }

  // NEW: Check for nearby features
  hasNearbyFeature(x: number, z: number, radius: number, type: string): boolean {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const dist = Math.sqrt(dx*dx + dz*dz)
        if (dist <= radius) {
          if (this.placedFeatures.has(`${type}:${x + dx},${z + dz}`)) {
            return true
          }
        }
      }
    }
    return false
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: PASS (10 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/GenerationContext.ts src/modules/world/generation/__tests__/GenerationContext.test.ts
git commit -m "feat: add cave and feature tracking to GenerationContext"
```

---

## Task 5: Add Biome Data Structures

**Files:**
- Create: `src/modules/world/generation/biomes/BiomeTypes.ts`
- Create: `src/modules/world/generation/biomes/SurfaceBiomes.ts`
- Create: `src/modules/world/generation/biomes/UndergroundBiomes.ts`

**Step 1: Create biome type definitions**

```typescript
// src/modules/world/generation/biomes/BiomeTypes.ts
import { BlockType } from '../../domain/BlockType'

export enum SurfaceBiomeType {
  PLAINS = 'plains',
  FOREST = 'forest',
  DESERT = 'desert',
  MOUNTAINS = 'mountains',
  TUNDRA = 'tundra'
}

export enum UndergroundBiomeType {
  DRIPSTONE_CAVES = 'dripstone_caves',
  ICE_CAVES = 'ice_caves',
  LUSH_CAVES = 'lush_caves'
}

export interface SurfaceBiome {
  type: SurfaceBiomeType
  surfaceBlock: BlockType
  subsurfaceBlock: BlockType
  subsurfaceDepth: number
  allowTrees: boolean
  treeDensity: number
  minTreeSpacing: number
}

export interface UndergroundBiome {
  type: UndergroundBiomeType
  floorBlock: BlockType
  formationMaterial: BlockType
  allowStalactites: boolean
  formationDensity: number
}
```

**Step 2: Create surface biome definitions**

```typescript
// src/modules/world/generation/biomes/SurfaceBiomes.ts
import { BlockType } from '../../domain/BlockType'
import { SurfaceBiome, SurfaceBiomeType } from './BiomeTypes'

export const SURFACE_BIOMES: Record<SurfaceBiomeType, SurfaceBiome> = {
  [SurfaceBiomeType.PLAINS]: {
    type: SurfaceBiomeType.PLAINS,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.02,  // 2% of grid positions
    minTreeSpacing: 6
  },

  [SurfaceBiomeType.FOREST]: {
    type: SurfaceBiomeType.FOREST,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.08,  // 8% - dense
    minTreeSpacing: 5
  },

  [SurfaceBiomeType.DESERT]: {
    type: SurfaceBiomeType.DESERT,
    surfaceBlock: BlockType.sand,
    subsurfaceBlock: BlockType.sand,
    subsurfaceDepth: 5,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0
  },

  [SurfaceBiomeType.MOUNTAINS]: {
    type: SurfaceBiomeType.MOUNTAINS,
    surfaceBlock: BlockType.stone,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 1,
    allowTrees: false,
    treeDensity: 0,
    minTreeSpacing: 0
  },

  [SurfaceBiomeType.TUNDRA]: {
    type: SurfaceBiomeType.TUNDRA,
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 2,
    allowTrees: true,
    treeDensity: 0.01,  // Very sparse
    minTreeSpacing: 8
  }
}

export function getSurfaceBiome(temp: number, humidity: number, elevation: number): SurfaceBiome {
  // High elevation override
  if (elevation > 80) return SURFACE_BIOMES[SurfaceBiomeType.MOUNTAINS]

  // Temperature-humidity matrix
  if (temp > 0.6 && humidity < -0.3) return SURFACE_BIOMES[SurfaceBiomeType.DESERT]
  if (temp < -0.4) return SURFACE_BIOMES[SurfaceBiomeType.TUNDRA]
  if (humidity > 0.3) return SURFACE_BIOMES[SurfaceBiomeType.FOREST]

  return SURFACE_BIOMES[SurfaceBiomeType.PLAINS]
}
```

**Step 3: Create underground biome definitions**

```typescript
// src/modules/world/generation/biomes/UndergroundBiomes.ts
import { BlockType } from '../../domain/BlockType'
import { UndergroundBiome, UndergroundBiomeType } from './BiomeTypes'

export const UNDERGROUND_BIOMES: Record<UndergroundBiomeType, UndergroundBiome> = {
  [UndergroundBiomeType.DRIPSTONE_CAVES]: {
    type: UndergroundBiomeType.DRIPSTONE_CAVES,
    floorBlock: BlockType.stone,
    formationMaterial: BlockType.stone,
    allowStalactites: true,
    formationDensity: 0.1
  },

  [UndergroundBiomeType.ICE_CAVES]: {
    type: UndergroundBiomeType.ICE_CAVES,
    floorBlock: BlockType.glass,  // Ice = glass temporarily
    formationMaterial: BlockType.glass,
    allowStalactites: true,
    formationDensity: 0.15
  },

  [UndergroundBiomeType.LUSH_CAVES]: {
    type: UndergroundBiomeType.LUSH_CAVES,
    floorBlock: BlockType.dirt,
    formationMaterial: BlockType.glowstone,
    allowStalactites: false,
    formationDensity: 0.05
  }
}

export function getUndergroundBiome(temp: number, humidity: number): UndergroundBiome {
  if (temp < -0.5) return UNDERGROUND_BIOMES[UndergroundBiomeType.ICE_CAVES]
  if (humidity > 0.6) return UNDERGROUND_BIOMES[UndergroundBiomeType.LUSH_CAVES]
  return UNDERGROUND_BIOMES[UndergroundBiomeType.DRIPSTONE_CAVES]
}
```

**Step 4: Verify TypeScript compiles**

```bash
bun lint
```

Expected: No errors

**Step 5: Commit**

```bash
git add src/modules/world/generation/biomes/
git commit -m "feat: add surface and underground biome definitions"
```

---

## Task 6: Add Biome Tracking to GenerationContext

**Files:**
- Modify: `src/modules/world/generation/GenerationContext.ts:15-25`
- Modify: `src/modules/world/generation/__tests__/GenerationContext.test.ts:161-185`

**Step 1: Write the failing test**

```typescript
// Add to GenerationContext.test.ts
import { SurfaceBiomeType } from '../biomes/BiomeTypes'
import { SURFACE_BIOMES } from '../biomes/SurfaceBiomes'
import { UNDERGROUND_BIOMES } from '../biomes/UndergroundBiomes'

it('should store biome data per column', () => {
  const coord = new ChunkCoordinate(0, 0)
  const context = new GenerationContext(coord, testWorldDef)

  const biome = SURFACE_BIOMES[SurfaceBiomeType.FOREST]
  context.setBiomeAt(5, 10, biome)

  const retrieved = context.getBiomeAt(5, 10)
  expect(retrieved?.type).toBe(SurfaceBiomeType.FOREST)
})

it('should store underground biome data', () => {
  const coord = new ChunkCoordinate(0, 0)
  const context = new GenerationContext(coord, testWorldDef)

  const undergroundBiome = UNDERGROUND_BIOMES.ICE_CAVES
  context.setUndergroundBiomeAt(5, 10, undergroundBiome)

  const retrieved = context.getUndergroundBiomeAt(5, 10)
  expect(retrieved?.type).toBe('ice_caves')
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: FAIL with "setBiomeAt is not a function"

**Step 3: Write minimal implementation**

```typescript
// Modify GenerationContext.ts
import { SurfaceBiome, UndergroundBiome } from './biomes/BiomeTypes'

export class GenerationContext {
  // ... existing properties ...

  public biomeMap: Map<string, SurfaceBiome> = new Map()             // NEW
  public undergroundBiomeMap: Map<string, UndergroundBiome> = new Map()  // NEW

  // ... existing methods ...

  // NEW: Biome accessors
  setBiomeAt(x: number, z: number, biome: SurfaceBiome): void {
    this.biomeMap.set(`${x},${z}`, biome)
  }

  getBiomeAt(x: number, z: number): SurfaceBiome | undefined {
    return this.biomeMap.get(`${x},${z}`)
  }

  setUndergroundBiomeAt(x: number, z: number, biome: UndergroundBiome): void {
    this.undergroundBiomeMap.set(`${x},${z}`, biome)
  }

  getUndergroundBiomeAt(x: number, z: number): UndergroundBiome | undefined {
    return this.undergroundBiomeMap.get(`${x},${z}`)
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: PASS (10 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/GenerationContext.ts src/modules/world/generation/__tests__/GenerationContext.test.ts
git commit -m "feat: add biome tracking (surface + underground) to GenerationContext"
```

---

## Epic 1 Complete

**Infrastructure Added:**
- ✅ Gaussian distribution in SeededRandom
- ✅ Climate data (temperature, humidity)
- ✅ Surface tracking with cave detection
- ✅ Cave block tracking
- ✅ Feature placement tracking
- ✅ Biome data structures (surface + underground)
- ✅ Biome tracking in GenerationContext

**Next:** Epic 2 - Redesign Terrain, Cave, and Biome passes to use new infrastructure

**Verification:**
```bash
bun test src/modules/world/generation/__tests__/
bun lint
```

Expected: All tests pass, no TypeScript errors
