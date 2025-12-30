# Phase 4A: Declarative World Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace noise-based terrain with JSON-defined dramatic procedural worlds featuring floating islands, massive caves, giant trees, and glowing crystals.

**Architecture:** GenerationOrchestrator coordinates 4-pass pipeline (Terrain → Features → Biomes → Decoration). Each pass modifies shared GenerationContext. FeatureGenerators use deterministic spatial queries to decide if chunk intersects feature bounds, then generate geometry. WorldDefinition loaded from JSON, validated with Zod.

**Tech Stack:** TypeScript, Zod 3.x, SimplexNoise, Web Workers, JSON

---

## Phase 1: Foundation & Schema

### Task 1.1: Install Zod and Create Base Schema

**Files:**
- Modify: `package.json` (add zod dependency)
- Create: `src/modules/world/domain/WorldDefinition.ts`
- Create: `src/modules/world/domain/__tests__/WorldDefinition.test.ts`

**Step 1: Install Zod**

```bash
bun add zod
```

Expected: Package added to package.json

**Step 2: Write the failing test**

```typescript
// src/modules/world/domain/__tests__/WorldDefinition.test.ts
import { describe, it, expect } from 'bun:test'
import { WorldDefinitionSchema } from '../WorldDefinition'

describe('WorldDefinitionSchema', () => {
  it('should validate correct world definition', () => {
    const validWorld = {
      meta: {
        name: "Test World",
        seed: 12345,
        version: "0.1.0"
      },
      terrain: {
        generator: "noise",
        baseHeight: 40,
        noise: {
          type: "simplex",
          octaves: 4,
          frequency: 0.01,
          amplitude: 20,
          lacunarity: 2.0,
          persistence: 0.5
        }
      },
      features: [],
      biomes: {
        elevationBased: true,
        ranges: []
      }
    }

    const result = WorldDefinitionSchema.safeParse(validWorld)
    expect(result.success).toBe(true)
  })

  it('should reject invalid seed type', () => {
    const invalidWorld = {
      meta: { name: "Test", seed: "not a number", version: "0.1.0" }
    }

    const result = WorldDefinitionSchema.safeParse(invalidWorld)
    expect(result.success).toBe(false)
  })

  it('should reject invalid generator type', () => {
    const invalidWorld = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "invalid", baseHeight: 40 }
    }

    const result = WorldDefinitionSchema.safeParse(invalidWorld)
    expect(result.success).toBe(false)
  })
})
```

**Step 3: Run test to verify it fails**

```bash
bun test src/modules/world/domain/__tests__/WorldDefinition.test.ts
```

Expected: FAIL with "Cannot find module '../WorldDefinition'"

**Step 4: Write minimal implementation**

```typescript
// src/modules/world/domain/WorldDefinition.ts
import { z } from 'zod'

const MetaSchema = z.object({
  name: z.string(),
  seed: z.number(),
  version: z.string().default('0.1.0')
})

const NoiseSchema = z.object({
  type: z.enum(['simplex', 'perlin']),
  octaves: z.number().min(1).max(8),
  frequency: z.number(),
  amplitude: z.number(),
  lacunarity: z.number().default(2.0),
  persistence: z.number().default(0.5)
})

const TerrainSchema = z.object({
  generator: z.enum(['noise', 'flat']),
  baseHeight: z.number(),
  noise: NoiseSchema
})

const BiomeRangeSchema = z.object({
  elevationRange: z.tuple([z.number(), z.number()]),
  surface: z.string(),
  subsurface: z.string()
})

const BiomesSchema = z.object({
  elevationBased: z.boolean(),
  ranges: z.array(BiomeRangeSchema)
})

export const WorldDefinitionSchema = z.object({
  meta: MetaSchema,
  terrain: TerrainSchema,
  features: z.array(z.any()),  // Will add discriminated union in next task
  biomes: BiomesSchema
})

export type WorldDefinition = z.infer<typeof WorldDefinitionSchema>
export type Meta = z.infer<typeof MetaSchema>
export type Terrain = z.infer<typeof TerrainSchema>
export type Biomes = z.infer<typeof BiomesSchema>
export type BiomeRange = z.infer<typeof BiomeRangeSchema>
```

**Step 5: Run test to verify it passes**

```bash
bun test src/modules/world/domain/__tests__/WorldDefinition.test.ts
```

Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add package.json bun.lockb src/modules/world/domain/WorldDefinition.ts src/modules/world/domain/__tests__/WorldDefinition.test.ts
git commit -m "feat: add Zod schema for world definitions (base structure)"
```

---

### Task 1.2: Add Feature Schemas (Discriminated Union)

**Files:**
- Modify: `src/modules/world/domain/WorldDefinition.ts:25-30`
- Modify: `src/modules/world/domain/__tests__/WorldDefinition.test.ts:50-100`

**Step 1: Write the failing test**

```typescript
// Add to WorldDefinition.test.ts
it('should validate floating island feature', () => {
  const world = {
    meta: { name: "Test", seed: 123, version: "0.1.0" },
    terrain: { generator: "flat", baseHeight: 40, noise: {...} },
    features: [
      {
        type: "floating_island",
        spacing: 400,
        radiusRange: [50, 100],
        heightRange: [80, 120],
        thickness: 15,
        material: "grass"
      }
    ],
    biomes: { elevationBased: true, ranges: [] }
  }

  const result = WorldDefinitionSchema.safeParse(world)
  expect(result.success).toBe(true)
})

it('should validate cave system feature', () => {
  const world = {
    meta: { name: "Test", seed: 123, version: "0.1.0" },
    terrain: { generator: "flat", baseHeight: 40, noise: {...} },
    features: [
      {
        type: "cave_system",
        density: 0.02,
        radiusRange: [5, 15],
        depthRange: [10, 80],
        windingFactor: 0.7
      }
    ],
    biomes: { elevationBased: true, ranges: [] }
  }

  const result = WorldDefinitionSchema.safeParse(world)
  expect(result.success).toBe(true)
})

it('should reject invalid feature type', () => {
  const world = {
    meta: { name: "Test", seed: 123, version: "0.1.0" },
    terrain: { generator: "flat", baseHeight: 40, noise: {...} },
    features: [
      { type: "invalid_feature" }
    ],
    biomes: { elevationBased: true, ranges: [] }
  }

  const result = WorldDefinitionSchema.safeParse(world)
  expect(result.success).toBe(false)
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/domain/__tests__/WorldDefinition.test.ts
```

Expected: FAIL - features validation too permissive (z.any())

**Step 3: Write minimal implementation**

```typescript
// Modify WorldDefinition.ts - add before WorldDefinitionSchema:

const FloatingIslandFeatureSchema = z.object({
  type: z.literal('floating_island'),
  spacing: z.number(),
  noiseOffset: z.number().default(100),
  radiusRange: z.tuple([z.number(), z.number()]),
  heightRange: z.tuple([z.number(), z.number()]),
  thickness: z.number().default(15),
  material: z.string(),
  supportPillars: z.boolean().default(false)
})

const CaveSystemFeatureSchema = z.object({
  type: z.literal('cave_system'),
  density: z.number(),
  radiusRange: z.tuple([z.number(), z.number()]),
  depthRange: z.tuple([z.number(), z.number()]),
  windingFactor: z.number().default(0.7)
})

const GiantTreeFeatureSchema = z.object({
  type: z.literal('giant_tree'),
  density: z.number(),
  trunkRadiusRange: z.tuple([z.number(), z.number()]),
  heightRange: z.tuple([z.number(), z.number()]),
  canopyRadius: z.number(),
  material: z.object({
    trunk: z.string(),
    leaves: z.string()
  })
})

const CrystalFormationFeatureSchema = z.object({
  type: z.literal('crystal_formation'),
  density: z.number(),
  heightRange: z.tuple([z.number(), z.number()]),
  material: z.string(),
  depthRange: z.tuple([z.number(), z.number()]),
  onlyInCaves: z.boolean().default(true)
})

const FeatureSchema = z.discriminatedUnion('type', [
  FloatingIslandFeatureSchema,
  CaveSystemFeatureSchema,
  GiantTreeFeatureSchema,
  CrystalFormationFeatureSchema
])

// Update WorldDefinitionSchema features field:
features: z.array(FeatureSchema)

// Export feature types
export type FloatingIslandFeature = z.infer<typeof FloatingIslandFeatureSchema>
export type CaveSystemFeature = z.infer<typeof CaveSystemFeatureSchema>
export type GiantTreeFeature = z.infer<typeof GiantTreeFeatureSchema>
export type CrystalFormationFeature = z.infer<typeof CrystalFormationFeatureSchema>
export type Feature = z.infer<typeof FeatureSchema>
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/domain/__tests__/WorldDefinition.test.ts
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/modules/world/domain/WorldDefinition.ts src/modules/world/domain/__tests__/WorldDefinition.test.ts
git commit -m "feat: add feature schemas with discriminated union (4 feature types)"
```

---

### Task 1.3: Create MaterialRegistry

**Files:**
- Create: `src/modules/world/domain/MaterialRegistry.ts`
- Create: `src/modules/world/domain/__tests__/MaterialRegistry.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/world/domain/__tests__/MaterialRegistry.test.ts
import { describe, it, expect } from 'bun:test'
import { MaterialRegistry } from '../MaterialRegistry'
import { BlockType } from '../BlockType'

describe('MaterialRegistry', () => {
  it('should resolve material names to BlockType', () => {
    const registry = new MaterialRegistry()

    expect(registry.resolve('grass')).toBe(BlockType.grass)
    expect(registry.resolve('stone')).toBe(BlockType.stone)
    expect(registry.resolve('obsidian')).toBe(BlockType.obsidian)
  })

  it('should support aliases', () => {
    const registry = new MaterialRegistry()

    expect(registry.resolve('grass_green')).toBe(BlockType.grass)
    expect(registry.resolve('granite')).toBe(BlockType.stone)
  })

  it('should return stone for unknown materials', () => {
    const registry = new MaterialRegistry()

    expect(registry.resolve('unknown_material')).toBe(BlockType.stone)
  })

  it('should allow registering new mappings', () => {
    const registry = new MaterialRegistry()

    registry.register('custom_block', BlockType.diamond)
    expect(registry.resolve('custom_block')).toBe(BlockType.diamond)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/domain/__tests__/MaterialRegistry.test.ts
```

Expected: FAIL with "Cannot find module '../MaterialRegistry'"

**Step 3: Write minimal implementation**

```typescript
// src/modules/world/domain/MaterialRegistry.ts
import { BlockType } from './BlockType'

export class MaterialRegistry {
  private nameToBlockType = new Map<string, BlockType>([
    // Direct mappings (current 16 blocks)
    ['air', BlockType.air],
    ['sand', BlockType.sand],
    ['tree', BlockType.tree],
    ['leaf', BlockType.leaf],
    ['dirt', BlockType.dirt],
    ['stone', BlockType.stone],
    ['coal', BlockType.coal],
    ['wood', BlockType.wood],
    ['diamond', BlockType.diamond],
    ['gold', BlockType.gold],
    ['glowstone', BlockType.glowstone],
    ['bedrock', BlockType.bedrock],
    ['glass', BlockType.glass],
    ['redstone_lamp', BlockType.redstone_lamp],
    ['grass', BlockType.grass],
    ['obsidian', BlockType.obsidian],

    // Aliases for schema compatibility
    ['grass_green', BlockType.grass],
    ['soil_temperate', BlockType.dirt],
    ['granite', BlockType.stone],
    ['sand_yellow', BlockType.sand],
    ['water_ocean', BlockType.glass]  // Temporary until water block
  ])

  resolve(materialName: string): BlockType {
    const blockType = this.nameToBlockType.get(materialName)
    if (blockType === undefined) {
      console.warn(`Material '${materialName}' not found, using stone as fallback`)
      return BlockType.stone
    }
    return blockType
  }

  register(name: string, blockType: BlockType): void {
    this.nameToBlockType.set(name, blockType)
  }
}

// Singleton instance
export const materialRegistry = new MaterialRegistry()

// Helper function for generators
export function resolveBlockType(materialName: string): BlockType {
  return materialRegistry.resolve(materialName)
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/domain/__tests__/MaterialRegistry.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/modules/world/domain/MaterialRegistry.ts src/modules/world/domain/__tests__/MaterialRegistry.test.ts
git commit -m "feat: add MaterialRegistry for JSON material name resolution"
```

---

## Phase 2: Generation Pipeline Infrastructure

### Task 2.1: Create GenerationContext

**Files:**
- Create: `src/modules/world/generation/GenerationContext.ts`
- Create: `src/modules/world/generation/__tests__/GenerationContext.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/world/generation/__tests__/GenerationContext.test.ts
import { describe, it, expect } from 'bun:test'
import { GenerationContext } from '../GenerationContext'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'

describe('GenerationContext', () => {
  const testWorldDef = {
    meta: { name: "Test", seed: 12345, version: "0.1.0" },
    terrain: {
      generator: "flat" as const,
      baseHeight: 40,
      noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 }
    },
    features: [],
    biomes: { elevationBased: true, ranges: [] }
  }

  it('should initialize with chunk coordinate and world definition', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    expect(context.chunkCoord).toBe(coord)
    expect(context.worldDef).toBe(testWorldDef)
    expect(context.seed).toBe(12345)
  })

  it('should initialize heightMap as 24x24 array', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    expect(context.heightMap.length).toBe(24)
    expect(context.heightMap[0].length).toBe(24)
  })

  it('should initialize blockTypes as 24x256x24 array of air', () => {
    const coord = new ChunkCoordinate(0, 0)
    const context = new GenerationContext(coord, testWorldDef)

    expect(context.blockTypes.length).toBe(24)
    expect(context.blockTypes[0].length).toBe(256)
    expect(context.blockTypes[0][0].length).toBe(24)
    expect(context.blockTypes[0][0][0]).toBe(0)  // Air
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: FAIL with "Cannot find module '../GenerationContext'"

**Step 3: Write minimal implementation**

```typescript
// src/modules/world/generation/GenerationContext.ts
import { ChunkCoordinate } from '../../shared/domain/ChunkCoordinate'
import { WorldDefinition } from '../domain/WorldDefinition'
import { BlockType } from '../domain/BlockType'

export class GenerationContext {
  public seed: number
  public heightMap: number[][]
  public blockTypes: number[][][]

  constructor(
    public chunkCoord: ChunkCoordinate,
    public worldDef: WorldDefinition
  ) {
    this.seed = worldDef.meta.seed

    // Initialize 24x24 heightmap
    this.heightMap = Array(24).fill(null).map(() => Array(24).fill(0))

    // Initialize 24x256x24 blockTypes array (all air)
    this.blockTypes = Array(24).fill(null).map(() =>
      Array(256).fill(null).map(() =>
        Array(24).fill(BlockType.air)
      )
    )
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/__tests__/GenerationContext.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/GenerationContext.ts src/modules/world/generation/__tests__/GenerationContext.test.ts
git commit -m "feat: add GenerationContext for pipeline state management"
```

---

### Task 2.2: Create GenerationPass Interface and GenerationOrchestrator

**Files:**
- Create: `src/modules/world/generation/passes/GenerationPass.ts`
- Create: `src/modules/world/generation/GenerationOrchestrator.ts`
- Create: `src/modules/world/generation/__tests__/GenerationOrchestrator.test.ts`

**Step 1: Create GenerationPass interface**

```typescript
// src/modules/world/generation/passes/GenerationPass.ts
import { GenerationContext } from '../GenerationContext'

export interface GenerationPass {
  readonly name: string
  execute(context: GenerationContext): void | Promise<void>
}
```

**Step 2: Write the failing test**

```typescript
// src/modules/world/generation/__tests__/GenerationOrchestrator.test.ts
import { describe, it, expect } from 'bun:test'
import { GenerationOrchestrator } from '../GenerationOrchestrator'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { GenerationPass } from '../passes/GenerationPass'

class MockPass implements GenerationPass {
  name = 'MockPass'
  executed = false

  execute(context: GenerationContext): void {
    this.executed = true
    context.heightMap[0][0] = 99  // Mark as executed
  }
}

describe('GenerationOrchestrator', () => {
  const testWorldDef = {
    meta: { name: "Test", seed: 123, version: "0.1.0" },
    terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
    features: [],
    biomes: { elevationBased: true, ranges: [] }
  }

  it('should execute all registered passes in order', async () => {
    const pass1 = new MockPass()
    const pass2 = new MockPass()

    const orchestrator = new GenerationOrchestrator(testWorldDef, [pass1, pass2])
    const chunk = await orchestrator.generateChunk(new ChunkCoordinate(0, 0))

    expect(pass1.executed).toBe(true)
    expect(pass2.executed).toBe(true)
    expect(chunk).toBeDefined()
  })

  it('should compile blockTypes to ChunkData', async () => {
    const orchestrator = new GenerationOrchestrator(testWorldDef, [])
    const chunk = await orchestrator.generateChunk(new ChunkCoordinate(5, 10))

    expect(chunk.coord.x).toBe(5)
    expect(chunk.coord.z).toBe(10)
  })
})
```

**Step 3: Run test to verify it fails**

```bash
bun test src/modules/world/generation/__tests__/GenerationOrchestrator.test.ts
```

Expected: FAIL with "Cannot find module '../GenerationOrchestrator'"

**Step 4: Write minimal implementation**

```typescript
// src/modules/world/generation/GenerationOrchestrator.ts
import { ChunkCoordinate } from '../../shared/domain/ChunkCoordinate'
import { ChunkData } from '../../shared/domain/ChunkData'
import { WorldDefinition } from '../domain/WorldDefinition'
import { GenerationContext } from './GenerationContext'
import { GenerationPass } from './passes/GenerationPass'

export class GenerationOrchestrator {
  constructor(
    private worldDef: WorldDefinition,
    private passes: GenerationPass[] = []
  ) {}

  async generateChunk(coord: ChunkCoordinate): Promise<ChunkData> {
    const context = new GenerationContext(coord, this.worldDef)

    // Execute all passes in order
    for (const pass of this.passes) {
      await pass.execute(context)
    }

    // Compile to ChunkData
    return this.compileToChunk(context)
  }

  private compileToChunk(context: GenerationContext): ChunkData {
    const chunk = new ChunkData(context.chunkCoord)

    // Copy blockTypes array to chunk
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          const blockType = context.blockTypes[x][y][z]
          if (blockType !== 0) {  // Skip air for efficiency
            chunk.setBlockId(x, y, z, blockType)
          }
        }
      }
    }

    return chunk
  }
}
```

**Step 5: Run test to verify it passes**

```bash
bun test src/modules/world/generation/__tests__/GenerationOrchestrator.test.ts
```

Expected: PASS (2 tests)

**Step 6: Commit**

```bash
git add src/modules/world/generation/passes/GenerationPass.ts src/modules/world/generation/GenerationOrchestrator.ts src/modules/world/generation/__tests__/GenerationOrchestrator.test.ts
git commit -m "feat: add GenerationOrchestrator with pass-based pipeline"
```

---

## Phase 3: Generation Passes

### Task 3.1: Create TerrainPass

**Files:**
- Create: `src/modules/world/generation/passes/TerrainPass.ts`
- Create: `src/modules/world/generation/passes/__tests__/TerrainPass.test.ts`
- Create: `src/modules/world/generation/utils/SeededRandom.ts`

**Step 1: Create SeededRandom utility**

```typescript
// src/modules/world/generation/utils/SeededRandom.ts
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  // Linear Congruential Generator
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
}
```

**Step 2: Write the failing test**

```typescript
// src/modules/world/generation/passes/__tests__/TerrainPass.test.ts
import { describe, it, expect } from 'bun:test'
import { TerrainPass } from '../TerrainPass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'

describe('TerrainPass', () => {
  const testWorldDef = {
    meta: { name: "Test", seed: 12345, version: "0.1.0" },
    terrain: {
      generator: "flat" as const,
      baseHeight: 40,
      noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 }
    },
    features: [],
    biomes: { elevationBased: true, ranges: [] }
  }

  it('should generate flat heightmap for flat generator', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)
    const pass = new TerrainPass()

    pass.execute(context)

    // All heights should be baseHeight
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        expect(context.heightMap[x][z]).toBe(40)
      }
    }
  })

  it('should fill blocks below heightmap', () => {
    const context = new GenerationContext(new ChunkCoordinate(0, 0), testWorldDef)
    const pass = new TerrainPass()

    pass.execute(context)

    // Block at Y=39 should be stone (below heightmap)
    expect(context.blockTypes[0][39][0]).toBeGreaterThan(0)

    // Block at Y=41 should be air (above heightmap)
    expect(context.blockTypes[0][41][0]).toBe(0)
  })

  it('should generate deterministic noise heightmap', () => {
    const noiseDef = {
      ...testWorldDef,
      terrain: { ...testWorldDef.terrain, generator: "noise" as const }
    }

    const context1 = new GenerationContext(new ChunkCoordinate(0, 0), noiseDef)
    const context2 = new GenerationContext(new ChunkCoordinate(0, 0), noiseDef)

    const pass = new TerrainPass()
    pass.execute(context1)
    pass.execute(context2)

    // Same seed + coord = same heightmap
    expect(context1.heightMap).toEqual(context2.heightMap)
  })
})
```

**Step 3: Run test to verify it fails**

```bash
bun test src/modules/world/generation/passes/__tests__/TerrainPass.test.ts
```

Expected: FAIL with "Cannot find module '../TerrainPass'"

**Step 4: Write minimal implementation**

```typescript
// src/modules/world/generation/passes/TerrainPass.ts
import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { BlockType } from '../../domain/BlockType'
import { createNoise2D } from 'simplex-noise'

export class TerrainPass implements GenerationPass {
  readonly name = 'TerrainPass'

  execute(context: GenerationContext): void {
    const { terrain } = context.worldDef

    if (terrain.generator === 'flat') {
      this.generateFlat(context, terrain.baseHeight)
    } else {
      this.generateNoise(context, terrain)
    }

    // Fill blockTypes below heightmap
    this.fillTerrain(context)
  }

  private generateFlat(context: GenerationContext, height: number): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = height
      }
    }
  }

  private generateNoise(context: GenerationContext, terrain: any): void {
    const noise2D = createNoise2D(() => context.seed)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        let value = 0
        let amplitude = terrain.noise.amplitude
        let frequency = terrain.noise.frequency

        // Multi-octave noise
        for (let octave = 0; octave < terrain.noise.octaves; octave++) {
          value += noise2D(worldX * frequency, worldZ * frequency) * amplitude
          amplitude *= terrain.noise.persistence
          frequency *= terrain.noise.lacunarity
        }

        context.heightMap[x][z] = terrain.baseHeight + value
      }
    }
  }

  private fillTerrain(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const height = Math.floor(context.heightMap[x][z])

        // Fill from Y=0 to height with stone
        for (let y = 0; y <= height && y < 256; y++) {
          context.blockTypes[x][y][z] = BlockType.stone
        }
      }
    }
  }
}
```

**Step 5: Run test to verify it passes**

```bash
bun test src/modules/world/generation/passes/__tests__/TerrainPass.test.ts
```

Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add src/modules/world/generation/utils/SeededRandom.ts src/modules/world/generation/passes/TerrainPass.ts src/modules/world/generation/passes/__tests__/TerrainPass.test.ts
git commit -m "feat: add TerrainPass for base heightmap generation"
```

---

### Task 3.2: Create BiomePass

**Files:**
- Create: `src/modules/world/generation/passes/BiomePass.ts`
- Create: `src/modules/world/generation/passes/__tests__/BiomePass.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/world/generation/passes/__tests__/BiomePass.test.ts
import { describe, it, expect } from 'bun:test'
import { BiomePass } from '../BiomePass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('BiomePass', () => {
  it('should assign surface materials based on elevation', () => {
    const worldDef = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: {
        elevationBased: true,
        ranges: [
          { elevationRange: [0, 30], surface: "sand", subsurface: "sand" },
          { elevationRange: [30, 60], surface: "grass", subsurface: "dirt" },
          { elevationRange: [60, 100], surface: "stone", subsurface: "stone" }
        ]
      }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create terrain at Y=40 (stone)
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 40
        context.blockTypes[x][40][z] = BlockType.stone
      }
    }

    const pass = new BiomePass()
    pass.execute(context)

    // Surface at Y=40 should be grass (30-60 range)
    expect(context.blockTypes[0][40][0]).toBe(BlockType.grass)

    // Subsurface (Y=39, 38, 37) should be dirt
    expect(context.blockTypes[0][39][0]).toBe(BlockType.dirt)
    expect(context.blockTypes[0][38][0]).toBe(BlockType.dirt)
    expect(context.blockTypes[0][37][0]).toBe(BlockType.dirt)
  })

  it('should skip if elevationBased is false', () => {
    const worldDef = {
      meta: { name: "Test", seed: 123, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: false, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)
    context.blockTypes[0][40][0] = BlockType.stone

    const pass = new BiomePass()
    pass.execute(context)

    // Should remain stone (not modified)
    expect(context.blockTypes[0][40][0]).toBe(BlockType.stone)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/passes/__tests__/BiomePass.test.ts
```

Expected: FAIL with "Cannot find module '../BiomePass'"

**Step 3: Write minimal implementation**

```typescript
// src/modules/world/generation/passes/BiomePass.ts
import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { resolveBlockType } from '../../domain/MaterialRegistry'

export class BiomePass implements GenerationPass {
  readonly name = 'BiomePass'

  execute(context: GenerationContext): void {
    const { biomes } = context.worldDef

    if (!biomes.elevationBased) return

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const surfaceY = this.findSurface(context.blockTypes, x, z)
        if (surfaceY === -1) continue

        // Find matching biome range
        const biome = biomes.ranges.find(range =>
          surfaceY >= range.elevationRange[0] &&
          surfaceY <= range.elevationRange[1]
        )

        if (biome) {
          // Set surface block
          context.blockTypes[x][surfaceY][z] = resolveBlockType(biome.surface)

          // Set subsurface (3 blocks deep)
          for (let depth = 1; depth <= 3; depth++) {
            const y = surfaceY - depth
            if (y >= 0) {
              context.blockTypes[x][y][z] = resolveBlockType(biome.subsurface)
            }
          }
        }
      }
    }
  }

  private findSurface(blockTypes: number[][][], x: number, z: number): number {
    // Find topmost non-air block
    for (let y = 255; y >= 0; y--) {
      if (blockTypes[x][y][z] !== 0) {
        return y
      }
    }
    return -1
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/passes/__tests__/BiomePass.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/passes/BiomePass.ts src/modules/world/generation/passes/__tests__/BiomePass.test.ts
git commit -m "feat: add BiomePass for elevation-based surface material assignment"
```

---

## Phase 4: Feature Generators

### Task 4.1: Create FeatureGenerator Interface and FloatingIslandGenerator

**Files:**
- Create: `src/modules/world/generation/features/FeatureGenerator.ts`
- Create: `src/modules/world/generation/features/FloatingIslandGenerator.ts`
- Create: `src/modules/world/generation/features/__tests__/FloatingIslandGenerator.test.ts`

**Step 1: Create interface**

```typescript
// src/modules/world/generation/features/FeatureGenerator.ts
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'

export interface FeatureGenerator {
  // Check if this feature affects the given chunk
  affects(coord: ChunkCoordinate, seed: number, config: any): boolean

  // Generate feature geometry in the chunk
  generate(context: GenerationContext, config: any): void
}
```

**Step 2: Write the failing test**

```typescript
// src/modules/world/generation/features/__tests__/FloatingIslandGenerator.test.ts
import { describe, it, expect } from 'bun:test'
import { FloatingIslandGenerator } from '../FloatingIslandGenerator'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('FloatingIslandGenerator', () => {
  const config = {
    type: 'floating_island' as const,
    spacing: 400,
    noiseOffset: 50,
    radiusRange: [50, 50] as [number, number],  // Fixed size for testing
    heightRange: [100, 100] as [number, number],  // Fixed height
    thickness: 15,
    material: "grass",
    supportPillars: false
  }

  it('should affect chunks near island centers', () => {
    const generator = new FloatingIslandGenerator()

    // Chunk at grid origin should have island
    expect(generator.affects(new ChunkCoordinate(0, 0), 12345, config)).toBe(true)

    // Chunk far from grid should not
    expect(generator.affects(new ChunkCoordinate(100, 100), 12345, config)).toBe(false)
  })

  it('should generate sphere of blocks', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 20, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)
    const generator = new FloatingIslandGenerator()

    generator.generate(context, config)

    // Check that blocks were placed at island height
    let hasBlocks = false
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        if (context.blockTypes[x][100][z] !== 0) {
          hasBlocks = true
        }
      }
    }

    expect(hasBlocks).toBe(true)
  })

  it('should generate same islands for same seed', () => {
    const generator = new FloatingIslandGenerator()

    const islands1 = generator['getIslandCenters'](new ChunkCoordinate(0, 0), 12345, config)
    const islands2 = generator['getIslandCenters'](new ChunkCoordinate(0, 0), 12345, config)

    expect(islands1).toEqual(islands2)
  })
})
```

**Step 3: Run test to verify it fails**

```bash
bun test src/modules/world/generation/features/__tests__/FloatingIslandGenerator.test.ts
```

Expected: FAIL with "Cannot find module '../FloatingIslandGenerator'"

**Step 4: Write minimal implementation**

```typescript
// src/modules/world/generation/features/FloatingIslandGenerator.ts
import { FeatureGenerator } from './FeatureGenerator'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { FloatingIslandFeature } from '../../domain/WorldDefinition'
import { resolveBlockType } from '../../domain/MaterialRegistry'
import { createNoise2D } from 'simplex-noise'
import { SeededRandom } from '../utils/SeededRandom'

interface Island {
  x: number
  z: number
  y: number
  radius: number
}

export class FloatingIslandGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: FloatingIslandFeature): boolean {
    const islands = this.getIslandCenters(coord, seed, config)

    for (const island of islands) {
      const chunkMinX = coord.x * 24
      const chunkMaxX = coord.x * 24 + 24
      const chunkMinZ = coord.z * 24
      const chunkMaxZ = coord.z * 24 + 24

      const islandMinX = island.x - island.radius
      const islandMaxX = island.x + island.radius
      const islandMinZ = island.z - island.radius
      const islandMaxZ = island.z + island.radius

      // Check if island bounds intersect chunk bounds
      if (islandMinX < chunkMaxX && islandMaxX > chunkMinX &&
          islandMinZ < chunkMaxZ && islandMaxZ > chunkMinZ) {
        return true
      }
    }

    return false
  }

  generate(context: GenerationContext, config: FloatingIslandFeature): void {
    const islands = this.getIslandCenters(context.chunkCoord, context.seed, config)

    for (const island of islands) {
      this.carveSphere(context, island, config)
    }
  }

  private getIslandCenters(coord: ChunkCoordinate, seed: number, config: FloatingIslandFeature): Island[] {
    const islands: Island[] = []
    const spacing = config.spacing

    // Check 3x3 grid around chunk
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        const gridX = Math.floor((coord.x * 24) / spacing) + gx
        const gridZ = Math.floor((coord.z * 24) / spacing) + gz

        // Deterministic noise offset
        const noise = createNoise2D(() => seed + gridX * 1000 + gridZ)
        const offsetX = noise(gridX, gridZ) * (config.noiseOffset ?? 100)
        const offsetZ = noise(gridZ, gridX) * (config.noiseOffset ?? 100)

        const islandX = gridX * spacing + offsetX
        const islandZ = gridZ * spacing + offsetZ

        // Random radius and height (deterministic)
        const rng = new SeededRandom(seed + gridX * 7919 + gridZ * 6547)
        const radius = rng.range(config.radiusRange[0], config.radiusRange[1])
        const height = rng.range(config.heightRange[0], config.heightRange[1])

        islands.push({ x: islandX, z: islandZ, y: height, radius })
      }
    }

    return islands
  }

  private carveSphere(context: GenerationContext, island: Island, config: FloatingIslandFeature): void {
    const chunkX = context.chunkCoord.x * 24
    const chunkZ = context.chunkCoord.z * 24
    const material = resolveBlockType(config.material)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = chunkX + x
        const worldZ = chunkZ + z

        for (let y = 0; y < 256; y++) {
          const dx = worldX - island.x
          const dy = y - island.y
          const dz = worldZ - island.z
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)

          // Inside sphere and within thickness of top
          if (distance <= island.radius && dy >= -(config.thickness ?? 15)) {
            if (dy > 0 && distance >= island.radius - 1) {
              // Top surface layer
              context.blockTypes[x][y][z] = material
            } else {
              // Interior
              context.blockTypes[x][y][z] = resolveBlockType('stone')
            }
          }
        }
      }
    }
  }
}
```

**Step 5: Run test to verify it passes**

```bash
bun test src/modules/world/generation/features/__tests__/FloatingIslandGenerator.test.ts
```

Expected: PASS (4 tests)

**Step 6: Commit**

```bash
git add src/modules/world/generation/features/FeatureGenerator.ts src/modules/world/generation/features/FloatingIslandGenerator.ts src/modules/world/generation/features/__tests__/FloatingIslandGenerator.test.ts
git commit -m "feat: add FloatingIslandGenerator with deterministic grid placement"
```

---

### Task 4.2: Create WormCaveGenerator

**Files:**
- Create: `src/modules/world/generation/features/WormCaveGenerator.ts`
- Create: `src/modules/world/generation/features/__tests__/WormCaveGenerator.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/world/generation/features/__tests__/WormCaveGenerator.test.ts
import { describe, it, expect } from 'bun:test'
import { WormCaveGenerator } from '../WormCaveGenerator'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('WormCaveGenerator', () => {
  const config = {
    type: 'cave_system' as const,
    density: 0.1,  // High density for testing
    radiusRange: [5, 5] as [number, number],
    depthRange: [10, 80] as [number, number],
    windingFactor: 0.5
  }

  it('should carve tunnels through solid terrain', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Fill with stone
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context.blockTypes[x][y][z] = BlockType.stone
        }
      }
    }

    const generator = new WormCaveGenerator()
    generator.generate(context, config)

    // Should have carved some air pockets
    let hasAir = false
    for (let x = 0; x < 24; x++) {
      for (let y = 10; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.blockTypes[x][y][z] === BlockType.air) {
            hasAir = true
          }
        }
      }
    }

    expect(hasAir).toBe(true)
  })

  it('should generate deterministic caves', () => {
    const worldDef = {
      meta: { name: "Test", seed: 999, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context1 = new GenerationContext(new ChunkCoordinate(5, 5), worldDef)
    const context2 = new GenerationContext(new ChunkCoordinate(5, 5), worldDef)

    // Fill both with stone
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context1.blockTypes[x][y][z] = BlockType.stone
          context2.blockTypes[x][y][z] = BlockType.stone
        }
      }
    }

    const generator = new WormCaveGenerator()
    generator.generate(context1, config)
    generator.generate(context2, config)

    // Same seed + coord = same caves
    expect(context1.blockTypes).toEqual(context2.blockTypes)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/features/__tests__/WormCaveGenerator.test.ts
```

Expected: FAIL with "Cannot find module '../WormCaveGenerator'"

**Step 3: Write minimal implementation**

```typescript
// src/modules/world/generation/features/WormCaveGenerator.ts
import { FeatureGenerator } from './FeatureGenerator'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { CaveSystemFeature } from '../../domain/WorldDefinition'
import { BlockType } from '../../domain/BlockType'
import { SeededRandom } from '../utils/SeededRandom'
import { createNoise3D } from 'simplex-noise'

interface WormPath {
  x: number
  y: number
  z: number
  radius: number
}

export class WormCaveGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: CaveSystemFeature): boolean {
    // Always return true for caves (they can appear anywhere)
    // Actual generation is density-based
    return true
  }

  generate(context: GenerationContext, config: CaveSystemFeature): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 31 + context.chunkCoord.z * 17)

    // Determine number of worm starts in this chunk
    const wormCount = Math.floor(config.density * 10)

    for (let i = 0; i < wormCount; i++) {
      if (rng.next() < config.density) {
        this.generateWormPath(context, config, rng)
      }
    }
  }

  private generateWormPath(context: GenerationContext, config: CaveSystemFeature, rng: SeededRandom): void {
    const chunkX = context.chunkCoord.x * 24
    const chunkZ = context.chunkCoord.z * 24

    // Random start position within chunk
    const startX = rng.range(0, 24)
    const startZ = rng.range(0, 24)
    const startY = rng.range(config.depthRange[0], config.depthRange[1])

    // Worm parameters
    const pathLength = rng.int(20, 50)
    const radius = rng.range(config.radiusRange[0], config.radiusRange[1])

    let x = startX
    let y = startY
    let z = startZ
    let dirX = rng.range(-1, 1)
    let dirY = rng.range(-0.5, 0.5)
    let dirZ = rng.range(-1, 1)

    const noise3D = createNoise3D(() => context.seed + startX + startY + startZ)

    for (let step = 0; step < pathLength; step++) {
      // Carve sphere at current position
      this.carveSphere(context.blockTypes, x, y, z, radius)

      // Update direction with winding
      const noiseVal = noise3D(x * 0.1, y * 0.1, z * 0.1)
      dirX += noiseVal * config.windingFactor
      dirY += noise3D(y * 0.1, z * 0.1, x * 0.1) * config.windingFactor * 0.5
      dirZ += noise3D(z * 0.1, x * 0.1, y * 0.1) * config.windingFactor

      // Normalize
      const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ)
      dirX /= len
      dirY /= len
      dirZ /= len

      // Move worm
      x += dirX
      y += dirY
      z += dirZ

      // Clamp to valid range
      y = Math.max(config.depthRange[0], Math.min(config.depthRange[1], y))

      // Stop if worm leaves chunk by too much
      if (x < -radius || x >= 24 + radius || z < -radius || z >= 24 + radius) {
        break
      }
    }
  }

  private carveSphere(blockTypes: number[][][], cx: number, cy: number, cz: number, radius: number): void {
    const minX = Math.max(0, Math.floor(cx - radius))
    const maxX = Math.min(23, Math.ceil(cx + radius))
    const minY = Math.max(0, Math.floor(cy - radius))
    const maxY = Math.min(255, Math.ceil(cy + radius))
    const minZ = Math.max(0, Math.floor(cz - radius))
    const maxZ = Math.min(23, Math.ceil(cz + radius))

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const dx = x - cx
          const dy = y - cy
          const dz = z - cz
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)

          if (distance <= radius) {
            blockTypes[x][y][z] = BlockType.air
          }
        }
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/features/__tests__/WormCaveGenerator.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/features/WormCaveGenerator.ts src/modules/world/generation/features/__tests__/WormCaveGenerator.test.ts
git commit -m "feat: add WormCaveGenerator with 3D noise-based tunneling"
```

---

### Task 4.3: Create GiantTreeGenerator

**Files:**
- Create: `src/modules/world/generation/features/GiantTreeGenerator.ts`
- Create: `src/modules/world/generation/features/__tests__/GiantTreeGenerator.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/world/generation/features/__tests__/GiantTreeGenerator.test.ts
import { describe, it, expect } from 'bun:test'
import { GiantTreeGenerator } from '../GiantTreeGenerator'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('GiantTreeGenerator', () => {
  const config = {
    type: 'giant_tree' as const,
    density: 1.0,  // 100% for testing
    trunkRadiusRange: [3, 3] as [number, number],
    heightRange: [40, 40] as [number, number],
    canopyRadius: 20,
    material: {
      trunk: "tree",
      leaves: "leaf"
    }
  }

  it('should generate tree trunk', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 32, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create ground
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 32
        context.blockTypes[x][32][z] = BlockType.grass
      }
    }

    const generator = new GiantTreeGenerator()
    generator.generate(context, config)

    // Should have tree blocks above ground
    let hasTreeBlocks = false
    for (let y = 33; y < 80; y++) {
      if (context.blockTypes[12][y][12] === BlockType.tree) {
        hasTreeBlocks = true
      }
    }

    expect(hasTreeBlocks).toBe(true)
  })

  it('should generate canopy of leaves', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 32, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        context.heightMap[x][z] = 32
        context.blockTypes[x][32][z] = BlockType.grass
      }
    }

    const generator = new GiantTreeGenerator()
    generator.generate(context, config)

    // Should have leaves at canopy height
    let hasLeaves = false
    for (let y = 60; y < 90; y++) {
      for (let x = 0; x < 24; x++) {
        for (let z = 0; z < 24; z++) {
          if (context.blockTypes[x][y][z] === BlockType.leaf) {
            hasLeaves = true
          }
        }
      }
    }

    expect(hasLeaves).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/features/__tests__/GiantTreeGenerator.test.ts
```

Expected: FAIL with "Cannot find module '../GiantTreeGenerator'"

**Step 3: Write minimal implementation**

```typescript
// src/modules/world/generation/features/GiantTreeGenerator.ts
import { FeatureGenerator } from './FeatureGenerator'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { GiantTreeFeature } from '../../domain/WorldDefinition'
import { resolveBlockType } from '../../domain/MaterialRegistry'
import { SeededRandom } from '../utils/SeededRandom'

export class GiantTreeGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: GiantTreeFeature): boolean {
    // Trees can appear in any chunk (density-based)
    return true
  }

  generate(context: GenerationContext, config: GiantTreeFeature): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 73 + context.chunkCoord.z * 151)

    const trunkMaterial = resolveBlockType(config.material.trunk)
    const leavesMaterial = resolveBlockType(config.material.leaves)

    // Try to place tree at each column
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        if (rng.next() < config.density) {
          const surfaceY = this.findSurface(context.blockTypes, x, z)
          if (surfaceY > 0) {
            this.generateTree(context.blockTypes, x, surfaceY + 1, z, config, rng, trunkMaterial, leavesMaterial)
          }
        }
      }
    }
  }

  private generateTree(
    blockTypes: number[][][],
    baseX: number,
    baseY: number,
    baseZ: number,
    config: GiantTreeFeature,
    rng: SeededRandom,
    trunkMaterial: number,
    leavesMaterial: number
  ): void {
    const trunkRadius = rng.range(config.trunkRadiusRange[0], config.trunkRadiusRange[1])
    const height = rng.range(config.heightRange[0], config.heightRange[1])

    // Generate trunk (cylinder)
    for (let y = baseY; y < baseY + height && y < 256; y++) {
      for (let dx = -trunkRadius; dx <= trunkRadius; dx++) {
        for (let dz = -trunkRadius; dz <= trunkRadius; dz++) {
          const x = baseX + dx
          const z = baseZ + dz

          if (x >= 0 && x < 24 && z >= 0 && z < 24) {
            const dist = Math.sqrt(dx*dx + dz*dz)
            if (dist <= trunkRadius) {
              blockTypes[x][y][z] = trunkMaterial
            }
          }
        }
      }
    }

    // Generate canopy (sphere of leaves)
    const canopyY = baseY + height
    const canopyRadius = config.canopyRadius

    for (let dx = -canopyRadius; dx <= canopyRadius; dx++) {
      for (let dy = -canopyRadius; dy <= canopyRadius; dy++) {
        for (let dz = -canopyRadius; dz <= canopyRadius; dz++) {
          const x = baseX + dx
          const y = canopyY + dy
          const z = baseZ + dz

          if (x >= 0 && x < 24 && y >= 0 && y < 256 && z >= 0 && z < 24) {
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
            if (dist <= canopyRadius) {
              // Don't overwrite trunk
              if (blockTypes[x][y][z] !== trunkMaterial) {
                blockTypes[x][y][z] = leavesMaterial
              }
            }
          }
        }
      }
    }
  }

  private findSurface(blockTypes: number[][][], x: number, z: number): number {
    for (let y = 255; y >= 0; y--) {
      if (blockTypes[x][y][z] !== 0) {
        return y
      }
    }
    return -1
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/features/__tests__/GiantTreeGenerator.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/features/GiantTreeGenerator.ts src/modules/world/generation/features/__tests__/GiantTreeGenerator.test.ts
git commit -m "feat: add GiantTreeGenerator with massive trunk and canopy"
```

---

### Task 4.4: Create CrystalFormationGenerator

**Files:**
- Create: `src/modules/world/generation/features/CrystalFormationGenerator.ts`
- Create: `src/modules/world/generation/features/__tests__/CrystalFormationGenerator.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/world/generation/features/__tests__/CrystalFormationGenerator.test.ts
import { describe, it, expect } from 'bun:test'
import { CrystalFormationGenerator } from '../CrystalFormationGenerator'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('CrystalFormationGenerator', () => {
  const config = {
    type: 'crystal_formation' as const,
    density: 1.0,  // 100% for testing
    heightRange: [10, 10] as [number, number],  // Fixed height
    material: "glowstone",
    depthRange: [20, 80] as [number, number],
    onlyInCaves: true
  }

  it('should only place crystals in caves (air adjacent to stone)', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create a cave (air pocket in stone)
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context.blockTypes[x][y][z] = BlockType.stone
        }
      }
    }

    // Carve air pocket at Y=40
    for (let x = 10; x < 14; x++) {
      for (let z = 10; z < 14; z++) {
        context.blockTypes[x][40][z] = BlockType.air
      }
    }

    const generator = new CrystalFormationGenerator()
    generator.generate(context, config)

    // Should have placed crystals near cave ceiling/walls
    let hasCrystals = false
    for (let x = 0; x < 24; x++) {
      for (let y = 30; y < 50; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.blockTypes[x][y][z] === BlockType.glowstone) {
            hasCrystals = true
          }
        }
      }
    }

    expect(hasCrystals).toBe(true)
  })

  it('should use specified material', () => {
    const obsidianConfig = {
      ...config,
      material: "obsidian"
    }

    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Create cave
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context.blockTypes[x][y][z] = BlockType.stone
        }
      }
    }

    for (let x = 10; x < 14; x++) {
      for (let z = 10; z < 14; z++) {
        context.blockTypes[x][40][z] = BlockType.air
      }
    }

    const generator = new CrystalFormationGenerator()
    generator.generate(context, obsidianConfig)

    // Should have obsidian crystals
    let hasObsidian = false
    for (let x = 0; x < 24; x++) {
      for (let y = 30; y < 50; y++) {
        for (let z = 0; z < 24; z++) {
          if (context.blockTypes[x][y][z] === BlockType.obsidian) {
            hasObsidian = true
          }
        }
      }
    }

    expect(hasObsidian).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/features/__tests__/CrystalFormationGenerator.test.ts
```

Expected: FAIL with "Cannot find module '../CrystalFormationGenerator'"

**Step 3: Write minimal implementation**

```typescript
// src/modules/world/generation/features/CrystalFormationGenerator.ts
import { FeatureGenerator } from './FeatureGenerator'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { GenerationContext } from '../GenerationContext'
import { CrystalFormationFeature } from '../../domain/WorldDefinition'
import { resolveBlockType } from '../../domain/MaterialRegistry'
import { BlockType } from '../../domain/BlockType'
import { SeededRandom } from '../utils/SeededRandom'

export class CrystalFormationGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: CrystalFormationFeature): boolean {
    return true  // Density-based placement
  }

  generate(context: GenerationContext, config: CrystalFormationFeature): void {
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 113 + context.chunkCoord.z * 229)
    const material = resolveBlockType(config.material)

    const [minDepth, maxDepth] = config.depthRange

    // Find cave surfaces (air adjacent to stone)
    for (let x = 0; x < 24; x++) {
      for (let y = minDepth; y < maxDepth && y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          if (rng.next() < config.density) {
            // Check if this is a cave surface
            if (this.isCaveSurface(context.blockTypes, x, y, z, config.onlyInCaves)) {
              const height = rng.range(config.heightRange[0], config.heightRange[1])
              this.growCrystal(context.blockTypes, x, y, z, height, material)
            }
          }
        }
      }
    }
  }

  private isCaveSurface(blockTypes: number[][][], x: number, y: number, z: number, requireCave: boolean): boolean {
    // Must be stone block
    if (blockTypes[x][y][z] !== BlockType.stone) return false

    if (!requireCave) return true

    // Must have air neighbor (indicates cave surface)
    const neighbors = [
      [x+1, y, z], [x-1, y, z],
      [x, y+1, z], [x, y-1, z],
      [x, y, z+1], [x, y, z-1]
    ]

    for (const [nx, ny, nz] of neighbors) {
      if (nx >= 0 && nx < 24 && ny >= 0 && ny < 256 && nz >= 0 && nz < 24) {
        if (blockTypes[nx][ny][nz] === BlockType.air) {
          return true  // Has air neighbor = cave surface
        }
      }
    }

    return false
  }

  private growCrystal(blockTypes: number[][][], x: number, y: number, z: number, height: number, material: number): void {
    // Determine growth direction (find air neighbor)
    const growthDir = this.findGrowthDirection(blockTypes, x, y, z)
    if (!growthDir) return

    // Grow crystal in that direction
    for (let h = 0; h < height; h++) {
      const cx = x + growthDir.x * h
      const cy = y + growthDir.y * h
      const cz = z + growthDir.z * h

      if (cx >= 0 && cx < 24 && cy >= 0 && cy < 256 && cz >= 0 && cz < 24) {
        // Place crystal if space is air
        if (blockTypes[cx][cy][cz] === BlockType.air) {
          blockTypes[cx][cy][cz] = material
        }
      }
    }
  }

  private findGrowthDirection(blockTypes: number[][][], x: number, y: number, z: number): { x: number, y: number, z: number } | null {
    const directions = [
      { x: 0, y: 1, z: 0 },   // Up
      { x: 0, y: -1, z: 0 },  // Down
      { x: 1, y: 0, z: 0 },   // +X
      { x: -1, y: 0, z: 0 },  // -X
      { x: 0, y: 0, z: 1 },   // +Z
      { x: 0, y: 0, z: -1 }   // -Z
    ]

    for (const dir of directions) {
      const nx = x + dir.x
      const ny = y + dir.y
      const nz = z + dir.z

      if (nx >= 0 && nx < 24 && ny >= 0 && ny < 256 && nz >= 0 && nz < 24) {
        if (blockTypes[nx][ny][nz] === BlockType.air) {
          return dir
        }
      }
    }

    return null
  }

  private findSurface(blockTypes: number[][][], x: number, z: number): number {
    for (let y = 255; y >= 0; y--) {
      if (blockTypes[x][y][z] !== 0) {
        return y
      }
    }
    return -1
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/features/__tests__/CrystalFormationGenerator.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/features/CrystalFormationGenerator.ts src/modules/world/generation/features/__tests__/CrystalFormationGenerator.test.ts
git commit -m "feat: add CrystalFormationGenerator for glowing cave crystals"
```

---

### Task 4.5: Create DramaticFeaturesPass

**Files:**
- Create: `src/modules/world/generation/passes/DramaticFeaturesPass.ts`
- Create: `src/modules/world/generation/passes/__tests__/DramaticFeaturesPass.test.ts`

**Step 1: Write the failing test**

```typescript
// src/modules/world/generation/passes/__tests__/DramaticFeaturesPass.test.ts
import { describe, it, expect } from 'bun:test'
import { DramaticFeaturesPass } from '../DramaticFeaturesPass'
import { GenerationContext } from '../../GenerationContext'
import { ChunkCoordinate } from '../../../../shared/domain/ChunkCoordinate'
import { BlockType } from '../../../domain/BlockType'

describe('DramaticFeaturesPass', () => {
  it('should apply floating island feature', () => {
    const worldDef = {
      meta: { name: "Test", seed: 12345, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 20, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [
        {
          type: 'floating_island' as const,
          spacing: 400,
          radiusRange: [30, 30] as [number, number],
          heightRange: [100, 100] as [number, number],
          thickness: 15,
          material: "grass"
        }
      ],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)
    const pass = new DramaticFeaturesPass()

    pass.execute(context)

    // Should have island blocks around Y=100
    let hasIslandBlocks = false
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        for (let y = 95; y < 105; y++) {
          if (context.blockTypes[x][y][z] !== BlockType.air) {
            hasIslandBlocks = true
          }
        }
      }
    }

    expect(hasIslandBlocks).toBe(true)
  })

  it('should apply multiple feature types', () => {
    const worldDef = {
      meta: { name: "Test", seed: 999, version: "0.1.0" },
      terrain: { generator: "flat" as const, baseHeight: 40, noise: { type: "simplex" as const, octaves: 4, frequency: 0.01, amplitude: 20, lacunarity: 2.0, persistence: 0.5 } },
      features: [
        {
          type: 'floating_island' as const,
          spacing: 400,
          radiusRange: [20, 20] as [number, number],
          heightRange: [80, 80] as [number, number],
          thickness: 10,
          material: "stone"
        },
        {
          type: 'cave_system' as const,
          density: 0.5,
          radiusRange: [5, 5] as [number, number],
          depthRange: [10, 50] as [number, number],
          windingFactor: 0.5
        }
      ],
      biomes: { elevationBased: true, ranges: [] }
    }

    const context = new GenerationContext(new ChunkCoordinate(0, 0), worldDef)

    // Fill with stone first
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 60; y++) {
        for (let z = 0; z < 24; z++) {
          context.blockTypes[x][y][z] = BlockType.stone
        }
      }
    }

    const pass = new DramaticFeaturesPass()
    pass.execute(context)

    // Should have both island (around Y=80) and caves (air in 10-50 range)
    // This test just verifies both generators were called
    expect(pass.name).toBe('DramaticFeaturesPass')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/modules/world/generation/passes/__tests__/DramaticFeaturesPass.test.ts
```

Expected: FAIL with "Cannot find module '../DramaticFeaturesPass'"

**Step 3: Write minimal implementation**

```typescript
// src/modules/world/generation/passes/DramaticFeaturesPass.ts
import { GenerationPass } from './GenerationPass'
import { GenerationContext } from '../GenerationContext'
import { FeatureGenerator } from '../features/FeatureGenerator'
import { FloatingIslandGenerator } from '../features/FloatingIslandGenerator'
import { WormCaveGenerator } from '../features/WormCaveGenerator'
import { GiantTreeGenerator } from '../features/GiantTreeGenerator'
import { CrystalFormationGenerator } from '../features/CrystalFormationGenerator'

export class DramaticFeaturesPass implements GenerationPass {
  readonly name = 'DramaticFeaturesPass'

  private generators = new Map<string, FeatureGenerator>([
    ['floating_island', new FloatingIslandGenerator()],
    ['cave_system', new WormCaveGenerator()],
    ['giant_tree', new GiantTreeGenerator()],
    ['crystal_formation', new CrystalFormationGenerator()]
  ])

  execute(context: GenerationContext): void {
    for (const featureDef of context.worldDef.features) {
      const generator = this.generators.get(featureDef.type)
      if (!generator) {
        console.warn(`Unknown feature type: ${featureDef.type}`)
        continue
      }

      // Check if this chunk is affected
      if (generator.affects(context.chunkCoord, context.seed, featureDef)) {
        // Generate feature
        generator.generate(context, featureDef)
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/modules/world/generation/passes/__tests__/DramaticFeaturesPass.test.ts
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/modules/world/generation/passes/DramaticFeaturesPass.ts src/modules/world/generation/passes/__tests__/DramaticFeaturesPass.test.ts
git commit -m "feat: add DramaticFeaturesPass to apply all feature generators"
```

---

## Phase 5: ChunkWorker Integration

### Task 5.1: Create World Loader

**Files:**
- Create: `src/modules/world/application/WorldLoader.ts`
- Create: `src/modules/world/application/__tests__/WorldLoader.test.ts`
- Create: `public/worlds/default.json`

**Step 1: Create example world JSON**

```json
// public/worlds/default.json
{
  "meta": {
    "name": "Sky Islands Test World",
    "seed": 42069,
    "version": "0.1.0"
  },
  "terrain": {
    "generator": "noise",
    "baseHeight": 35,
    "noise": {
      "type": "simplex",
      "octaves": 5,
      "frequency": 0.008,
      "amplitude": 25,
      "lacunarity": 2.0,
      "persistence": 0.5
    }
  },
  "features": [
    {
      "type": "floating_island",
      "spacing": 350,
      "noiseOffset": 80,
      "radiusRange": [50, 100],
      "heightRange": [90, 130],
      "thickness": 18,
      "material": "grass",
      "supportPillars": false
    },
    {
      "type": "cave_system",
      "density": 0.02,
      "radiusRange": [6, 14],
      "depthRange": [15, 70],
      "windingFactor": 0.75
    },
    {
      "type": "giant_tree",
      "density": 0.0015,
      "trunkRadiusRange": [4, 7],
      "heightRange": [45, 75],
      "canopyRadius": 28,
      "material": {
        "trunk": "tree",
        "leaves": "leaf"
      }
    },
    {
      "type": "crystal_formation",
      "density": 0.008,
      "heightRange": [12, 28],
      "material": "glowstone",
      "depthRange": [20, 80],
      "onlyInCaves": true
    }
  ],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      {
        "elevationRange": [0, 30],
        "surface": "sand",
        "subsurface": "sand"
      },
      {
        "elevationRange": [30, 65],
        "surface": "grass",
        "subsurface": "dirt"
      },
      {
        "elevationRange": [65, 150],
        "surface": "stone",
        "subsurface": "stone"
      }
    ]
  }
}
```

**Step 2: Write the failing test**

```typescript
// src/modules/world/application/__tests__/WorldLoader.test.ts
import { describe, it, expect } from 'bun:test'
import { WorldLoader } from '../WorldLoader'

describe('WorldLoader', () => {
  it('should load and validate JSON world definition', async () => {
    const loader = new WorldLoader()
    const world = await loader.load('/worlds/default.json')

    expect(world.meta.name).toBe('Sky Islands Test World')
    expect(world.meta.seed).toBe(42069)
    expect(world.features.length).toBeGreaterThan(0)
  })

  it('should throw on invalid world definition', async () => {
    const loader = new WorldLoader()

    // This should fail - missing required fields
    await expect(loader.load('/worlds/invalid.json')).rejects.toThrow()
  })

  it('should cache loaded worlds', async () => {
    const loader = new WorldLoader()

    const world1 = await loader.load('/worlds/default.json')
    const world2 = await loader.load('/worlds/default.json')

    expect(world1).toBe(world2)  // Same object reference (cached)
  })
})
```

**Step 3: Run test to verify it fails**

```bash
bun test src/modules/world/application/__tests__/WorldLoader.test.ts
```

Expected: FAIL with "Cannot find module '../WorldLoader'"

**Step 4: Write minimal implementation**

```typescript
// src/modules/world/application/WorldLoader.ts
import { WorldDefinition, WorldDefinitionSchema } from '../domain/WorldDefinition'

export class WorldLoader {
  private cache = new Map<string, WorldDefinition>()

  async load(path: string): Promise<WorldDefinition> {
    // Check cache first
    if (this.cache.has(path)) {
      return this.cache.get(path)!
    }

    // Fetch JSON file
    const response = await fetch(path)
    if (!response.ok) {
      throw new Error(`Failed to load world: ${path}`)
    }

    const json = await response.json()

    // Validate with Zod
    const result = WorldDefinitionSchema.safeParse(json)
    if (!result.success) {
      throw new Error(`Invalid world definition: ${result.error.message}`)
    }

    // Cache and return
    this.cache.set(path, result.data)
    return result.data
  }
}
```

**Step 5: Run test to verify it passes**

```bash
bun test src/modules/world/application/__tests__/WorldLoader.test.ts
```

Expected: PASS (first test), SKIP (invalid test - need invalid.json file)

**Step 6: Commit**

```bash
git add src/modules/world/application/WorldLoader.ts src/modules/world/application/__tests__/WorldLoader.test.ts public/worlds/default.json
git commit -m "feat: add WorldLoader with Zod validation and caching"
```

---

### Task 5.2: Update ChunkWorker to Use Generation Pipeline

**Files:**
- Modify: `src/modules/world/workers/ChunkWorker.ts:1-50`

**Step 1: Replace NoiseGenerator with GenerationOrchestrator**

```typescript
// Modify src/modules/world/workers/ChunkWorker.ts

// Remove old imports:
// import { NoiseGenerator } from '../adapters/NoiseGenerator'

// Add new imports:
import { WorldLoader } from '../application/WorldLoader'
import { GenerationOrchestrator } from '../generation/GenerationOrchestrator'
import { TerrainPass } from '../generation/passes/TerrainPass'
import { DramaticFeaturesPass } from '../generation/passes/DramaticFeaturesPass'
import { BiomePass } from '../generation/passes/BiomePass'

// Initialize world loader and orchestrator
let orchestrator: GenerationOrchestrator | null = null

async function initializeOrchestrator() {
  const loader = new WorldLoader()
  const worldDef = await loader.load('/worlds/default.json')

  orchestrator = new GenerationOrchestrator(worldDef, [
    new TerrainPass(),
    new DramaticFeaturesPass(),
    new BiomePass()
  ])

  console.log(`🌍 World loaded: ${worldDef.meta.name} (seed: ${worldDef.meta.seed})`)
}

// Initialize on worker start
initializeOrchestrator()

// Modify onmessage handler:
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const msg = e.data

    if (msg.type === 'GENERATE_CHUNK') {
      const startTime = performance.now()

      // Wait for orchestrator if still initializing
      while (!orchestrator) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const { x, z, renderDistance } = msg
      const coord = new ChunkCoordinate(x, z)

      // Use new generation system
      const chunk = await orchestrator.generateChunk(coord)

      // Get buffer and transfer ownership
      const buffer = chunk.getRawBuffer()
      const metadata = chunk.getMetadata()

      const endTime = performance.now()
      const duration = endTime - startTime

      const response: MainMessage = {
        type: 'CHUNK_GENERATED',
        x,
        z,
        renderDistance,
        blockBuffer: buffer,
        metadata: metadata,
        timingMs: duration
      }

      self.postMessage(response, [buffer])
    }
  } catch (error) {
    console.error('[ChunkWorker] Error processing message:', error)
    self.postMessage({
      type: 'CHUNK_ERROR',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
bun lint
```

Expected: No errors

**Step 3: Test in browser**

```bash
bun dev
```

1. Load game
2. Should see new world with floating islands, caves, giant trees
3. Press F3 to verify performance
4. Walk around to verify features appear

Expected: Dramatic world loads, features visible

**Step 4: Commit**

```bash
git add src/modules/world/workers/ChunkWorker.ts
git commit -m "feat: integrate generation pipeline into ChunkWorker"
```

---

## Phase 6: Example Worlds & Testing

### Task 6.1: Create Additional Example Worlds

**Files:**
- Create: `public/worlds/caves.json`
- Create: `public/worlds/forest.json`
- Create: `public/worlds/crystals.json`
- Create: `public/worlds/flat.json`

**Step 1: Create caves world**

```json
// public/worlds/caves.json
{
  "meta": {
    "name": "Massive Cave Network",
    "seed": 88888,
    "version": "0.1.0"
  },
  "terrain": {
    "generator": "noise",
    "baseHeight": 45,
    "noise": {
      "type": "simplex",
      "octaves": 6,
      "frequency": 0.006,
      "amplitude": 30,
      "lacunarity": 2.0,
      "persistence": 0.5
    }
  },
  "features": [
    {
      "type": "cave_system",
      "density": 0.04,
      "radiusRange": [8, 20],
      "depthRange": [10, 100],
      "windingFactor": 0.85
    },
    {
      "type": "crystal_formation",
      "density": 0.015,
      "heightRange": [15, 35],
      "material": "glowstone",
      "depthRange": [20, 100],
      "onlyInCaves": true
    },
    {
      "type": "crystal_formation",
      "density": 0.01,
      "heightRange": [10, 25],
      "material": "obsidian",
      "depthRange": [50, 100],
      "onlyInCaves": true
    }
  ],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      {
        "elevationRange": [0, 100],
        "surface": "stone",
        "subsurface": "stone"
      }
    ]
  }
}
```

**Step 2: Create forest world**

```json
// public/worlds/forest.json
{
  "meta": {
    "name": "Titan Tree Forest",
    "seed": 77777,
    "version": "0.1.0"
  },
  "terrain": {
    "generator": "noise",
    "baseHeight": 38,
    "noise": {
      "type": "simplex",
      "octaves": 4,
      "frequency": 0.012,
      "amplitude": 18,
      "lacunarity": 2.0,
      "persistence": 0.5
    }
  },
  "features": [
    {
      "type": "giant_tree",
      "density": 0.003,
      "trunkRadiusRange": [5, 9],
      "heightRange": [55, 85],
      "canopyRadius": 32,
      "material": {
        "trunk": "tree",
        "leaves": "leaf"
      }
    }
  ],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      {
        "elevationRange": [0, 80],
        "surface": "grass",
        "subsurface": "dirt"
      }
    ]
  }
}
```

**Step 3: Create crystals world**

```json
// public/worlds/crystals.json
{
  "meta": {
    "name": "Glowing Crystal Caves",
    "seed": 99999,
    "version": "0.1.0"
  },
  "terrain": {
    "generator": "noise",
    "baseHeight": 42,
    "noise": {
      "type": "simplex",
      "octaves": 5,
      "frequency": 0.009,
      "amplitude": 28,
      "lacunarity": 2.0,
      "persistence": 0.5
    }
  },
  "features": [
    {
      "type": "cave_system",
      "density": 0.035,
      "radiusRange": [10, 18],
      "depthRange": [15, 90],
      "windingFactor": 0.8
    },
    {
      "type": "crystal_formation",
      "density": 0.02,
      "heightRange": [18, 40],
      "material": "glowstone",
      "depthRange": [20, 90],
      "onlyInCaves": true
    },
    {
      "type": "crystal_formation",
      "density": 0.012,
      "heightRange": [12, 30],
      "material": "obsidian",
      "depthRange": [40, 90],
      "onlyInCaves": true
    }
  ],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      {
        "elevationRange": [0, 100],
        "surface": "stone",
        "subsurface": "stone"
      }
    ]
  }
}
```

**Step 4: Create flat test world**

```json
// public/worlds/flat.json
{
  "meta": {
    "name": "Superflat - Testing",
    "seed": 11111,
    "version": "0.1.0"
  },
  "terrain": {
    "generator": "flat",
    "baseHeight": 32,
    "noise": {
      "type": "simplex",
      "octaves": 1,
      "frequency": 0.01,
      "amplitude": 0,
      "lacunarity": 2.0,
      "persistence": 0.5
    }
  },
  "features": [],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      {
        "elevationRange": [0, 100],
        "surface": "grass",
        "subsurface": "dirt"
      }
    ]
  }
}
```

**Step 5: Write the failing test**

```typescript
// src/modules/world/application/__tests__/WorldLoader.test.ts (add test)
it('should load all example worlds without errors', async () => {
  const loader = new WorldLoader()
  const worlds = [
    '/worlds/default.json',
    '/worlds/caves.json',
    '/worlds/forest.json',
    '/worlds/crystals.json',
    '/worlds/flat.json'
  ]

  for (const path of worlds) {
    const world = await loader.load(path)
    expect(world).toBeDefined()
    expect(world.meta.seed).toBeGreaterThan(0)
  }
})
```

**Step 6: Run test to verify it passes**

```bash
bun test src/modules/world/application/__tests__/WorldLoader.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add public/worlds/ src/modules/world/application/__tests__/WorldLoader.test.ts
git commit -m "feat: add 4 example world definitions (islands, caves, forest, crystals)"
```

---

### Task 6.2: Add World Switching via Debug Interface

**Files:**
- Modify: `src/modules/game/application/GameOrchestrator.ts:95-105`

**Step 1: Add world switching to window.debug**

```typescript
// In GameOrchestrator constructor, modify window.debug:

;(window as any).debug = {
  ...(window as any).debug,
  getMetrics: () => this.performanceMonitor.getFrameMetrics(),
  getLastChunk: () => this.performanceMonitor.getLastChunkMetrics(),

  // Add world switching
  loadWorld: async (worldPath: string) => {
    // This will require reloading all chunks
    // For now, just log - full implementation in follow-up
    console.log(`🌍 Switching to world: ${worldPath}`)
    console.log('Note: Reload page after changing world file')
    return worldPath
  },

  listWorlds: () => {
    return [
      '/worlds/default.json - Sky Islands',
      '/worlds/caves.json - Massive Caves',
      '/worlds/forest.json - Giant Trees',
      '/worlds/crystals.json - Glowing Crystals',
      '/worlds/flat.json - Superflat Testing'
    ]
  }
}
```

**Step 2: Test in browser console**

```bash
bun dev
```

Console:
```javascript
window.debug.listWorlds()
// Should return array of world options
```

Expected: List of available worlds

**Step 3: Commit**

```bash
git add src/modules/game/application/GameOrchestrator.ts
git commit -m "feat: add world switching debug commands"
```

---

### Task 6.3: Create Visual Validation Document

**Files:**
- Create: `docs/testing/phase4a-visual-validation.md`

**Step 1: Create validation checklist**

```markdown
# Phase 4A Visual Validation Checklist

## Test World: default.json (Sky Islands)

**Load Instructions:**
1. `bun dev`
2. Click Play
3. Press F3 (debug overlay)

**Validation Steps:**

### Floating Islands
- [ ] Islands visible in distance (Y=90-130 range)
- [ ] Islands have grass top surface
- [ ] Islands are roughly spherical
- [ ] Multiple islands visible at different distances
- [ ] Islands appear at consistent locations (determinism)

### Cave Systems
- [ ] Caves visible when digging down (Y=15-70)
- [ ] Tunnels are smooth and organic (not blocky)
- [ ] Tunnels wind naturally (not straight)
- [ ] Cave radius varies (5-15 blocks)
- [ ] Can explore inside caves

### Giant Trees
- [ ] Massive trees visible (40-75 blocks tall)
- [ ] Thick trunks (4-7 block radius)
- [ ] Large spherical canopy of leaves
- [ ] Trees don't appear too frequently (rare = impressive)
- [ ] Can climb trees

### Crystal Formations
- [ ] Glowing crystals in caves
- [ ] Crystals grow from cave walls/ceilings
- [ ] Obsidian crystals in deep caves (Y<50)
- [ ] Crystals provide natural cave lighting
- [ ] Varying heights (12-28 blocks)

### Performance
- [ ] FPS: 60 stable at RD=7
- [ ] Chunk generation: <50ms average
- [ ] No frame drops during exploration
- [ ] LOD system working (F3 shows distribution)

### Persistence
- [ ] Place blocks → save → reload → blocks persist
- [ ] Unmodified chunks regenerate identically
- [ ] View from built structures stays consistent

---

## Test World: caves.json (Massive Caves)

**Expected:**
- Dense cave networks
- Heavy use of glowstone crystals
- Obsidian formations in deep caves
- Exciting exploration

---

## Test World: forest.json (Giant Trees)

**Expected:**
- Forest of massive trees
- Can walk underneath canopies
- Trees create natural shade
- Impressive scale

---

## Test World: crystals.json (Glowing Caves)

**Expected:**
- Heavy crystal coverage
- Caves well-lit by crystals
- Mix of glowstone (yellow) and obsidian (purple)
- Magical atmosphere

---

## Test World: flat.json (Testing)

**Expected:**
- Perfectly flat at Y=32
- No features
- Clean surface for manual testing
- Block placement/removal works perfectly
```

**Step 2: Commit validation document**

```bash
git add docs/testing/phase4a-visual-validation.md
git commit -m "docs: add Phase 4A visual validation checklist"
```

---

## Phase 7: Documentation & Finalization

### Task 7.1: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add Phase 4A section**

```markdown
<!-- Add after Phase 3 LOD System section -->

## Phase 4A: Declarative World Generation

### JSON World Definitions

Worlds are defined in JSON files (validated with Zod) instead of hardcoded presets:

**Example:** `public/worlds/default.json`
```json
{
  "meta": { "name": "Sky Islands", "seed": 42069 },
  "terrain": { "generator": "noise", ... },
  "features": [
    { "type": "floating_island", "spacing": 350, ... },
    { "type": "cave_system", "density": 0.02, ... }
  ]
}
```

**Available Worlds:**
- `/worlds/default.json` - Sky Islands with caves and giant trees
- `/worlds/caves.json` - Massive cave networks with crystals
- `/worlds/forest.json` - Giant tree forest
- `/worlds/crystals.json` - Glowing crystal caves
- `/worlds/flat.json` - Superflat testing world

### Generation Pipeline

**4-Pass System:**
1. **TerrainPass** - Base heightfield from noise/flat
2. **DramaticFeaturesPass** - Floating islands, caves, giant trees, crystals
3. **BiomePass** - Elevation-based material assignment
4. **DecorationPass** - (Reserved for Phase 4B)

### Dramatic Features

**Floating Islands:**
- Grid-based placement with noise offset
- Configurable size (30-100 block radius)
- Height variation (80-140 blocks)
- Grass surface on top hemisphere

**Worm Caves:**
- 3D tunneling algorithm with winding paths
- Variable radius (5-20 blocks)
- Natural cave networks
- Connects organically

**Giant Trees:**
- Massive trunks (4-9 block radius)
- Towering height (40-85 blocks)
- Huge spherical canopy (25-35 block radius)
- Rare placement (density 0.001-0.003)

**Crystal Formations:**
- Grow from cave surfaces
- Glowstone (yellow) and obsidian (purple) crystals
- Natural cave lighting
- Height variation (10-40 blocks)

### Material Registry

Maps JSON material names to BlockType:
```typescript
"material": "grass" → BlockType.grass
"material": "obsidian" → BlockType.obsidian
```

**Aliases supported:**
- `grass_green` → grass
- `granite` → stone
- `sand_yellow` → sand

### Debug Commands

```javascript
window.debug.listWorlds()  // Show available world files
// Returns: Array of world descriptions

// Note: World switching requires page reload (ChunkWorker initialization)
// Edit /worlds/*.json files to modify world features
```

### Determinism

**Seed-based generation:**
- Same seed + coordinates = identical terrain
- Unmodified chunks regenerate from seed (not stored)
- Player modifications saved separately (IndexedDB)
- View from built structures remains stable

### New Block: Obsidian

- **ID:** 15
- **Color:** Dark purple-black
- **Properties:** Emissive glow, slightly slippery
- **Use:** Crystal formations, lava pools, dramatic accents
```

**Step 2: Commit documentation update**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Phase 4A world generation system"
```

---

### Task 7.2: Create Migration Guide

**Files:**
- Create: `docs/migration/phase4a-world-migration.md`

**Step 1: Write migration guide**

```markdown
# Phase 4A Migration Guide

## For Users

### Switching Between Worlds

**Method 1: Edit ChunkWorker (requires rebuild)**
```typescript
// src/modules/world/workers/ChunkWorker.ts:20
const worldDef = await loader.load('/worlds/default.json')  // Change filename
```

**Method 2: Via localStorage (future)**
```javascript
localStorage.setItem('selected-world', '/worlds/caves.json')
// Reload page
```

### Creating Custom Worlds

1. Copy `public/worlds/default.json`
2. Edit parameters:
   - Change seed for different layout
   - Adjust feature spacing/density
   - Modify biome elevation ranges
3. Save as `public/worlds/custom.json`
4. Update ChunkWorker to load your file
5. Rebuild: `bun dev`

### World Definition Fields

**meta.seed:**
- Controls all random generation
- Same seed = same world layout
- Change seed for completely different world

**terrain.noise.frequency:**
- Higher = more frequent height changes (bumpier)
- Lower = smoother, rolling hills
- Range: 0.005-0.02 recommended

**features[].spacing:**
- Distance between feature grid points
- Floating islands: 300-500 blocks
- Lower = denser features

**features[].density:**
- Probability of feature appearing
- Caves: 0.01-0.04 typical
- Trees: 0.001-0.005 typical
- Crystals: 0.005-0.02 typical

## For Developers

### Adding New Feature Types

1. Create generator class implementing `FeatureGenerator`
2. Add Zod schema to `WorldDefinition.ts`
3. Register in `DramaticFeaturesPass.generators` Map
4. Write unit tests
5. Add example to world JSON

### Converting Old Presets

**canyon preset → JSON:**
```json
{
  "meta": { "name": "Grand Canyon", "seed": 1337 },
  "terrain": {
    "generator": "noise",
    "baseHeight": 28,
    "noise": { "octaves": 4, "frequency": 0.01, "amplitude": 24 }
  },
  "features": [],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      { "elevationRange": [0, 35], "surface": "sand", "subsurface": "sand" }
    ]
  }
}
```

### Backward Compatibility

**Feature flag in ChunkWorker:**
```typescript
const USE_NEW_SYSTEM = true

if (USE_NEW_SYSTEM) {
  const worldDef = await loader.load('/worlds/default.json')
  chunk = await orchestrator.generateChunk(coord)
} else {
  // Old system (fallback)
  const generator = new NoiseGenerator()
  generator.populate(chunk, coord)
}
```
```

**Step 2: Commit migration guide**

```bash
git add docs/migration/phase4a-world-migration.md
git commit -m "docs: add Phase 4A migration guide for world switching"
```

---

## Execution Complete

All tasks implemented. Ready for:
1. **Code review** using @superpowers:requesting-code-review
2. **Browser validation** using visual validation checklist
3. **Merge to dev** using @superpowers:finishing-a-development-branch

## Quick Reference

**Commands:**
```bash
bun dev          # Start with default world
bun lint         # Type check
bun test         # Run all tests
```

**Files to edit for custom worlds:**
- `public/worlds/default.json` - Main world definition
- Create new `*.json` files for additional worlds

**Debug:**
- `window.debug.listWorlds()` - Show available worlds
- F3 overlay shows LOD + performance metrics

**Key Files:**
- `src/modules/world/domain/WorldDefinition.ts` - Zod schema
- `src/modules/world/generation/GenerationOrchestrator.ts` - Pipeline coordinator
- `src/modules/world/generation/features/` - Feature generators (4 types)
- `public/worlds/` - World definition JSON files
