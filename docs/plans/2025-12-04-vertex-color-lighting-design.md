# Vertex Color Lighting System - Design Document

**Date:** 2025-12-04
**Status:** Approved
**Goal:** Replace DataTexture shader approach with industry-standard vertex color lighting

---

## Problem Statement

Current Phase 5 implementation uses DataTexture + custom shaders for per-block RGB lighting. This approach has fundamental architectural issues:

1. **Single texture, multiple chunks** - Texture holds 24×256×24 (one chunk) but world has many chunks
2. **Poor scalability** - Each chunk upload overwrites previous chunk data
3. **Complex shader math** - UV coordinate calculation per pixel is expensive
4. **No smooth lighting** - Lighting is flat per-block (Minecraft has smooth interpolation)

**Result:** Only blocks in the last-updated chunk render with correct lighting. All others are black.

---

## Solution: Vertex Colors + Greedy Meshing

Replace InstancedMesh rendering with BufferGeometry per chunk, baking lighting into vertex colors during mesh generation.

### Why This Approach

**Industry Standard:**
- Minecraft: Uses vertex colors with smooth lighting
- Minetest: Greedy meshing + vertex colors
- All WebGL voxel engines researched: Same approach

**Performance Benefits:**
- 90%+ polygon reduction via greedy meshing
- No texture lookup overhead (colors passed directly)
- GPU interpolation for smooth lighting (free)
- Scales to unlimited chunks trivially

**Quality Benefits:**
- Smooth lighting (interpolates between blocks)
- Ambient occlusion (contact shadows)
- Better visual fidelity than flat lighting

---

## Architecture

### Component Structure

```
Chunk (data storage - unchanged)
  ↓
GreedyMesher (voxels → optimized quads)
  ↓
FaceBuilder (quads → vertices with lighting + AO)
  ↓
ChunkMesh (owns THREE.Mesh)
  ↓
Scene (one mesh per chunk)
```

### Class Responsibilities

**GreedyMesher**
- Input: Chunk with block types + lighting data
- Algorithm: Greedy meshing (merge adjacent faces)
- Output: List of merged quads with metadata
- Constraint: Only merge if lighting matches exactly

**FaceBuilder**
- Input: Quad (position, size, block type)
- Generates: 4 vertices per quad
- Per-vertex data:
  - Position (vec3)
  - Color (RGB lighting × AO)
  - UV (texture atlas coordinates)
- Smooth lighting: Averages 4 neighboring blocks per vertex
- AO calculation: Based on 3 surrounding blocks

**ChunkMesh**
- Owns: THREE.Mesh + BufferGeometry
- Methods:
  - `rebuild()` - Regenerates mesh from chunk data
  - `dispose()` - Cleanup geometry
- Lifecycle: Created once per chunk, rebuilt on dirty

**ChunkMeshManager** (new)
- Manages: All ChunkMesh instances
- Dirty tracking: Priority queue (block > light > global)
- Update budget: 3ms per frame
- Rebuilds: 2-3 chunks per frame maximum

---

## Greedy Meshing Algorithm

### Overview
Sweep along each axis, build 2D mask of visible faces, find maximal rectangles, merge into quads.

### Pseudocode

```
For each axis (X, Y, Z):
  For each slice perpendicular to axis:
    Build 2D mask of visible faces:
      - Compare block vs neighbor along axis
      - Face visible if different or transparent

    Find rectangles in mask:
      For each cell in mask:
        If empty, skip

        Expand width while:
          - Same block type
          - Same lighting RGB
          - Mask cell valid

        Expand height while:
          - All cells in row match
          - Same block type
          - Same lighting RGB

        Create quad(x, y, width, height, blockType, lighting)
        Clear mask cells
```

### Critical Rule
**Only merge if lighting matches:** Preserves lighting detail while reducing polygons.

Example:
- 10 grass blocks in a row, all light=15 → 1 quad
- 10 grass blocks, light=[15,15,14,14,14,15,15,15,15,15] → 3 quads

---

## Smooth Lighting System

### Per-Vertex Sampling

Each quad vertex averages lighting from surrounding blocks:

**Top face, corner vertex:**
```
Samples 4 blocks:
  [x, y+1, z]      (directly above)
  [x+1, y+1, z]    (above + right)
  [x, y+1, z+1]    (above + forward)
  [x+1, y+1, z+1]  (above + diagonal)

Average: (L1 + L2 + L3 + L4) / 4
```

**Side faces:**
- Sample 2-4 neighbors depending on corner position
- Fewer samples = faster, still looks smooth

### RGB Channel Handling

```typescript
const light = {
  r: (r1 + r2 + r3 + r4) / 4 / 15,  // Normalize to [0, 1]
  g: (g1 + g2 + g3 + g4) / 4 / 15,
  b: (b1 + b2 + b3 + b4) / 4 / 15
}
```

GPU automatically interpolates between the 4 vertex colors → smooth gradient across quad.

---

## Ambient Occlusion

### Algorithm (0fps.net)

```typescript
function vertexAO(side1: boolean, side2: boolean, corner: boolean): number {
  if (side1 && side2) return 0  // Fully occluded
  return 3 - (side1 + side2 + corner)
}
```

**Returns:** 0 (darkest) to 3 (brightest)

### Application

```typescript
const ao = vertexAO(checkSide1, checkSide2, checkCorner) / 3.0  // [0, 1]
vertexColor = lightColor * ao
```

**Visual Effect:**
- Interior corners: Dark (AO = 0)
- Edges: Medium (AO = 1-2)
- Open faces: Bright (AO = 3)

---

## Dynamic Update Strategy

### Hybrid Approach

**Instant Updates (< 5 chunks affected):**
- Block placement/destruction
- Single torch placed
- Rebuilds within same frame (< 3ms)

**Staggered Updates (> 5 chunks affected):**
- Light propagation from new light source
- Sunrise/sunset (global illumination change)
- 2-3 chunks per frame, completes in 1-3 seconds
- Priority queue: player actions first, global changes last

### Update Budget

```typescript
const REBUILD_BUDGET_MS = 3  // Modern hardware can handle this
const MAX_CHUNKS_PER_FRAME = 3  // Typically rebuilds in 1ms each
```

Profiling targets:
- Single chunk rebuild: < 2ms
- Greedy meshing: < 0.5ms
- Vertex generation: < 1ms
- GPU upload: < 0.5ms

---

## Migration Strategy

### Files to Create

1. **src/terrain/mesh/GreedyMesher.ts** (~400 lines)
   - Core greedy meshing algorithm
   - Face culling logic
   - Quad generation

2. **src/terrain/mesh/FaceBuilder.ts** (~200 lines)
   - Vertex position generation
   - Smooth lighting calculation
   - AO calculation
   - UV mapping for texture atlas

3. **src/terrain/mesh/ChunkMesh.ts** (~100 lines)
   - Wraps THREE.Mesh
   - Rebuild trigger
   - Geometry disposal

4. **src/terrain/ChunkMeshManager.ts** (~150 lines)
   - Dirty tracking
   - Update budget
   - Priority queue

### Files to Modify

1. **src/terrain/index.ts**
   - Remove: `blocks: InstancedMesh[]`
   - Add: `chunkMeshManager: ChunkMeshManager`
   - Update: `generate()` method
   - Update: `update()` method
   - Update: Block placement/destruction logic

2. **src/terrain/mesh/materials.ts**
   - Add: `vertexColors: true`
   - Remove: `createLightShader()` calls
   - Simplify: Single material per block type (no shader complexity)

3. **src/terrain/ChunkManager.ts**
   - Add: Dirty tracking methods
   - Add: Neighbor chunk queries (for edge lighting)

### Files to Delete

1. **src/lighting/LightShader.ts** - No longer needed
2. **src/lighting/LightDataTexture.ts** - No longer needed

### Files to Keep (Unchanged)

1. **src/lighting/LightingEngine.ts** - Propagation logic is perfect
2. **src/terrain/Chunk.ts** - Storage is perfect
3. **src/blocks/** - Block registry unchanged

---

## Performance Expectations

### Before (InstancedMesh)
- Draw calls: 14 (one per block type)
- Polygons: ~600k (147k blocks × 6 faces × ~60% visible)
- Memory: ~50MB (instance matrices)
- Lighting: Broken (multi-chunk)

### After (Greedy Meshing + Vertex Colors)
- Draw calls: ~49 (7×7 chunks at render distance 3)
- Polygons: ~50k (90% reduction via merging)
- Memory: ~12MB (geometry buffers)
- Lighting: Working + smooth + AO

**Net Result:** ~10× fewer polygons, working lighting, smooth visuals.

---

## Testing Strategy

### Incremental Validation

**Checkpoint 1: Single Chunk, No Merging**
- Generate BufferGeometry for chunk (0,0)
- All faces separate (no greedy meshing yet)
- Flat vertex colors (no smooth lighting yet)
- **Verify:** Visually identical to current, lighting works

**Checkpoint 2: Add Greedy Meshing**
- Implement rectangle merging
- **Verify:** Polygon count drops 80%+, visually identical

**Checkpoint 3: Add Smooth Lighting**
- Average neighbor blocks per vertex
- **Verify:** Lighting gradients appear, looks better

**Checkpoint 4: Add Ambient Occlusion**
- Calculate vertex AO
- **Verify:** Corners darker, depth perception improved

**Checkpoint 5: Multiple Chunks**
- Extend to all visible chunks
- **Verify:** Seamless chunk boundaries, no artifacts

**Checkpoint 6: Dynamic Updates**
- Implement dirty tracking + rebuild
- **Verify:** Torch placement smooth, sunrise gradual

### Performance Benchmarks

- Mesh generation: < 2ms per chunk
- 60fps maintained at render distance 3 (49 chunks)
- Memory: < 15MB for geometry
- No frame drops during chunk rebuilds

---

## Risks & Mitigations

**Risk 1: Greedy meshing complexity**
- Mitigation: Implement basic version first, optimize later
- Fallback: Can disable merging and still have working vertex colors

**Risk 2: Performance regression**
- Mitigation: Profile at each checkpoint
- Fallback: Adjust rebuild budget or chunk size

**Risk 3: Visual artifacts at chunk boundaries**
- Mitigation: Smooth lighting samples across chunks
- Fallback: Use chunk-local lighting if needed

**Risk 4: Rebuild cost during global updates**
- Mitigation: Staggered updates with priority queue
- Fallback: Reduce render distance or skip distant chunks

---

## Success Criteria

**Minimum Viable:**
- ✅ Lighting works correctly for all chunks
- ✅ 60fps at render distance 3
- ✅ Smooth lighting visible
- ✅ Dynamic updates work (torch placement)

**Optimal:**
- ✅ 90%+ polygon reduction achieved
- ✅ Ambient occlusion working
- ✅ No visible frame drops during updates
- ✅ Memory usage < 15MB for geometry

---

## Next Steps

1. Write this design to git
2. Create implementation plan with detailed tasks
3. Set up isolated worktree for development
4. Begin implementation with checkpoint 1

**Ready to proceed?**
