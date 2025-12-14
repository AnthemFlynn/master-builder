# Phase 4A: Declarative World Generation Design

**Date:** 2025-12-14
**Author:** Claude (Phase 4 Planning Session)
**Status:** Design Complete - Ready for Implementation
**Goal:** Replace noise-based terrain with JSON-defined dramatic procedural worlds

---

## Executive Summary

Replace the current simplex noise terrain generator with a declarative, pipeline-based world generation system that produces dramatic features (floating islands, massive caves, giant trees, crystal formations) while maintaining deterministic seed-based generation.

**Current State:**
- ChunkWorker uses hardcoded simplex noise
- WorldPreset system with basic biome rules
- Limited variety (all worlds are "noisy hills")
- No support for authored structures

**Target State (Phase 4A):**
- JSON world definitions (validated with Zod)
- 4-pass generation pipeline (Terrain → Features → Biomes → Decoration)
- Dramatic procedural features (floating islands, caves, giant trees, crystals)
- Deterministic (same seed = same world)
- Backward compatible with existing persistence system

**Key Principle:** World definition is DATA (JSON), generation is CODE (TypeScript). Edit worlds without rebuilding code.

---

## System Architecture

### Component Structure

```
WorldDefinition (JSON + Zod validation)
  ↓ (loaded once, cached)
GenerationOrchestrator
  ├─ Coordinates generation pipeline
  ├─ Manages GenerationContext
  └─ Routes to feature generators
      ↓
GenerationPipeline (4 passes)
  ├─ Pass 1: TerrainPass (base heightfield from noise)
  ├─ Pass 2: DramaticFeaturesPass (floating islands, caves, canyons)
  ├─ Pass 3: BiomePass (assigns block types by elevation)
  └─ Pass 4: DecorationPass (trees, rocks, crystals)
      ↓
ChunkCompiler
  ├─ Converts blockTypes[][][] to ChunkData
  └─ Returns to main thread
```

### Integration with Existing System

**ChunkWorker.ts (modified):**
```typescript
// Load world definition once
const worldDef = await loadWorldDefinition('/worlds/default.json')
const orchestrator = new GenerationOrchestrator(worldDef)

self.onmessage = async (event) => {
  const { x, z } = event.data
  const coord = new ChunkCoordinate(x, z)

  // Run pipeline (replaces NoiseGenerator.populate)
  const chunk = await orchestrator.generateChunk(coord)

  // Return (same message format as before)
  self.postMessage({
    type: 'CHUNK_GENERATED',
    x, z,
    blockBuffer: chunk.getRawBuffer(),
    timingMs: performance.now() - startTime
  })
}
```

**No changes needed to:**
- WorldService (still requests chunks same way)
- EventBus (same ChunkGeneratedEvent)
- Persistence (still saves modified chunks only)

**Determinism maintained:**
- Same seed + coordinates + world definition = identical chunk
- Unmodified chunks regenerate identically
- Player edits persist in IndexedDB

---

## Phase 4A Simplified Schema

### JSON Structure

```json
{
  "meta": {
    "name": "Sky Islands World",
    "seed": 42069,
    "version": "0.1.0"
  },

  "terrain": {
    "generator": "noise",
    "baseHeight": 40,
    "noise": {
      "type": "simplex",
      "octaves": 4,
      "frequency": 0.01,
      "amplitude": 20,
      "lacunarity": 2.0,
      "persistence": 0.5
    }
  },

  "features": [
    {
      "type": "floating_island",
      "spacing": 400,
      "noiseOffset": 100,
      "radiusRange": [40, 100],
      "heightRange": [80, 140],
      "thickness": 15,
      "material": "grass",
      "supportPillars": false
    },
    {
      "type": "cave_system",
      "density": 0.02,
      "radiusRange": [5, 15],
      "depthRange": [10, 80],
      "windingFactor": 0.7
    },
    {
      "type": "giant_tree",
      "density": 0.001,
      "trunkRadiusRange": [3, 6],
      "heightRange": [40, 70],
      "canopyRadius": 30,
      "material": {
        "trunk": "tree",
        "leaves": "leaf"
      }
    },
    {
      "type": "crystal_formation",
      "density": 0.005,
      "heightRange": [8, 24],
      "material": "glowstone",
      "depthRange": [10, 80],
      "onlyInCaves": true
    }
  ],

  "biomes": {
    "elevationBased": true,
    "ranges": [
      {
        "elevationRange": [0, 28],
        "surface": "sand",
        "subsurface": "dirt"
      },
      {
        "elevationRange": [28, 60],
        "surface": "grass",
        "subsurface": "dirt"
      },
      {
        "elevationRange": [60, 120],
        "surface": "stone",
        "subsurface": "stone"
      }
    ]
  }
}
```

### TypeScript Types (Zod-derived)

```typescript
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

const BiomeRangeSchema = z.object({
  elevationRange: z.tuple([z.number(), z.number()]),
  surface: z.string(),
  subsurface: z.string()
})

const BiomesSchema = z.object({
  elevationBased: z.boolean(),
  ranges: z.array(BiomeRangeSchema)
})

const WorldDefinitionSchema = z.object({
  meta: MetaSchema,
  terrain: TerrainSchema,
  features: z.array(FeatureSchema),
  biomes: BiomesSchema
})

type WorldDefinition = z.infer<typeof WorldDefinitionSchema>
```

---

## Generation Pipeline Detail

### Pass 1: Terrain Generation

**TerrainPass** creates base heightfield:

```typescript
class TerrainPass implements GenerationPass {
  execute(context: GenerationContext): void {
    const { terrain } = context.worldDef

    if (terrain.generator === 'flat') {
      context.heightMap = this.generateFlat(terrain.baseHeight)
    } else {
      context.heightMap = this.generateNoise(
        context.chunkCoord,
        context.seed,
        terrain
      )
    }

    // Fill blockTypes below heightmap
    this.fillTerrain(context.blockTypes, context.heightMap, terrain.baseHeight)
  }

  private generateNoise(coord: ChunkCoordinate, seed: number, config: Terrain): number[][] {
    // Same simplex noise as current, but configurable
    const noise = new SimplexNoise(seed)
    const heightMap = []

    for (let x = 0; x < 24; x++) {
      heightMap[x] = []
      for (let z = 0; z < 24; z++) {
        const worldX = coord.x * 24 + x
        const worldZ = coord.z * 24 + z

        let value = 0
        let amplitude = config.noise.amplitude
        let frequency = config.noise.frequency

        for (let octave = 0; octave < config.noise.octaves; octave++) {
          value += noise.noise2D(worldX * frequency, worldZ * frequency) * amplitude
          amplitude *= config.noise.persistence
          frequency *= config.noise.lacunarity
        }

        heightMap[x][z] = config.baseHeight + value
      }
    }

    return heightMap
  }
}
```

### Pass 2: Dramatic Features

**DramaticFeaturesPass** checks and applies features:

```typescript
class DramaticFeaturesPass implements GenerationPass {
  private generators: Map<string, FeatureGenerator>

  constructor() {
    this.generators = new Map([
      ['floating_island', new FloatingIslandGenerator()],
      ['cave_system', new WormCaveGenerator()],
      ['giant_tree', new GiantTreeGenerator()],
      ['crystal_formation', new CrystalFormationGenerator()]
    ])
  }

  execute(context: GenerationContext): void {
    for (const featureDef of context.worldDef.features) {
      const generator = this.generators.get(featureDef.type)
      if (!generator) continue

      // Check if this chunk is affected
      if (generator.affects(context.chunkCoord, context.seed, featureDef)) {
        // Modify blockTypes array
        generator.generate(context, featureDef)
      }
    }
  }
}
```

**Floating Island Generator:**

```typescript
class FloatingIslandGenerator implements FeatureGenerator {
  affects(coord: ChunkCoordinate, seed: number, config: FloatingIslandFeature): boolean {
    const islands = this.getIslandCenters(coord, seed, config)

    for (const island of islands) {
      const chunkBounds = coord.getBounds()
      const islandBounds = {
        minX: island.x - island.radius,
        maxX: island.x + island.radius,
        minZ: island.z - island.radius,
        maxZ: island.z + island.radius
      }

      if (this.boundsIntersect(chunkBounds, islandBounds)) {
        return true
      }
    }

    return false
  }

  generate(context: GenerationContext, config: FloatingIslandFeature): void {
    const islands = this.getIslandCenters(context.chunkCoord, context.seed, config)

    for (const island of islands) {
      this.carveSphere(context.blockTypes, island, config)
      this.addSurfaceLayer(context.blockTypes, island, config.material)
    }
  }

  private getIslandCenters(coord: ChunkCoordinate, seed: number, config: FloatingIslandFeature): Island[] {
    // Grid pattern with noise offset for natural distribution
    const spacing = config.spacing
    const islands: Island[] = []

    // Check 3x3 grid around chunk
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        const gridX = Math.floor(coord.x / spacing) + gx
        const gridZ = Math.floor(coord.z / spacing) + gz

        // Deterministic noise offset from grid position + seed
        const noise = new SimplexNoise(seed + gridX * 1000 + gridZ)
        const offsetX = noise.noise2D(gridX, gridZ) * config.noiseOffset
        const offsetZ = noise.noise2D(gridZ, gridX) * config.noiseOffset

        const islandX = gridX * spacing + offsetX
        const islandZ = gridZ * spacing + offsetZ

        // Random radius within range (deterministic from position)
        const radiusSeed = seed + gridX * 7919 + gridZ * 6547
        const radius = this.randomInRange(radiusSeed, config.radiusRange)
        const height = this.randomInRange(radiusSeed + 1, config.heightRange)

        islands.push({ x: islandX, z: islandZ, y: height, radius })
      }
    }

    return islands
  }

  private carveSphere(blocks: number[][][], island: Island, config: FloatingIslandFeature): void {
    // For each block in chunk, check if inside sphere
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 256; y++) {
        for (let z = 0; z < 24; z++) {
          const worldX = chunkCoord.x * 24 + x
          const worldZ = chunkCoord.z * 24 + z

          const dx = worldX - island.x
          const dy = y - island.y
          const dz = worldZ - island.z
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)

          // Inside sphere: place block
          if (distance <= island.radius) {
            blocks[x][y][z] = BlockType.stone  // Interior
          }

          // Top hemisphere: add grass layer
          if (distance <= island.radius && distance >= island.radius - 1 && dy > 0) {
            blocks[x][y][z] = resolveBlockType(config.material)
          }
        }
      }
    }
  }
}
```

### Pass 3: Biome Assignment

**BiomePass** assigns surface materials based on elevation:

```typescript
class BiomePass implements GenerationPass {
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
            if (surfaceY - depth >= 0) {
              context.blockTypes[x][surfaceY - depth][z] = resolveBlockType(biome.subsurface)
            }
          }
        }
      }
    }
  }
}
```

### Pass 4: Decoration

**DecorationPass** adds trees, rocks, crystals:

```typescript
class DecorationPass implements GenerationPass {
  execute(context: GenerationContext): void {
    // Place giant trees from features
    const treeFeatures = context.worldDef.features.filter(f => f.type === 'giant_tree')
    for (const feature of treeFeatures) {
      this.placeGiantTrees(context, feature)
    }

    // Place crystal formations in caves
    const crystalFeatures = context.worldDef.features.filter(f => f.type === 'crystal_formation')
    for (const feature of crystalFeatures) {
      this.placeCrystals(context, feature)
    }
  }

  private placeGiantTrees(context: GenerationContext, feature: GiantTreeFeature): void {
    // Deterministic scatter based on seed + chunk coords
    const rng = new SeededRandom(context.seed + context.chunkCoord.x * 31 + context.chunkCoord.z * 17)

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        if (rng.next() < feature.density) {
          const surfaceY = this.findSurface(context.blockTypes, x, z)
          if (surfaceY > 0) {
            this.generateGiantTree(context.blockTypes, x, surfaceY + 1, z, feature)
          }
        }
      }
    }
  }
}
```

---

## Material Registry

**Maps JSON material names to BlockType enum:**

```typescript
class MaterialRegistry {
  private nameToBlockType = new Map<string, BlockType>([
    // Direct mappings
    ['air', BlockType.air],
    ['grass', BlockType.grass],
    ['dirt', BlockType.dirt],
    ['stone', BlockType.stone],
    ['sand', BlockType.sand],
    ['tree', BlockType.tree],
    ['leaf', BlockType.leaf],
    ['glowstone', BlockType.glowstone],
    ['bedrock', BlockType.bedrock],
    ['glass', BlockType.glass],
    ['obsidian', BlockType.obsidian],
    ['coal', BlockType.coal],
    ['wood', BlockType.wood],
    ['diamond', BlockType.diamond],
    ['gold', BlockType.gold],
    ['redstone_lamp', BlockType.redstone_lamp],

    // Aliases for schema compatibility
    ['grass_green', BlockType.grass],
    ['soil_temperate', BlockType.dirt],
    ['granite', BlockType.stone],
    ['sand_yellow', BlockType.sand],
    ['water_ocean', BlockType.glass]  // Temporary until water block added
  ])

  resolve(materialName: string): BlockType {
    const blockType = this.nameToBlockType.get(materialName)
    if (blockType === undefined) {
      console.warn(`Material '${materialName}' not found, using stone`)
      return BlockType.stone
    }
    return blockType
  }

  register(name: string, blockType: BlockType): void {
    this.nameToBlockType.set(name, blockType)
  }
}

export const materialRegistry = new MaterialRegistry()

// Helper function used by generators
export function resolveBlockType(materialName: string): BlockType {
  return materialRegistry.resolve(materialName)
}
```

---

## Feature Generators Detail

### 1. Floating Island Generator

**Algorithm:**
1. Deterministic grid pattern (spacing = 400 blocks)
2. Noise offset adds natural variation
3. Sphere carving creates island shape
4. Surface layer (grass/stone based on height)
5. Optional support pillars to ground

**Parameters:**
- `spacing`: Distance between grid points
- `radiusRange`: Island size variety
- `heightRange`: Altitude variety
- `thickness`: How thick the island disk is
- `material`: Surface block type

### 2. Worm Cave Generator

**Algorithm:**
1. Start points based on density (seed-based)
2. 3D random walk with smooth curves
3. Variable radius (5-15 blocks)
4. Carves through existing terrain
5. Can connect to form networks

**Parameters:**
- `density`: Cave frequency (0-1)
- `radiusRange`: Tunnel size
- `depthRange`: How deep caves go
- `windingFactor`: How curvy (0=straight, 1=very windy)

### 3. Giant Tree Generator

**Algorithm:**
1. Scatter placement (density-based)
2. Thick trunk (multi-block radius)
3. Canopy as leaf sphere
4. Root system extends into ground
5. Branch stubs using L-system

**Parameters:**
- `density`: Tree frequency
- `trunkRadiusRange`: Trunk thickness
- `heightRange`: Tree height
- `canopyRadius`: Leaf sphere size

### 4. Crystal Formation Generator

**Algorithm:**
1. Find cave ceilings/walls (air adjacent to stone)
2. Grow cluster of crystal blocks
3. Varying heights (8-24 blocks)
4. Uses glowstone (emissive lighting)
5. Only in caves (onlyInCaves flag)

**Parameters:**
- `density`: Crystal frequency
- `heightRange`: Crystal spike sizes
- `material`: Block type (typically glowstone)
- `onlyInCaves`: Restrict to underground

---

## Determinism Strategy

**All randomness is pseudo-random from seed:**

```typescript
class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  next(): number {
    // LCG: Linear Congruential Generator
    this.state = (this.state * 1664525 + 1013904223) % 4294967296
    return this.state / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }
}
```

**Usage in generators:**
```typescript
// Same seed + coordinates = same random sequence
const rng = new SeededRandom(seed + chunkX * 31 + chunkZ * 17)
const radius = rng.range(config.radiusRange[0], config.radiusRange[1])
```

**Guarantees:**
- Chunk (10, 10) with seed 12345 always has same islands
- Chunk (10, 10) with seed 12346 has different islands
- Player edits don't affect regeneration (persisted separately)

---

## File Structure

```
src/modules/world/
├── domain/
│   ├── WorldDefinition.ts (Zod schema + types)
│   ├── MaterialRegistry.ts (name → BlockType mapping)
│   └── BlockType.ts (existing, +obsidian)
│
├── generation/
│   ├── GenerationOrchestrator.ts (pipeline coordinator)
│   ├── GenerationContext.ts (shared state)
│   ├── passes/
│   │   ├── GenerationPass.ts (interface)
│   │   ├── TerrainPass.ts
│   │   ├── DramaticFeaturesPass.ts
│   │   ├── BiomePass.ts
│   │   └── DecorationPass.ts
│   │
│   └── features/
│       ├── FeatureGenerator.ts (interface)
│       ├── FloatingIslandGenerator.ts
│       ├── WormCaveGenerator.ts
│       ├── GiantTreeGenerator.ts
│       └── CrystalFormationGenerator.ts
│
├── workers/
│   └── ChunkWorker.ts (modified to use orchestrator)
│
└── adapters/
    └── NoiseGenerator.ts (extracted from worker, reusable)

public/worlds/
├── default.json (sky islands world)
├── caves.json (massive cave systems)
├── forest.json (giant tree world)
└── crystal.json (glowing crystal world)
```

---

## Example World Definitions

### Sky Islands World

```json
{
  "meta": {
    "name": "Floating Paradise",
    "seed": 777888,
    "version": "0.1.0"
  },
  "terrain": {
    "generator": "flat",
    "baseHeight": 20
  },
  "features": [
    {
      "type": "floating_island",
      "spacing": 300,
      "noiseOffset": 80,
      "radiusRange": [50, 120],
      "heightRange": [90, 130],
      "thickness": 20,
      "material": "grass",
      "supportPillars": false
    }
  ],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      { "elevationRange": [0, 50], "surface": "stone", "subsurface": "stone" },
      { "elevationRange": [90, 150], "surface": "grass", "subsurface": "dirt" }
    ]
  }
}
```

### Crystal Caves World

```json
{
  "meta": {
    "name": "Glowing Depths",
    "seed": 999111,
    "version": "0.1.0"
  },
  "terrain": {
    "generator": "noise",
    "baseHeight": 40,
    "noise": {
      "type": "simplex",
      "octaves": 5,
      "frequency": 0.008,
      "amplitude": 25
    }
  },
  "features": [
    {
      "type": "cave_system",
      "density": 0.03,
      "radiusRange": [8, 20],
      "depthRange": [15, 100],
      "windingFactor": 0.8
    },
    {
      "type": "crystal_formation",
      "density": 0.01,
      "heightRange": [10, 30],
      "material": "glowstone",
      "depthRange": [20, 100],
      "onlyInCaves": true
    },
    {
      "type": "crystal_formation",
      "density": 0.008,
      "heightRange": [15, 40],
      "material": "obsidian",
      "depthRange": [50, 100],
      "onlyInCaves": true
    }
  ],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      { "elevationRange": [0, 60], "surface": "stone", "subsurface": "stone" }
    ]
  }
}
```

### Giant Forest World

```json
{
  "meta": {
    "name": "Titan Trees",
    "seed": 424242,
    "version": "0.1.0"
  },
  "terrain": {
    "generator": "noise",
    "baseHeight": 35,
    "noise": {
      "type": "simplex",
      "octaves": 4,
      "frequency": 0.012,
      "amplitude": 15
    }
  },
  "features": [
    {
      "type": "giant_tree",
      "density": 0.002,
      "trunkRadiusRange": [4, 8],
      "heightRange": [50, 90],
      "canopyRadius": 35,
      "material": {
        "trunk": "tree",
        "leaves": "leaf"
      }
    }
  ],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      { "elevationRange": [0, 80], "surface": "grass", "subsurface": "dirt" }
    ]
  }
}
```

---

## Performance Considerations

### Worker Thread Execution

**All generation happens in worker:**
- Terrain pass: ~8-12ms (same as current)
- Features pass: ~10-20ms (depends on feature count)
- Biome pass: ~2-3ms (simple array iteration)
- Decoration pass: ~5-10ms (tree placement)
- **Total: ~25-45ms per chunk** (acceptable, same as Phase 2 targets)

### Caching Strategy

**World definition cached:**
- Load JSON once at worker initialization
- Parse and validate with Zod once
- Reuse for all chunk generation
- **Cost: One-time ~5-10ms**

**Feature spatial queries optimized:**
- `affects()` checks bounds only (fast)
- `generate()` only runs if `affects() === true`
- Grid-based island lookup: O(1) to check 9 nearby grid cells

### Memory Footprint

**Per-chunk generation context:**
- heightMap: 24×24 floats = 2.3KB
- blockTypes: 24×256×24 bytes = 147KB
- Total temp memory: ~150KB (same as current)

**World definition:**
- JSON file: ~5-10KB
- Parsed object: ~20-30KB
- **Negligible compared to chunk data**

---

## Migration Strategy

### Backward Compatibility

**Support both systems during transition:**

```typescript
// ChunkWorker.ts
const USE_NEW_SYSTEM = true  // Feature flag

if (USE_NEW_SYSTEM) {
  const worldDef = await loadWorldDefinition('/worlds/default.json')
  const orchestrator = new GenerationOrchestrator(worldDef)
  chunk = await orchestrator.generateChunk(coord)
} else {
  // Old system
  const generator = new NoiseGenerator()
  generator.populate(chunk, coord)
}
```

**Migration path:**
1. Implement new system alongside old
2. Test with feature flag
3. Migrate existing presets to JSON
4. Remove old system once validated

### Converting Existing Presets

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
      { "elevationRange": [0, 35], "surface": "sand", "subsurface": "dirt" },
      { "elevationRange": [35, 80], "surface": "grass", "subsurface": "dirt" }
    ]
  }
}
```

---

## Testing Strategy

### Unit Tests

**Zod Schema Validation:**
```typescript
it('should validate correct world definition', () => {
  const validWorld = {
    meta: { name: "Test", seed: 123, version: "0.1.0" },
    terrain: { generator: "flat", baseHeight: 32, noise: {...} },
    features: [],
    biomes: { elevationBased: true, ranges: [] }
  }

  expect(() => WorldDefinitionSchema.parse(validWorld)).not.toThrow()
})

it('should reject invalid seed', () => {
  const invalidWorld = { meta: { name: "Test", seed: "not a number" } }
  expect(() => WorldDefinitionSchema.parse(invalidWorld)).toThrow()
})
```

**Determinism Tests:**
```typescript
it('should generate identical chunks for same seed + coordinates', () => {
  const coord = new ChunkCoordinate(0, 0)
  const worldDef = loadTestWorld()

  const chunk1 = await orchestrator.generateChunk(coord)
  const chunk2 = await orchestrator.generateChunk(coord)

  expect(chunk1.getRawBuffer()).toEqual(chunk2.getRawBuffer())
})

it('should generate different chunks for different seeds', () => {
  const worldDef1 = { ...testWorld, meta: { ...testWorld.meta, seed: 111 } }
  const worldDef2 = { ...testWorld, meta: { ...testWorld.meta, seed: 222 } }

  const chunk1 = await orchestrator1.generateChunk(coord)
  const chunk2 = await orchestrator2.generateChunk(coord)

  expect(chunk1.getRawBuffer()).not.toEqual(chunk2.getRawBuffer())
})
```

**Feature Generator Tests:**
```typescript
it('should only affect chunks within floating island radius', () => {
  const generator = new FloatingIslandGenerator()
  const config = { spacing: 400, radiusRange: [50, 50], ... }

  expect(generator.affects(new ChunkCoordinate(0, 0), 12345, config)).toBe(true)
  expect(generator.affects(new ChunkCoordinate(50, 50), 12345, config)).toBe(false)
})

it('should carve sphere correctly', () => {
  const blocks = createEmptyBlocks()
  const island = { x: 12, y: 80, z: 12, radius: 10 }

  generator.carveSphere(blocks, island, config)

  // Center should be solid
  expect(blocks[12][80][12]).toBeGreaterThan(0)

  // Outside radius should be air
  expect(blocks[0][80][0]).toBe(BlockType.air)
})
```

### Integration Tests

**Full pipeline:**
```typescript
it('should generate chunk with all passes', async () => {
  const worldDef = {
    meta: { name: "Test", seed: 12345 },
    terrain: { generator: "noise", baseHeight: 40, ... },
    features: [{ type: "floating_island", ... }],
    biomes: { ... }
  }

  const orchestrator = new GenerationOrchestrator(worldDef)
  const chunk = await orchestrator.generateChunk(new ChunkCoordinate(0, 0))

  expect(chunk).toBeDefined()
  expect(chunk.getBlockId(0, 40, 0)).toBeGreaterThan(0)  // Has terrain
})
```

### Visual Tests (Browser)

**Test worlds to create:**
1. **floating_islands.json** - Only floating islands, no base terrain
2. **caves.json** - Massive cave networks
3. **forest.json** - Giant tree world
4. **crystal.json** - Glowing crystal caves
5. **combined.json** - All features together

**Validation:**
- Load each world, verify features appear
- F3 overlay shows performance metrics
- Walk through features, check geometry
- Place/remove blocks, verify persistence
- Reload world, verify determinism

---

## Success Criteria

**Phase 4A Complete When:**
- [ ] JSON world definitions load and validate
- [ ] 4-pass pipeline generates chunks deterministically
- [ ] Floating islands appear at expected locations
- [ ] Cave systems carve through terrain correctly
- [ ] Giant trees generate with proper geometry
- [ ] Crystal formations light up caves
- [ ] Materials map correctly (grass, stone, obsidian, etc.)
- [ ] Performance: <50ms per chunk generation
- [ ] All tests pass (unit + integration)
- [ ] Can switch between worlds without code changes
- [ ] Player modifications persist correctly
- [ ] View from built structures remains stable

**"Wow" factor validation:**
- [ ] Family/friends react to floating islands
- [ ] Cave exploration feels exciting
- [ ] Giant trees feel massive and impressive
- [ ] World feels more interesting than Minecraft

---

## Future Phases (Not in 4A)

**Phase 4B: Authored Structures**
- MagicaVoxel .vox import
- Prefab placement system
- Temples, ruins, towers

**Phase 4C: Advanced Features**
- Climate/weather systems
- Unique biome combinations
- Game mode support (different features per mode)

**Phase 4D: Multi-Game Platform**
- Resources, entities, connections
- Trade routes, NPCs
- Geography quiz mode

---

## Implementation Estimate

**Phase 4A breakdown:**
- Day 1-2: Zod schema + MaterialRegistry + world loader
- Day 3-4: Generation pipeline (4 passes)
- Day 5-6: Floating island generator
- Day 7-8: Cave system generator
- Day 9-10: Giant tree + crystal generators
- Day 11-12: Integration + testing + example worlds

**Total: 10-12 days** for complete Phase 4A with all dramatic features

---

## Design Complete

This design:
- ✅ Uses your schema structure (simplified for Phase 4A)
- ✅ Maintains deterministic seed-based generation
- ✅ Supports dramatic procedural features
- ✅ Preserves player edits (persistence compatible)
- ✅ JSON + Zod (industry standard)
- ✅ Pipeline-based (extensible)
- ✅ Backward compatible (feature flag)
- ✅ Performance-conscious (worker thread)
- ✅ Test-driven (unit + integration + visual)

Ready to create the detailed implementation plan?
