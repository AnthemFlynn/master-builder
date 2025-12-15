# Phase 4A World Generation Redesign

**Date:** 2025-12-15
**Status:** Design Complete - Ready for Implementation
**Goal:** Fix broken world generation using research-based best practices from Minecraft and voxel game industry

---

## Problems with Current Implementation

### Critical Issues
1. **Glass columns everywhere** - Ice cave formations placing glass blocks
2. **Trees overlapping** - Random density with no spacing validation
3. **Player stuck at spawn** - Tree canopy at spawn point, can't move
4. **Wrong pass order** - BiomePass uses stale heightMap from before caves carved
5. **Massive scale** - Features 5-10x larger than Minecraft (immersion-breaking)

### Root Causes
- Single-pass feature generation (all features run simultaneously)
- No surface validation (features don't check terrain suitability)
- Uniform random distribution (no natural variation)
- Wrong execution order (biomes before caves)

---

## Research-Based Solution

### Industry Best Practices (Sources)

Based on research from:
- [World generation – Minecraft Wiki](https://minecraft.wiki/w/World_generation)
- [The World Generation of Minecraft - Alan Zucconi](https://www.alanzucconi.com/2022/06/05/minecraft-world-generation/)
- [Procedural generation - Voxel Tools](https://voxel-tools.readthedocs.io/en/latest/procedural_generation/)
- [Cave – Minecraft Wiki](https://minecraft.wiki/w/Cave)

**Key Findings:**
1. **Multi-scale noise** - Separate large/medium/small scale features
2. **3D biomes** - Surface biomes AND underground biomes
3. **Multi-pass generation** - Terrain → Caves → Biomes → Features (strict order)
4. **Validated placement** - Grid-based positions with suitability checks
5. **Probabilistic sizes** - Gaussian distributions (not uniform random)

---

## Architecture Overview

### Pass Execution Order (Minecraft Approach)

```
1. TerrainPass          - Multi-scale noise heightmap + fill stone
2. CavePass             - Carve cheese + spaghetti caves
3. BiomePass            - Surface + underground biomes (AFTER caves)
4. CaveFormationPass    - Stalactites/stalagmites (biome-specific)
5. TreePass             - Validated grid placement
6. IslandPass           - Rare, far from spawn
7. CrystalPass          - Cave-only decorations
```

**Why This Order:**
- Caves must carve BEFORE biomes (biomes need real surface)
- Features must place AFTER biomes (need to know surface type)
- Decorations last (depend on all previous passes)

---

## Component Designs

### 1. Enhanced GenerationContext

**New Properties:**
```typescript
class GenerationContext {
  // Existing
  seed: number
  chunkCoord: ChunkCoordinate
  worldDef: WorldDefinition
  heightMap: number[][]           // Original terrain height (before caves)
  data: Uint8Array                // Block storage
  minY/maxY: number              // Optimization

  // NEW: Climate data
  temperature: number[][]         // -1 (cold) to 1 (hot)
  humidity: number[][]            // -1 (dry) to 1 (wet)

  // NEW: Surface tracking (rebuilt after caves)
  surfaceMap: Map<string, SurfaceInfo>

  // NEW: Biome tracking
  biomeMap: Biome[][]             // Surface biome per column
  undergroundBiomeMap: Map<string, UndergroundBiome>

  // NEW: Cave tracking
  caveBlocks: Set<string>         // "x,y,z" of cave air blocks

  // NEW: Feature tracking (prevent overlaps)
  placedFeatures: Set<string>     // "tree:12,5", "crystal:8,3"

  // Helper methods
  findSurface(x: number, z: number): number | null
  getSurfaceBlock(x: number, z: number): BlockType
  isCave(x: number, y: number, z: number): boolean
  markCave(x: number, y: number, z: number): void
  hasNearbyFeature(x: number, z: number, radius: number, type: string): boolean
  markFeature(x: number, z: number, type: string): void
  getBiomeAt(x: number, z: number): Biome
  getUndergroundBiomeAt(x: number, z: number): UndergroundBiome
}

interface SurfaceInfo {
  y: number                // Actual surface height
  blockType: BlockType     // What block is at surface
  isCave: boolean          // True if underground (cave ceiling)
}
```

---

### 2. TerrainPass - Multi-Scale Noise

**Configuration:**
```typescript
interface NoiseConfig {
  continentalNoise: {     // Large-scale landmasses
    frequency: 0.001,
    octaves: 2,
    amplitude: 40
  },
  terrainNoise: {         // Medium-scale hills/valleys
    frequency: 0.01,
    octaves: 3,
    amplitude: 15
  },
  detailNoise: {          // Small-scale bumps
    frequency: 0.05,
    octaves: 2,
    amplitude: 3
  },
  temperatureNoise: {     // Climate: cold to hot
    frequency: 0.003,
    octaves: 2
  },
  humidityNoise: {        // Climate: dry to wet
    frequency: 0.004,
    octaves: 2
  }
}
```

**Algorithm:**
```typescript
class TerrainPass implements GenerationPass {
  execute(context: GenerationContext): void {
    const baseHeight = context.worldDef.terrain.baseHeight  // ~35

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // Sample multi-scale noise
        const continental = sampleNoise(continentalNoise, worldX, worldZ)
        const terrain = sampleNoise(terrainNoise, worldX, worldZ)
        const detail = sampleNoise(detailNoise, worldX, worldZ)

        const height = Math.floor(baseHeight + continental + terrain + detail)
        context.heightMap[x][z] = height

        // Sample climate
        context.temperature[x][z] = sampleNoise(temperatureNoise, worldX, worldZ)
        context.humidity[x][z] = sampleNoise(humidityNoise, worldX, worldZ)

        // Fill terrain with stone
        context.setBlock(x, 0, z, BlockType.bedrock)
        for (let y = 1; y <= height && y < 256; y++) {
          context.setBlock(x, y, z, BlockType.stone)
        }

        // Initialize surface map
        context.surfaceMap.set(`${x},${z}`, {
          y: height,
          blockType: BlockType.stone,
          isCave: false
        })
      }
    }
  }
}
```

**Benefits:**
- 7 total octaves (vs 5 in one) - better variety, similar performance
- Separate scales = cleaner control
- Climate data for biome system

---

### 3. CavePass - Dual System

**Cheese Caves (3D Density):**
```typescript
private generateCheeseCaves(context: GenerationContext): void {
  const noise3D = createNoise3D(context.seed + 1000)

  for (let x = 0; x < 24; x++) {
    for (let z = 0; z < 24; z++) {
      const surfaceHeight = context.heightMap[x][z]
      const minY = 5
      const maxY = Math.max(minY, surfaceHeight - 10)  // Stay deep

      for (let y = minY; y < maxY; y++) {
        const worldX = context.chunkCoord.x * 24 + x
        const worldZ = context.chunkCoord.z * 24 + z

        // 3D density noise
        const density = noise3D(worldX * 0.04, y * 0.04, worldZ * 0.04)

        // Threshold: 0.65 = ~35% of underground is caves (balanced)
        if (density > 0.65) {
          context.setBlock(x, y, z, BlockType.air)
          context.markCave(x, y, z)
        }
      }
    }
  }
}
```

**Spaghetti Caves (Worms):**
```typescript
private generateSpaghettiCaves(context: GenerationContext): void {
  const rng = new SeededRandom(context.seed + context.chunkCoord.hash() + 2000)

  // Only 2% of chunks spawn tunnels (very sparse)
  if (rng.next() > 0.02) return

  const startX = rng.int(0, 23)
  const startZ = rng.int(0, 23)
  const surfaceHeight = context.heightMap[startX][startZ]
  const startY = rng.int(15, surfaceHeight - 15)  // Deep underground

  this.carveWormTunnel(context, startX, startY, startZ, {
    length: rng.int(40, 80),
    radius: rng.clampedGaussian(5, 1, 3, 8),  // Mean=5, mostly 4-6
    windingFactor: 0.6
  })
}
```

**Rebuild Surface Map:**
```typescript
private rebuildSurfaceMap(context: GenerationContext): void {
  for (let x = 0; x < 24; x++) {
    for (let z = 0; z < 24; z++) {
      // Find topmost solid block (may have changed due to caves)
      for (let y = context.heightMap[x][z]; y >= 0; y--) {
        if (context.getBlock(x, y, z) !== BlockType.air) {
          const originalHeight = context.heightMap[x][z]

          context.surfaceMap.set(`${x},${z}`, {
            y: y,
            blockType: context.getBlock(x, y, z),
            isCave: y < originalHeight - 5  // More than 5 blocks below = cave
          })
          break
        }
      }
    }
  }
}
```

**Benefits:**
- Two cave types (variety)
- Depth restrictions (no surface holes)
- Surface map rebuilt (BiomePass will use correct heights)

---

### 4. BiomePass - 3D Biomes

**Surface Biomes:**
```typescript
enum BiomeType {
  DESERT,      // Hot + Dry
  PLAINS,      // Temperate + Medium
  FOREST,      // Temperate + Wet
  MOUNTAINS,   // Cold + Dry (high elevation)
  TUNDRA       // Cold + Wet
}

const SURFACE_BIOMES = {
  PLAINS: {
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.02,  // 2% of grid positions
    minTreeSpacing: 6
  },
  FOREST: {
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 3,
    allowTrees: true,
    treeDensity: 0.08,  // 8% (dense forests)
    minTreeSpacing: 5
  },
  DESERT: {
    surfaceBlock: BlockType.sand,
    subsurfaceBlock: BlockType.sand,
    subsurfaceDepth: 5,
    allowTrees: false,
    treeDensity: 0
  },
  MOUNTAINS: {
    surfaceBlock: BlockType.stone,
    subsurfaceBlock: BlockType.stone,
    subsurfaceDepth: 1,
    allowTrees: false,
    treeDensity: 0
  },
  TUNDRA: {
    surfaceBlock: BlockType.grass,
    subsurfaceBlock: BlockType.dirt,
    subsurfaceDepth: 2,
    allowTrees: true,
    treeDensity: 0.01,  // Very sparse
    minTreeSpacing: 8
  }
}
```

**Underground Biomes:**
```typescript
enum UndergroundBiomeType {
  DRIPSTONE_CAVES,  // Stone formations
  ICE_CAVES,        // Ice (glass) formations
  LUSH_CAVES        // Future: moss, vines
}

const UNDERGROUND_BIOMES = {
  DRIPSTONE_CAVES: {
    floorBlock: BlockType.stone,
    formationMaterial: BlockType.stone,
    allowStalactites: true,
    formationDensity: 0.1
  },
  ICE_CAVES: {
    floorBlock: BlockType.glass,  // Ice
    formationMaterial: BlockType.glass,
    allowStalactites: true,
    formationDensity: 0.15
  },
  LUSH_CAVES: {
    floorBlock: BlockType.dirt,
    formationMaterial: BlockType.glowstone,  // Glowing moss (future)
    allowStalactites: false,
    formationDensity: 0.05
  }
}
```

**BiomePass Algorithm:**
```typescript
class BiomePass implements GenerationPass {
  execute(context: GenerationContext): void {
    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const temp = context.temperature[x][z]
        const humidity = context.humidity[x][z]
        const surface = context.surfaceMap.get(`${x},${z}`)

        if (!surface) continue

        // Determine surface biome
        const biome = this.getSurfaceBiome(temp, humidity, surface.y)
        context.biomeMap[x][z] = biome

        // Apply surface materials (only if not cave surface)
        if (!surface.isCave) {
          this.applySurfaceLayers(context, x, z, surface.y, biome)
        }

        // Determine and apply underground biome
        const undergroundBiome = this.getUndergroundBiome(temp, humidity)
        context.undergroundBiomeMap.set(`${x},${z}`, undergroundBiome)
        this.applyCaveBiomeBlocks(context, x, z, undergroundBiome)
      }
    }
  }

  private getSurfaceBiome(temp, humidity, elevation): Biome {
    // High elevation override
    if (elevation > 80) return SURFACE_BIOMES.MOUNTAINS

    // Temperature-humidity matrix
    if (temp > 0.6 && humidity < -0.3) return SURFACE_BIOMES.DESERT
    if (temp < -0.4) return SURFACE_BIOMES.TUNDRA
    if (humidity > 0.3) return SURFACE_BIOMES.FOREST
    return SURFACE_BIOMES.PLAINS
  }

  private getUndergroundBiome(temp, humidity): UndergroundBiome {
    if (temp < -0.5) return UNDERGROUND_BIOMES.ICE_CAVES
    if (humidity > 0.6) return UNDERGROUND_BIOMES.LUSH_CAVES
    return UNDERGROUND_BIOMES.DRIPSTONE_CAVES
  }

  private applyCaveBiomeBlocks(context, x, z, caveBiome): void {
    // Apply cave floor blocks where caves exist
    for (let y = 5; y < 100; y++) {
      if (context.getBlock(x, y, z) !== BlockType.air) continue
      if (!context.isCave(x, y, z)) continue

      // Cave floor
      if (context.getBlock(x, y - 1, z) === BlockType.stone) {
        context.setBlock(x, y - 1, z, caveBiome.floorBlock)
      }
    }
  }
}
```

**Key Points:**
- 3D biomes (surface + underground)
- Cave surfaces get different materials (ice caves = glass floors)
- **This explains and FIXES glass blocks** - they're intentional ice formations

---

### 5. CaveFormationPass - Stalactites/Stalagmites

**Your Requested Feature:**
```typescript
class CaveFormationPass implements GenerationPass {
  execute(context: GenerationContext): void {
    const positions = this.getFormationPositions(
      context.chunkCoord,
      context.seed,
      spacing: 5  // Grid every 5 blocks
    )

    const rng = new SeededRandom(context.seed + context.chunkCoord.hash() + 5000)

    for (const pos of positions) {
      const biome = context.getUndergroundBiomeAt(pos.x, pos.z)

      // Biome-specific density (ice caves more formations than lush caves)
      if (rng.next() > biome.formationDensity) continue

      if (!this.canPlaceFormation(context, pos.x, pos.z)) continue

      // 50/50: stalactite or stalagmite
      if (rng.next() < 0.5) {
        this.placeStalactite(context, pos.x, pos.z, biome, rng)
      } else {
        this.placeStalagmite(context, pos.x, pos.z, biome, rng)
      }
    }
  }

  private canPlaceFormation(context, x, z): boolean {
    // Need cave with enough vertical space
    const caveSpace = this.findCaveSpace(context, x, z)
    if (!caveSpace || caveSpace.height < 8) return false

    // 3x3 floor must be clear
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const block = context.getBlock(x + dx, caveSpace.floorY + 1, z + dz)
        if (block !== BlockType.air) return false
      }
    }

    return true
  }

  private placeStalactite(context, x, z, biome, rng): void {
    const cave = this.findCaveSpace(context, x, z)

    // Gaussian: mean=4, stdDev=1.5, range=2-7 blocks
    const height = Math.floor(rng.clampedGaussian(4, 1.5, 2, 7))
    const material = biome.formationMaterial

    // Grow down from ceiling (tapered)
    for (let i = 0; i < height; i++) {
      const y = cave.ceilingY - i
      const taper = (height - i) / height

      // Only place if thick enough (creates point at tip)
      if (taper > 0.25) {
        context.setBlock(x, y, z, material)
      }
    }
  }

  private placeStalagmite(context, x, z, biome, rng): void {
    const cave = this.findCaveSpace(context, x, z)

    // Gaussian: mean=4, stdDev=1.5, range=2-7 blocks
    const height = Math.floor(rng.clampedGaussian(4, 1.5, 2, 7))
    const material = biome.formationMaterial

    // Grow up from floor (tapered)
    for (let i = 0; i < height; i++) {
      const y = cave.floorY + 1 + i
      const taper = (height - i) / height

      if (taper > 0.25) {
        context.setBlock(x, y, z, material)
      }
    }
  }

  private findCaveSpace(context, x, z): { floorY, ceilingY, height } | null {
    let floorY = -1, ceilingY = -1

    for (let y = 10; y < 100; y++) {
      const curr = context.getBlock(x, y, z)
      const below = context.getBlock(x, y - 1, z)
      const above = context.getBlock(x, y + 1, z)

      if (curr === BlockType.air && below !== BlockType.air && floorY === -1) {
        floorY = y - 1
      }
      if (curr === BlockType.air && above !== BlockType.air && floorY !== -1) {
        ceilingY = y + 1
        break
      }
    }

    if (floorY === -1 || ceilingY === -1) return null
    return { floorY, ceilingY, height: ceilingY - floorY }
  }
}
```

**Features:**
- Grid-based placement (sparse)
- Biome-specific materials (stone in dripstone caves, glass in ice caves)
- Probabilistic heights (Gaussian, mean=4 blocks)
- Tapered shape (pointy tips)
- Only in caves with enough space

---

### 6. TreePass - Validated Placement

**Grid + Validation:**
```typescript
class TreePass implements GenerationPass {
  execute(context: GenerationContext): void {
    const positions = this.getTreePositions(
      context.chunkCoord,
      context.seed,
      baseSpacing: 8  // Grid every 8 blocks
    )

    const rng = new SeededRandom(context.seed + context.chunkCoord.hash() + 7000)

    for (const pos of positions) {
      const biome = context.biomeMap[pos.x]?.[pos.z]
      if (!biome?.allowTrees) continue

      // Biome-specific density (forests 8%, plains 2%)
      if (rng.next() > biome.treeDensity) continue

      if (!this.canPlaceTree(context, pos.x, pos.z)) continue

      const surfaceY = context.findSurface(pos.x, pos.z)
      this.placeTree(context, pos.x, surfaceY, pos.z, rng)
    }
  }

  private canPlaceTree(context, x, z): boolean {
    const surface = context.surfaceMap.get(`${x},${z}`)
    if (!surface || surface.isCave) return false

    // Surface type check
    if (surface.blockType !== BlockType.grass && surface.blockType !== BlockType.dirt) {
      return false
    }

    // Flatness check (3x3 area)
    const centerY = surface.y
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const neighbor = context.surfaceMap.get(`${x + dx},${z + dz}`)
        if (neighbor && Math.abs(neighbor.y - centerY) > 2) {
          return false  // Too steep
        }
      }
    }

    // Spacing check
    if (context.hasNearbyFeature(x, z, 5, 'tree')) return false

    // Vertical space check
    for (let y = surface.y + 1; y < surface.y + 10; y++) {
      if (context.getBlock(x, y, z) !== BlockType.air) return false
    }

    return true
  }

  private placeTree(context, x, baseY, z, rng): void {
    // Gaussian: mean=6, stdDev=1, range=2-9 blocks
    const height = Math.floor(rng.clampedGaussian(6, 1, 2, 9))

    // Trunk (single block)
    for (let y = baseY + 1; y <= baseY + height; y++) {
      context.setBlock(x, y, z, BlockType.tree)
    }

    // Canopy: Gaussian mean=4, stdDev=1, range=2-6
    const canopyY = baseY + height
    const canopyRadius = Math.floor(rng.clampedGaussian(4, 1, 2, 6))

    for (let dx = -canopyRadius; dx <= canopyRadius; dx++) {
      for (let dy = -2; dy <= canopyRadius; dy++) {  // Slightly flattened sphere
        for (let dz = -canopyRadius; dz <= canopyRadius; dz++) {
          const dist = Math.sqrt(dx*dx + dy*dy*1.5 + dz*dz)  // Ellipsoid
          if (dist <= canopyRadius && !(dx === 0 && dy === 0 && dz === 0)) {
            context.setBlock(x + dx, canopyY + dy, z + dz, BlockType.leaf)
          }
        }
      }
    }

    context.markFeature(x, z, 'tree')
  }
}
```

**Prevents Overlapping:**
- Grid-based positions (not pure random)
- Spacing validation (5-6 block minimum)
- Feature tracking (remembers where trees are)
- Flatness check (no trees on cliffs)

---

### 7. IslandPass - Rare & Far

```typescript
class IslandPass implements GenerationPass {
  execute(context: GenerationContext): void {
    const islands = this.getIslandCenters(context.chunkCoord, context.seed, {
      spacing: 600,            // Very sparse (rare feature)
      minDistanceFromSpawn: 300,  // Far from spawn
      noiseOffset: 200
    })

    const rng = new SeededRandom(context.seed + context.chunkCoord.hash() + 8000)

    for (const island of islands) {
      this.generateIsland(context, island, rng)
    }
  }

  private generateIsland(context, island, rng): void {
    // Gaussian: mean=25, stdDev=5, range=15-35 blocks
    const radius = Math.floor(rng.clampedGaussian(25, 5, 15, 35))
    const thickness = Math.floor(rng.clampedGaussian(12, 2, 8, 16))

    const chunkX = context.chunkCoord.x * 24
    const chunkZ = context.chunkCoord.z * 24

    for (let x = 0; x < 24; x++) {
      for (let z = 0; z < 24; z++) {
        const worldX = chunkX + x
        const worldZ = chunkZ + z

        const dx = worldX - island.x
        const dz = worldZ - island.z
        const horizontalDist = Math.sqrt(dx*dx + dz*dz)

        if (horizontalDist > radius) continue

        // Dome shape (cosine curve)
        const heightFactor = Math.cos((horizontalDist / radius) * Math.PI / 2)
        const topY = Math.floor(island.y + thickness * heightFactor)
        const bottomY = Math.floor(island.y - thickness)

        for (let y = bottomY; y <= topY; y++) {
          if (y < 0 || y >= 256) continue

          if (y === topY) {
            context.setBlock(x, y, z, BlockType.grass)  // Top = grass
          } else {
            context.setBlock(x, y, z, BlockType.stone)  // Interior = stone
          }
        }
      }
    }
  }
}
```

---

### 8. CrystalPass - Cave Decoration

```typescript
class CrystalPass implements GenerationPass {
  execute(context: GenerationContext): void {
    const positions = this.getCrystalPositions(
      context.chunkCoord,
      context.seed,
      spacing: 12  // Very sparse grid
    )

    const rng = new SeededRandom(context.seed + context.chunkCoord.hash() + 9000)

    for (const pos of positions) {
      // Only 5% of grid positions get crystals
      if (rng.next() > 0.05) continue

      if (!this.canPlaceCrystal(context, pos.x, pos.z)) continue

      this.placeCrystal(context, pos.x, pos.z, rng)
    }
  }

  private placeCrystal(context, x, z, rng): void {
    // Find cave surface
    for (let y = 10; y < 100; y++) {
      if (context.getBlock(x, y, z) !== BlockType.air) continue
      if (!context.isCave(x, y, z)) continue

      const below = context.getBlock(x, y - 1, z)
      const above = context.getBlock(x, y + 1, z)

      const biome = context.getUndergroundBiomeAt(x, z)
      const material = BlockType.glowstone  // Always glowstone (not biome-specific)

      // Gaussian: mean=6, stdDev=2, range=3-12
      const height = Math.floor(rng.clampedGaussian(6, 2, 3, 12))

      if (below !== BlockType.air) {
        // Stalagmite
        for (let i = 0; i < height; i++) {
          context.setBlock(x, y + i, z, material)
        }
        break
      } else if (above !== BlockType.air) {
        // Stalactite
        for (let i = 0; i < height; i++) {
          context.setBlock(x, y - i, z, material)
        }
        break
      }
    }
  }
}
```

---

## Probabilistic System (Gaussian Distribution)

### SeededRandom Enhancement:

```typescript
class SeededRandom {
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

  // NEW: Clamped Gaussian (prevent extreme outliers)
  clampedGaussian(mean: number, stdDev: number, min: number, max: number): number {
    let value = this.gaussian(mean, stdDev)
    return Math.max(min, Math.min(max, value))
  }
}
```

### Feature Size Distributions:

**Trees:**
- Height: mean=6, stdDev=1, range=2-9
  - 68% are 5-7 blocks (normal)
  - 95% are 4-8 blocks
  - 0.3% are 2-3 or 8-9 (rare variety)
- Canopy: mean=4, stdDev=1, range=2-6
- Trunk: Always 1 block wide

**Cave Formations (Stalactites/Stalagmites):**
- Height: mean=4, stdDev=1.5, range=2-7
  - 68% are 2.5-5.5 blocks
  - 95% are 1-7 blocks
  - Rare 2 or 7 block formations

**Islands:**
- Radius: mean=25, stdDev=5, range=15-35
- Height: mean=95, stdDev=10, range=80-110
- Thickness: mean=12, stdDev=2, range=8-16

**Caves:**
- Tunnel radius: mean=5, stdDev=1, range=3-8

---

## Updated World Configuration

### default.json (Balanced):

```json
{
  "meta": {
    "name": "Balanced World",
    "seed": 42069,
    "version": "0.2.0"
  },
  "terrain": {
    "generator": "multi_scale_noise",
    "baseHeight": 35,
    "continentalNoise": {
      "type": "simplex",
      "frequency": 0.001,
      "octaves": 2,
      "amplitude": 40
    },
    "terrainNoise": {
      "type": "simplex",
      "frequency": 0.01,
      "octaves": 3,
      "amplitude": 15
    },
    "detailNoise": {
      "type": "simplex",
      "frequency": 0.05,
      "octaves": 2,
      "amplitude": 3
    }
  },
  "climate": {
    "temperatureNoise": {
      "frequency": 0.003,
      "octaves": 2
    },
    "humidityNoise": {
      "frequency": 0.004,
      "octaves": 2
    }
  },
  "biomes": {
    "surface": ["PLAINS", "FOREST", "DESERT", "MOUNTAINS", "TUNDRA"],
    "underground": ["DRIPSTONE_CAVES", "ICE_CAVES", "LUSH_CAVES"]
  },
  "features": {
    "caves": {
      "cheeseThreshold": 0.65,
      "spaghettiDensity": 0.02
    },
    "trees": {
      "baseSpacing": 8,
      "heightMean": 6,
      "heightStdDev": 1,
      "canopyMean": 4
    },
    "islands": {
      "spacing": 600,
      "minDistanceFromSpawn": 300
    },
    "formations": {
      "spacing": 5,
      "heightMean": 4
    }
  }
}
```

---

## Migration Strategy

### Phase 1: Fix Critical Bugs (Quick Wins)
1. ✅ Fix spawn height (done - Y=120)
2. **Fix spacebar jump** (investigate input system)
3. **Remove glass from surface** (ice caves only underground)

### Phase 2: Implement Proper Multi-Pass
1. Rewrite TerrainPass (multi-scale noise)
2. Rewrite CavePass (cheese + spaghetti)
3. Rewrite BiomePass (3D biomes, after caves)
4. Add CaveFormationPass (your stalactite request)
5. Rewrite TreePass (grid + validation)
6. Rewrite IslandPass (rare, far)
7. Rewrite CrystalPass (cave-only)

### Phase 3: Testing & Tuning
1. Test each biome visually
2. Tune noise parameters
3. Adjust densities
4. Verify no overlapping features

---

## Success Criteria

**Visual Quality:**
- ✅ No overlapping trees
- ✅ No floating blocks
- ✅ Natural-looking terrain variety
- ✅ Biome transitions make sense
- ✅ Cave formations add atmosphere

**Gameplay:**
- ✅ Player can spawn and move
- ✅ All controls work (including jump)
- ✅ Terrain is explorable
- ✅ Features feel rewarding to discover

**Performance:**
- ✅ 60 FPS at RD=5
- ✅ Chunk generation <50ms average
- ✅ No frame drops

**Technical:**
- ✅ All tests passing
- ✅ Follows SOLID principles
- ✅ Uses industry best practices
- ✅ Code is maintainable

---

## Implementation Recommendation

**I recommend we:**
1. **First:** Fix the spacebar jump issue (5-10 min) - critical for testing
2. **Then:** Implement the redesign in a NEW branch (don't patch current code)
3. **Use:** Systematic approach - one pass at a time with validation

**Would you like me to:**
- A) Fix jump controls now, then create implementation plan for redesign?
- B) Create detailed implementation plan first, then execute?
- C) Something else?