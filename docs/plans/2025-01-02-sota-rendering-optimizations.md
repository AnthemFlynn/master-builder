# SOTA Rendering Optimizations Design

**Date:** 2025-01-02
**Status:** Approved
**Goal:** Implement Three.js/voxel engine state-of-the-art rendering optimizations

---

## Overview

Three optimizations to bring rendering performance to SOTA voxel engine standards:

1. **Packed Vertex Format** - 8 bytes/vertex instead of 48 bytes (6× reduction)
2. **InstancedMesh for Vegetation** - Single draw call per chunk for all flora
3. **Per-Section Frustum Culling** - 24 meshes per chunk, cull vertically

---

## 1. Packed Vertex Format

### Current State
- 5 separate BufferAttributes: positions (12B), normals (12B), colors (12B), uvs (8B), layers (4B)
- Total: **48 bytes per vertex**
- 6 vertices per quad = 288 bytes per face

### SOTA Approach
Based on [Vercidium](https://vercidium.com/blog/voxel-world-optimisations/) and [Exile](https://thenumb.at/Voxel-Meshing-in-Exile/) engines.

Pack each vertex into **2 × uint32 = 8 bytes**:

```
uint32[0]: Position + UV
├─ bits 0-4:   X position (0-31, local chunk coords)
├─ bits 5-9:   Z position (0-31, local chunk coords)
├─ bits 10-17: U coordinate (0-255, supports greedy mesh tiling)
├─ bits 18-25: V coordinate (0-255, supports greedy mesh tiling)
├─ bits 26-31: unused (6 bits, future use)

uint32[1]: Y + Texture + Normal + AO
├─ bits 0-8:   Y position (0-383, full world height)
├─ bits 9-20:  Texture layer (0-4095, texture array index)
├─ bits 21-23: Normal index (0-5 for ±X/±Y/±Z)
├─ bits 24-27: AO corners (4 × 1-bit, simplified)
├─ bits 28-31: Light level (0-15, combined sky+block max)
```

### Vertex Shader Unpacking

```glsl
// Attributes
attribute uvec2 aPackedVertex;  // Two uint32 values

// Uniforms
uniform vec3 uChunkOffset;      // World position of chunk origin

void main() {
  // Unpack first uint32
  uint p0 = aPackedVertex.x;
  float x = float(p0 & 31u);
  float z = float((p0 >> 5u) & 31u);
  float u = float((p0 >> 10u) & 255u) / 255.0;
  float v = float((p0 >> 18u) & 255u) / 255.0;

  // Unpack second uint32
  uint p1 = aPackedVertex.y;
  float y = float(p1 & 511u);
  uint texLayer = (p1 >> 9u) & 4095u;
  uint normalIdx = (p1 >> 21u) & 7u;
  uint ao = (p1 >> 24u) & 15u;
  uint light = (p1 >> 28u) & 15u;

  // Reconstruct position
  vec3 localPos = vec3(x, y, z);
  vec3 worldPos = localPos + uChunkOffset;

  // Reconstruct normal from index
  vec3 normals[6] = vec3[6](
    vec3(1, 0, 0), vec3(-1, 0, 0),
    vec3(0, 1, 0), vec3(0, -1, 0),
    vec3(0, 0, 1), vec3(0, 0, -1)
  );
  vNormal = normals[normalIdx];

  // Pass to fragment
  vUv = vec2(u, v);
  vLayer = float(texLayer);
  vAO = float(ao) / 15.0;
  vLight = float(light) / 15.0;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `VertexBuilder.ts` | Output `Uint32Array` with packed format |
| `VoxelShader.ts` | Add unpacking logic to vertex shader |
| `MeshingService.ts` | Use `Uint32BufferAttribute` for packed data |
| `MeshingWorker.ts` | Transfer single packed buffer |
| `types.ts` | Simplify `GeometryBuffers` to `packedVertices: ArrayBuffer` |

### Benefits
- **6× less GPU memory** per mesh
- **6× faster buffer uploads** to GPU
- Better cache locality during vertex fetch
- Reduced memory bandwidth

---

## 2. InstancedMesh for Vegetation

### Current State
- Cross-billboard blocks (flowers, grass) rendered as individual quads
- 4 triangles × 6 vertices = 24 vertices per vegetation block
- N vegetation blocks = N × 24 vertices, N draw contributions

### SOTA Approach
Based on [Codrops 2025](https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/).

Use `THREE.InstancedMesh` with per-chunk vegetation:

```typescript
// Shared geometry: Two crossed quads (billboard)
const crossGeometry = createCrossBillboardGeometry()

// Per-chunk: InstancedMesh with vegetation count
const vegetationMesh = new THREE.InstancedMesh(
  crossGeometry,
  vegetationMaterial,
  maxVegetationPerChunk  // e.g., 1024
)

// Instance attributes (per vegetation block)
// - Position: vec3 (world position)
// - TextureLayer: float (which plant texture)
// - Variation: float (rotation, scale variation)
```

### Instance Attribute Buffer

```typescript
// Per-instance data: 16 bytes
struct VegetationInstance {
  x: float,      // 4 bytes - world X
  y: float,      // 4 bytes - world Y
  z: float,      // 4 bytes - world Z
  packed: uint32 // 4 bytes - texture (12 bits) + variation (20 bits)
}
```

### Shader Modifications

```glsl
// Instance attributes
attribute vec3 instancePosition;
attribute float instanceData;  // Packed texture + variation

void main() {
  // Unpack instance data
  uint packed = floatBitsToUint(instanceData);
  uint texLayer = packed & 4095u;
  float rotation = float((packed >> 12u) & 255u) / 255.0 * 3.14159;
  float scale = 0.8 + float((packed >> 20u) & 255u) / 255.0 * 0.4;

  // Apply rotation around Y axis
  mat2 rot = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation));
  vec2 rotatedXZ = rot * position.xz;

  // Apply scale and offset
  vec3 worldPos = vec3(rotatedXZ.x, position.y, rotatedXZ.y) * scale + instancePosition;

  vLayer = float(texLayer);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}
```

### Files to Modify/Create

| File | Changes |
|------|---------|
| `VegetationRenderer.ts` | NEW: Manages per-chunk InstancedMesh |
| `VegetationShader.ts` | NEW: Instance-aware vertex/fragment shaders |
| `ChunkMesher.ts` | Separate vegetation from terrain during meshing |
| `VertexBuilder.ts` | Output vegetation instances separately |
| `ChunkRenderer.ts` | Add vegetation mesh alongside opaque/transparent |

### Benefits
- **1 draw call** per chunk for all vegetation (vs N)
- **70-80% polygon reduction** (shared geometry)
- Frustum cull entire vegetation with chunk
- Easy to add wind animation via shader

---

## 3. Per-Section Frustum Culling

### Current State
- Each chunk has 1 opaque mesh + 1 transparent mesh
- Entire 16×16×384 column rendered or culled together
- Underground sections rendered when looking at sky
- Sky sections rendered when in caves

### SOTA Approach
Create 24 meshes per chunk (one per 16×16×16 section):

```typescript
interface ChunkMeshes {
  sections: SectionMesh[]  // 24 sections
  vegetation: THREE.InstancedMesh
}

interface SectionMesh {
  sectionY: number         // 0-23
  opaque: THREE.Mesh | null
  transparent: THREE.Mesh | null
  boundingBox: THREE.Box3  // For frustum culling
  isEmpty: boolean         // Skip if no blocks
}
```

### Frustum Culling Logic

```typescript
// In render loop
for (const section of chunk.sections) {
  if (section.isEmpty) continue

  // Check if section bounding box intersects camera frustum
  if (!frustum.intersectsBox(section.boundingBox)) continue

  // Render section meshes
  if (section.opaque) renderer.render(section.opaque)
  if (section.transparent) renderer.render(section.transparent)
}
```

### Empty Section Optimization
Already implemented in `ChunkSection.ts`:

```typescript
isSectionEmpty(index: number): boolean
getNonEmptySections(): number[]
```

### Files to Modify

| File | Changes |
|------|---------|
| `ChunkRenderer.ts` | Store 24 meshes per chunk, frustum cull each |
| `MeshingService.ts` | Build mesh per section, not per chunk |
| `ChunkMesher.ts` | Accept section bounds, mesh only that section |
| `VertexBuilder.ts` | Track vertices per section |

### Benefits
- **Skip 50-80% of mesh rendering** in typical gameplay
- Underground: Only render sections player can see
- Surface: Skip deep underground sections
- Flying high: Skip low sections

---

## Implementation Order

### Phase 1: Packed Vertex Format (Highest Impact)
1. Update `VertexBuilder.ts` to output packed `Uint32Array`
2. Update `VoxelShader.ts` with unpacking vertex shader
3. Update `MeshingService.ts` to use `Uint32BufferAttribute`
4. Update worker types and transfer
5. Test: Verify rendering matches before/after

### Phase 2: Per-Section Meshes
1. Modify `ChunkMesher.ts` to accept section bounds
2. Update `MeshingService.ts` to mesh per section
3. Update `ChunkRenderer.ts` to store/cull per section
4. Add frustum intersection checks
5. Test: Verify culling works, no visual artifacts

### Phase 3: InstancedMesh Vegetation
1. Create `VegetationRenderer.ts` and `VegetationShader.ts`
2. Separate vegetation from terrain in `ChunkMesher.ts`
3. Collect vegetation instances in `VertexBuilder.ts`
4. Integrate with `ChunkRenderer.ts`
5. Test: Verify vegetation renders correctly

---

## Verification Checklist

- [ ] Packed vertices: 8 bytes/vertex confirmed
- [ ] Memory usage reduced ~6× for geometry
- [ ] No visual artifacts from packing precision
- [ ] Per-section culling working (debug visualization)
- [ ] Empty sections skipped entirely
- [ ] Vegetation using InstancedMesh (1 draw call/chunk)
- [ ] FPS improved at render distance 5+
- [ ] No regression in chunk load time

---

## References

- [Vercidium: 4 bytes/vertex](https://vercidium.com/blog/voxel-world-optimisations/)
- [Exile: 8 bytes/vertex with AO](https://thenumb.at/Voxel-Meshing-in-Exile/)
- [Nick's Blog: Vertex Pooling](https://nickmcd.me/2021/04/04/high-performance-voxel-engine/)
- [Codrops: InstancedMesh Grass](https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/)
- [Three.js InterleavedBuffer Docs](https://threejs.org/docs/#api/core/InterleavedBuffer)
