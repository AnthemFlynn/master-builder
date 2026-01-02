# World Generation Redesign - Complete Implementation Roadmap

**Date:** 2025-12-15
**Status:** Plans Complete - Ready for Execution
**Total Effort:** ~15-20 hours across 4 epics

---

## Overview

Complete redesign of world generation system based on Minecraft research to fix:
- Glass columns (ice cave formations)
- Overlapping trees
- Wrong pass ordering
- Massive feature scales
- Player spawning in terrain

**Root Cause:** Current system generates all features simultaneously without validation, using wrong scales and incorrect pass ordering.

**Solution:** Proper multi-pass system (Terrain → Caves → Biomes → Features) with Minecraft-scale features and validated placement.

---

## Epic Breakdown

### Epic 1: Infrastructure (6 tasks, ~3 hours) ✅ PLAN COMPLETE
**File:** `docs/plans/2025-12-15-world-gen-epic1-infrastructure.md`

**Adds:**
- Gaussian distributions (SeededRandom)
- Climate data (temperature/humidity maps)
- Surface tracking with cave detection
- Cave and feature tracking
- Biome data structures
- Biome tracking methods

**Dependencies:** None
**Output:** Enhanced GenerationContext ready for new passes

---

### Epic 2: Core Pass Redesign (6 tasks, ~5 hours)

**Goal:** Rewrite TerrainPass, CavePass, BiomePass using new infrastructure

#### Task 2.1: Rewrite TerrainPass with Multi-Scale Noise

**Changes:**
- Replace single noise with 5 noise samplers (continental, terrain, detail, temperature, humidity)
- Sample and combine all noise layers
- Store climate data in GenerationContext
- Initialize surface map

**Key Code:**
```typescript
// Multi-scale noise combination
const continental = continentalNoise(worldX * 0.001, worldZ * 0.001) * 40
const terrain = terrainNoise(worldX * 0.01, worldZ * 0.01) * 15
const detail = detailNoise(worldX * 0.05, worldZ * 0.05) * 3

const height = Math.floor(baseHeight + continental + terrain + detail)

// Store climate
context.temperature[x][z] = temperatureNoise(worldX * 0.003, worldZ * 0.003)
context.humidity[x][z] = humidityNoise(worldX * 0.004, worldZ * 0.004)
```

**Test Verification:**
- Heights vary naturally (not flat)
- Climate data populated
- Surface map initialized

**Files:**
- Modify: `src/modules/world/generation/passes/TerrainPass.ts` (complete rewrite)
- Update: `src/modules/world/generation/passes/__tests__/TerrainPass.test.ts`

---

#### Task 2.2: Add Cheese Caves (3D Density)

**Changes:**
- Create new `CavePass.ts` (replace WormCaveGenerator usage)
- Implement 3D density-based cavern generation
- Mark cave blocks in GenerationContext
- Depth restrictions (Y=5 to surfaceHeight-10)

**Algorithm:**
```typescript
for each block in valid range:
  density = noise3D(worldX * 0.04, y * 0.04, worldZ * 0.04)
  if density > 0.65:  // Threshold = ~35% caves
    carve block
    mark as cave
```

**Test Verification:**
- Caves carved in chunks
- No caves near surface (within 10 blocks)
- Cave blocks tracked

**Files:**
- Create: `src/modules/world/generation/passes/CavePass.ts`
- Create: `src/modules/world/generation/passes/__tests__/CavePass.test.ts`

---

#### Task 2.3: Add Spaghetti Caves to CavePass

**Changes:**
- Add worm tunnel generation to CavePass
- 2% spawn rate (very sparse)
- Smaller radius (mean=5, Gaussian)
- Depth restrictions

**Key Code:**
```typescript
// Sparse spawning
if (rng.next() > 0.02) return

// Gaussian radius: mean=5, stdDev=1, range=3-8
const radius = rng.clampedGaussian(5, 1, 3, 8)
```

**Test Verification:**
- Tunnels carved
- Deterministic (same seed = same caves)
- Proper winding with 3D noise

---

#### Task 2.4: Add Surface Map Rebuilding

**Changes:**
- After carving caves, scan to find real surface
- Detect cave surfaces (underground)
- Update GenerationContext.surfaceMap

**Algorithm:**
```typescript
for each X,Z:
  scan from heightMap[x][z] downward:
    find first solid block = real surface
    isCave = (realSurfaceY < heightMap - 5)
```

**Critical:** This fixes BiomePass using stale heights

---

#### Task 2.5: Rewrite BiomePass (3D Biomes)

**Changes:**
- Use surfaceMap instead of heightMap
- Skip cave surfaces
- Add underground biome application
- Apply cave floor materials

**Key Code:**
```typescript
const surface = context.surfaceMap.get(`${x},${z}`)
if (surface.isCave) continue  // Skip cave ceilings

// Determine biomes
const surfaceBiome = getSurfaceBiome(temp, humidity, surface.y)
const undergroundBiome = getUndergroundBiome(temp, humidity)

// Apply surface materials
context.setBlock(x, surface.y, z, surfaceBiome.surfaceBlock)

// Apply cave floor materials (where caves exist)
applyCaveFloorBlocks(context, x, z, undergroundBiome)
```

**Test Verification:**
- Correct surface blocks (grass in plains, sand in desert)
- Underground biomes applied
- Ice caves have glass floors (**explains glass columns!**)

---

#### Task 2.6: Update ChunkWorker Pass Ordering

**Changes:**
```typescript
// OLD (WRONG):
new TerrainPass(),
new DramaticFeaturesPass(),  // All features together
new BiomePass()               // BEFORE caves!

// NEW (CORRECT):
new TerrainPass(),
new CavePass(),               // Caves BEFORE biomes
new BiomePass()               // Uses updated surface map
```

**Integration Test:**
- Generate chunk at (0,0)
- Verify no glass on surface
- Verify ice caves have glass underground
- Verify surface materials correct
- Verify caves carved properly

**Files:**
- Modify: `src/modules/world/workers/ChunkWorker.ts:20-24`
- Create: `src/modules/world/generation/__tests__/IntegrationEpic2.test.ts`

---

### Epic 3: Feature Passes (6 tasks, ~5 hours)

**Goal:** Add properly validated feature generation passes

#### Task 3.1: Create CaveFormationPass (Stalactites/Stalagmites)

**Requirements:**
- Grid-based placement (spacing: 5 blocks)
- Only in caves with 8+ blocks vertical space
- Biome-specific materials (stone in dripstone, glass in ice)
- Gaussian height (mean=4, stdDev=1.5, range=2-7)
- Tapered shape (thick at base, thin at tip)

**Test Cases:**
- Only places in caves
- Correct biome materials
- Proper tapering
- Deterministic placement

---

#### Task 3.2: Rewrite TreePass with Validation

**Requirements:**
- Grid-based (spacing: 8 blocks, jittered with noise)
- Biome density check (forests 8%, plains 2%)
- Surface type validation (grass or dirt only)
- Flatness check (3x3 area within 2 blocks variance)
- Spacing validation (minimum 5-6 blocks from other trees)
- Vertical space check (8+ blocks of air above)

**Scales:**
- Height: Gaussian mean=6, stdDev=1, range=2-9
- Canopy: Gaussian mean=4, stdDev=1, range=2-6
- Trunk: Always 1 block wide

**Test Cases:**
- No overlapping trees
- Trees only on grass/dirt
- No trees on steep slopes
- Biome-specific density

---

#### Task 3.3: Rewrite IslandPass (Rare & Far)

**Requirements:**
- Grid spacing: 600 blocks (very rare)
- Min distance from spawn: 300 blocks
- Skip grid (0,0) entirely
- Dome-shaped (cosine curve height)
- Gaussian radius (mean=25, stdDev=5, range=15-35)

**Test Cases:**
- No island at spawn
- Proper dome shapes (not cylinders)
- Correct spacing
- Deterministic

---

#### Task 3.4: Rewrite CrystalPass (Cave-Only Glowstone)

**Requirements:**
- Grid-based (spacing: 12 blocks)
- Only in caves
- Always glowstone (not biome-specific)
- 5% spawn rate
- Gaussian height (mean=6, stdDev=2, range=3-12)

**Test Cases:**
- Only in caves
- Always glowstone material
- Proper spacing

---

#### Task 3.5: Update ChunkWorker with All Passes

**Final ordering:**
```typescript
new TerrainPass(),
new CavePass(),
new BiomePass(),
new CaveFormationPass(),
new TreePass(),
new IslandPass(),
new CrystalPass()
```

---

#### Task 3.6: Scale Tuning and Integration Test

**Tune:**
- Verify all Gaussian means/stdDevs produce good variety
- Adjust densities if too sparse/dense
- Test multiple biomes

**Integration Test:**
- Generate 3x3 chunk area
- Verify all features present
- Verify no overlapping
- Verify proper scales

---

### Epic 4: Controls & Polish (4 tasks, ~2 hours)

#### Task 4.1: Fix Spacebar Jump Controls

**Investigation:**
- Check InputService action bindings
- Verify 'jump' action registered
- Test in browser

**Files:**
- Check: `src/modules/input/application/InputService.ts`
- Check: `src/modules/physics/application/PhysicsService.ts`

---

#### Task 4.2: Remove Old DramaticFeaturesPass

**Cleanup:**
- Delete old feature generator files
- Remove DramaticFeaturesPass
- Clean up unused imports

**Files to delete:**
- `src/modules/world/generation/features/FloatingIslandGenerator.ts`
- `src/modules/world/generation/features/WormCaveGenerator.ts`
- `src/modules/world/generation/features/GiantTreeGenerator.ts`
- `src/modules/world/generation/features/CrystalFormationGenerator.ts`
- `src/modules/world/generation/passes/DramaticFeaturesPass.ts`
- Associated test files

---

#### Task 4.3: Create Flat Test World

**Create:**
```json
// public/worlds/test-flat.json
{
  "meta": { "name": "Testing - No Features", "seed": 11111 },
  "terrain": { "generator": "flat", "baseHeight": 32 },
  "features": {
    "caves": { "enabled": false },
    "trees": { "enabled": false },
    "islands": { "enabled": false }
  }
}
```

**Purpose:** Verify basic terrain works before adding features

---

#### Task 4.4: Visual Validation & Final Tuning

**Checklist:**
- [ ] Player spawns in air, falls to ground
- [ ] Can move (WASD + Space jump)
- [ ] Terrain looks natural (varied heights)
- [ ] Biomes visible (deserts, forests, plains)
- [ ] Trees proper scale (5-7 blocks)
- [ ] No overlapping trees
- [ ] Caves explorable
- [ ] Stalactites/stalagmites in caves
- [ ] Ice caves have glass formations
- [ ] Islands rare and far from spawn
- [ ] No floating artifacts
- [ ] 60 FPS at RD=5

---

## Execution Order

**Must execute in sequence:**
1. Epic 1: Infrastructure (prepare GenerationContext)
2. Epic 2: Core Passes (fix generation foundation)
3. Epic 3: Feature Passes (add validated features)
4. Epic 4: Polish (controls, cleanup, testing)

**Cannot skip or reorder** - each epic depends on previous.

---

## Key Implementation Notes

### Gaussian Distribution Usage

**All features use clampedGaussian for natural variety:**
```typescript
// Trees
height: rng.clampedGaussian(mean=6, stdDev=1, min=2, max=9)
canopy: rng.clampedGaussian(mean=4, stdDev=1, min=2, max=6)

// Cave formations
height: rng.clampedGaussian(mean=4, stdDev=1.5, min=2, max=7)

// Islands
radius: rng.clampedGaussian(mean=25, stdDev=5, min=15, max=35)

// Caves
radius: rng.clampedGaussian(mean=5, stdDev=1, min=3, max=8)
```

**Result:** 68% within 1 stdDev of mean, 95% within 2 stdDev, rare extreme values

### Pass Ordering (Critical)

**Terrain → Caves → Biomes → Features**

Why this order:
1. Terrain creates heightmap
2. Caves carve (changes surface)
3. Biomes use real surface (after caves)
4. Features validate surface type

**Wrong order causes:**
- Biomes applied to wrong heights
- Features placed in invalid locations
- Floating blocks in caves

### Grid-Based Placement

**All features use deterministic grids:**
```typescript
// Get grid positions
for (gx in grid) {
  for (gz in grid) {
    position = grid * spacing + noise_jitter

    // Probabilistic filter
    if (rng.next() > density) continue

    // Validation
    if (!canPlace(position)) continue

    // Place feature
    placeFeature(position)
  }
}
```

**Benefits:**
- Deterministic (same seed = same world)
- Natural spacing
- Prevents clustering
- Allows validation

### Surface Validation (Trees)

**4-check system:**
1. Surface type (grass/dirt only)
2. Not cave ceiling
3. Flatness (3x3 area within 2 blocks)
4. Spacing (no trees within 5-6 blocks)

**Prevents:**
- Trees on stone
- Trees in caves
- Trees on cliffs
- Overlapping trees

### Scale Reference (Minecraft-Sized)

**Current (Broken) → New (Balanced):**
- Trees: 25-75 blocks → 5-7 blocks (mean=6)
- Canopy: 12-28 radius → 3-5 radius (mean=4)
- Islands: 50-100 radius → 20-30 radius (mean=25)
- Caves: 6-14 radius → 4-6 radius (mean=5)
- Formations: 12-28 height → 3-5 height (mean=4)

---

## Testing Strategy

### Per-Epic Testing

**Epic 1:**
- Unit tests for each GenerationContext method
- Gaussian distribution statistical tests
- Biome data structure validation

**Epic 2:**
- TerrainPass: Multi-scale noise produces variety
- CavePass: Cheese + spaghetti caves carved correctly
- BiomePass: Correct materials, cave floors applied
- Integration: Full pipeline (Terrain → Caves → Biomes)

**Epic 3:**
- Each feature pass tested in isolation
- Validation checks verified (trees don't overlap)
- Scale verification (trees 5-7 blocks)
- Integration: All passes together

**Epic 4:**
- Controls test (jump works)
- Visual validation checklist
- Performance test (60 FPS at RD=5)

### Integration Tests

**Create test worlds:**
```json
// test-terrain-only.json - Just terrain, no features
// test-with-caves.json - Terrain + caves only
// test-with-trees.json - Terrain + caves + trees only
// test-full.json - All features enabled
```

**Verify incrementally:** Each world adds one feature type

---

## Known Issues & Mitigations

### Issue 1: Glass Columns
**Root Cause:** Ice cave formations placing glass (ice) blocks
**Fix:** Ice caves are underground biomes (intentional in Minecraft)
**Mitigation:** Ensure ice caves only spawn in cold underground areas, not on surface

### Issue 2: Trees Overlapping
**Root Cause:** Random density with no spacing validation
**Fix:** Grid-based with 5-6 block minimum spacing check

### Issue 3: Massive Scale
**Root Cause:** Features 5-10x larger than Minecraft
**Fix:** Use Minecraft-scale values (trees 5-7 blocks, not 40)

### Issue 4: Player Stuck at Spawn
**Root Cause:** Spawning at Y=80, tree canopy reaches Y=99
**Fix:** Spawn at Y=120 (done), reduce tree height to max 9 blocks

### Issue 5: Wrong Pass Order
**Root Cause:** BiomePass before CavePass uses stale heightMap
**Fix:** CavePass → BiomePass (biomes use real surface after caves)

---

## File Changes Summary

**New Files (~15):**
```
src/modules/world/generation/biomes/
  ├── BiomeTypes.ts
  ├── SurfaceBiomes.ts
  └── UndergroundBiomes.ts

src/modules/world/generation/passes/
  ├── CavePass.ts
  ├── CaveFormationPass.ts
  └── TreePass.ts (rewrite)

src/modules/world/generation/__tests__/
  ├── SeededRandom.test.ts
  ├── CavePass.test.ts
  ├── CaveFormationPass.test.ts
  ├── IntegrationEpic2.test.ts
  └── IntegrationEpic3.test.ts

public/worlds/
  ├── test-terrain-only.json
  ├── test-with-caves.json
  └── test-with-trees.json
```

**Modified Files (~10):**
```
src/modules/world/generation/
  ├── GenerationContext.ts (major enhancements)
  ├── passes/TerrainPass.ts (rewrite)
  ├── passes/BiomePass.ts (rewrite)
  └── utils/SeededRandom.ts (add Gaussian)

src/modules/world/workers/
  └── ChunkWorker.ts (pass ordering)

src/core/
  └── index.ts (spawn height)

public/worlds/
  └── default.json (updated scales)
```

**Deleted Files (~10):**
```
src/modules/world/generation/features/
  ├── FeatureGenerator.ts
  ├── FloatingIslandGenerator.ts
  ├── WormCaveGenerator.ts
  ├── GiantTreeGenerator.ts
  ├── CrystalFormationGenerator.ts
  └── __tests__/ (all feature tests)

src/modules/world/generation/passes/
  └── DramaticFeaturesPass.ts
```

---

## Success Criteria

**Technical:**
- [ ] All tests passing (40+ tests)
- [ ] TypeScript compiles with no errors
- [ ] Build succeeds
- [ ] No console errors during chunk generation

**Visual:**
- [ ] Natural-looking terrain with variety
- [ ] Biomes visually distinct
- [ ] Features properly sized (Minecraft-scale)
- [ ] No overlapping features
- [ ] No floating blocks

**Gameplay:**
- [ ] Player spawns and falls to ground
- [ ] All controls work (WASD + Space)
- [ ] Can explore caves
- [ ] Can find different biomes
- [ ] 60 FPS stable at RD=5

**Code Quality:**
- [ ] SOLID principles followed
- [ ] Proper encapsulation (no direct array access)
- [ ] DRY (no duplicate validation logic)
- [ ] Well-tested (unit + integration)
- [ ] Documented (comments explain algorithms)

---

## Recommended Execution Approach

**Option A: Sequential Epics**
1. Execute Epic 1 completely
2. Test and verify infrastructure
3. Execute Epic 2 completely
4. Test and verify core passes
5. Execute Epic 3 completely
6. Test and verify features
7. Execute Epic 4
8. Final validation

**Option B: Incremental Testing**
1. Execute each TASK individually
2. Test after each task
3. Verify in browser after each pass redesign
4. Iterate if needed

**Recommendation:** Option A (epic-by-epic) for cleaner checkpoints

---

## Next Steps

1. **Review this roadmap** - Ensure approach makes sense
2. **Execute Epic 1** using `docs/plans/2025-12-15-world-gen-epic1-infrastructure.md`
3. **I will write detailed Epic 2 plan** after Epic 1 complete (to adapt based on learnings)
4. **Continue through Epic 3 and 4**

**Estimated Timeline:**
- Epic 1: 3 hours
- Epic 2: 5 hours
- Epic 3: 5 hours
- Epic 4: 2 hours
- **Total: 15 hours** for complete, working, properly-architected world generation

---

## References

- [World generation – Minecraft Wiki](https://minecraft.wiki/w/World_generation)
- [The World Generation of Minecraft - Alan Zucconi](https://www.alanzucconi.com/2022/06/05/minecraft-world-generation/)
- [Procedural generation - Voxel Tools](https://voxel-tools.readthedocs.io/en/latest/procedural_generation/)
- Design doc: `docs/plans/2025-12-15-world-generation-redesign.md`
