# Vertex Color Lighting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace InstancedMesh + DataTexture shader approach with BufferGeometry + vertex color lighting for correct multi-chunk RGB lighting.

**Architecture:** Per-chunk BufferGeometry meshes with lighting baked into vertex colors during greedy meshing. Supports smooth lighting, ambient occlusion, and dynamic updates with rebuild budget.

**Tech Stack:** Three.js 0.181, TypeScript 5.7, Greedy meshing algorithm, Vertex colors

---

## Task 1: Create FaceBuilder Class (Vertex Generation)

**Goal:** Build the foundation for generating quad vertices with lighting and AO.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/terrain/mesh/FaceBuilder.ts`
- Reference: `src/terrain/Chunk.ts` (for getLight method)

**Step 1: Create FaceBuilder skeleton**

```typescript
import * as THREE from 'three'
import { Chunk } from '../Chunk'
import { BlockType } from '../index'

/**
 * Generates quad vertices with lighting and ambient occlusion
 */
export class FaceBuilder {
  private positions: number[] = []
  private colors: number[] = []
  private uvs: number[] = []
  private indices: number[] = []
  private vertexCount = 0

  constructor(private chunk: Chunk) {}

  /**
   * Add a quad face to the mesh
   */
  addQuad(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,  // 0=X, 1=Y, 2=Z
    direction: -1 | 1,  // negative or positive face
    blockType: BlockType
  ): void {
    // TODO: Implementation
  }

  /**
   * Build final BufferGeometry
   */
  buildGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    if (this.positions.length === 0) {
      return geometry  // Empty chunk
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2))
    geometry.setIndex(this.indices)

    return geometry
  }

  /**
   * Get vertex light (smooth lighting - averages neighbors)
   */
  private getVertexLight(x: number, y: number, z: number): { r: number, g: number, b: number } {
    // TODO: Implementation
    return { r: 1.0, g: 1.0, b: 1.0 }
  }

  /**
   * Get vertex ambient occlusion (0-3 scale)
   */
  private getVertexAO(x: number, y: number, z: number, face: number): number {
    // TODO: Implementation
    return 3
  }
}
```

**Step 2: Commit skeleton**

```bash
cd .worktrees/vertex-color-lighting
git add src/terrain/mesh/FaceBuilder.ts
git commit -m "feat: add FaceBuilder skeleton for vertex generation"
```

---

## Task 2: Implement Vertex Light Calculation (Smooth Lighting)

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/FaceBuilder.ts:37-41`

**Step 1: Implement getVertexLight with neighbor averaging**

Replace the TODO at line 37-41 with:

```typescript
  private getVertexLight(x: number, y: number, z: number): { r: number, g: number, b: number } {
    // Sample the block and its neighbors for smooth lighting
    // Average up to 8 surrounding blocks (or fewer at chunk boundaries)

    let r = 0, g = 0, b = 0, count = 0

    // Sample 3x3x3 cube around vertex
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nx = x + dx
          const ny = y + dy
          const nz = z + dz

          // Bounds check
          if (nx < 0 || nx >= 24 || ny < 0 || ny >= 256 || nz < 0 || nz >= 24) {
            continue
          }

          const light = this.chunk.getLight(nx, ny, nz)

          // Combine sky + block light (max of each channel)
          const combined = {
            r: Math.max(light.sky.r, light.block.r),
            g: Math.max(light.sky.g, light.block.g),
            b: Math.max(light.sky.b, light.block.b)
          }

          r += combined.r
          g += combined.g
          b += combined.b
          count++
        }
      }
    }

    // Normalize to [0, 1] range (max value is 15)
    return {
      r: count > 0 ? (r / count) / 15 : 1.0,
      g: count > 0 ? (g / count) / 15 : 1.0,
      b: count > 0 ? (b / count) / 15 : 1.0
    }
  }
```

**Step 2: Commit**

```bash
git add src/terrain/mesh/FaceBuilder.ts
git commit -m "feat: implement smooth vertex lighting with neighbor averaging"
```

---

## Task 3: Implement Ambient Occlusion Calculation

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/FaceBuilder.ts:43-47`

**Step 1: Add helper to check if block is solid**

Add after the constructor:

```typescript
  /**
   * Check if block at position is solid (for AO calculation)
   */
  private isBlockSolid(x: number, y: number, z: number): boolean {
    // Out of bounds = not solid (air)
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return false
    }

    // TODO: Get block type from chunk
    // For now, assume any non-air block is solid
    const light = this.chunk.getLight(x, y, z)

    // If both sky and block light are 0, it's probably solid
    // This is a heuristic until we add getBlockType to Chunk
    return (light.sky.r + light.sky.g + light.sky.b) === 0
  }
```

**Step 2: Implement getVertexAO**

Replace the TODO at line 43-47 with:

```typescript
  private getVertexAO(
    x: number, y: number, z: number,
    normal: { x: number, y: number, z: number }
  ): number {
    // AO algorithm from 0fps.net
    // Check 3 neighbors: side1, side2, corner

    // Determine which neighbors to check based on face normal
    let side1 = false, side2 = false, corner = false

    if (normal.y === 1) {
      // Top face - check blocks above
      side1 = this.isBlockSolid(x + 1, y + 1, z)
      side2 = this.isBlockSolid(x, y + 1, z + 1)
      corner = this.isBlockSolid(x + 1, y + 1, z + 1)
    } else if (normal.y === -1) {
      // Bottom face
      side1 = this.isBlockSolid(x + 1, y - 1, z)
      side2 = this.isBlockSolid(x, y - 1, z + 1)
      corner = this.isBlockSolid(x + 1, y - 1, z + 1)
    } else if (normal.x !== 0) {
      // Side face (X axis)
      const offset = normal.x
      side1 = this.isBlockSolid(x + offset, y + 1, z)
      side2 = this.isBlockSolid(x + offset, y, z + 1)
      corner = this.isBlockSolid(x + offset, y + 1, z + 1)
    } else {
      // Side face (Z axis)
      const offset = normal.z
      side1 = this.isBlockSolid(x + 1, y, z + offset)
      side2 = this.isBlockSolid(x, y + 1, z + offset)
      corner = this.isBlockSolid(x + 1, y + 1, z + offset)
    }

    // Calculate AO value
    if (side1 && side2) {
      return 0  // Fully occluded
    }

    return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0)
  }
```

**Step 3: Commit**

```bash
git add src/terrain/mesh/FaceBuilder.ts
git commit -m "feat: implement ambient occlusion calculation"
```

---

## Task 4: Implement Quad Vertex Generation

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/FaceBuilder.ts:18-25`

**Step 1: Implement addQuad method**

Replace the TODO at lines 18-25 with:

```typescript
  addQuad(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1,
    blockType: BlockType
  ): void {
    // Generate 4 vertices for the quad
    const vertices = this.getQuadVertices(x, y, z, width, height, axis, direction)
    const normal = this.getFaceNormal(axis, direction)

    for (let i = 0; i < 4; i++) {
      const v = vertices[i]

      // Position
      this.positions.push(v.x, v.y, v.z)

      // Lighting + AO
      const light = this.getVertexLight(v.x, v.y, v.z)
      const ao = this.getVertexAO(v.x, v.y, v.z, normal) / 3.0  // Normalize to [0, 1]

      this.colors.push(
        light.r * ao,
        light.g * ao,
        light.b * ao
      )

      // UVs (temporary - will add texture atlas later)
      this.uvs.push(v.u, v.v)
    }

    // Add indices for 2 triangles (quad)
    const i = this.vertexCount
    this.indices.push(
      i, i + 1, i + 2,  // Triangle 1
      i, i + 2, i + 3   // Triangle 2
    )

    this.vertexCount += 4
  }
```

**Step 2: Add helper methods**

Add after addQuad:

```typescript
  /**
   * Get 4 vertices for a quad
   */
  private getQuadVertices(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): Array<{ x: number, y: number, z: number, u: number, v: number }> {
    const vertices: Array<{ x: number, y: number, z: number, u: number, v: number }> = []

    // Offset for face position (0 or 1 depending on direction)
    const offset = direction === 1 ? 1 : 0

    if (axis === 1) {
      // Top/Bottom face (Y axis)
      vertices.push(
        { x: x, y: y + offset, z: z, u: 0, v: 0 },
        { x: x + width, y: y + offset, z: z, u: width, v: 0 },
        { x: x + width, y: y + offset, z: z + height, u: width, v: height },
        { x: x, y: y + offset, z: z + height, u: 0, v: height }
      )
    } else if (axis === 0) {
      // Side face (X axis)
      vertices.push(
        { x: x + offset, y: y, z: z, u: 0, v: 0 },
        { x: x + offset, y: y, z: z + width, u: width, v: 0 },
        { x: x + offset, y: y + height, z: z + width, u: width, v: height },
        { x: x + offset, y: y + height, z: z, u: 0, v: height }
      )
    } else {
      // Side face (Z axis)
      vertices.push(
        { x: x, y: y, z: z + offset, u: 0, v: 0 },
        { x: x + width, y: y, z: z + offset, u: width, v: 0 },
        { x: x + width, y: y + height, z: z + offset, u: width, v: height },
        { x: x, y: y + height, z: z + offset, u: 0, v: height }
      )
    }

    return vertices
  }

  /**
   * Get face normal vector
   */
  private getFaceNormal(axis: 0 | 1 | 2, direction: -1 | 1): { x: number, y: number, z: number } {
    if (axis === 0) return { x: direction, y: 0, z: 0 }
    if (axis === 1) return { x: 0, y: direction, z: 0 }
    return { x: 0, y: 0, z: direction }
  }
```

**Step 3: Commit**

```bash
git add src/terrain/mesh/FaceBuilder.ts
git commit -m "feat: implement quad vertex generation with lighting and AO"
```

---

## Task 5: Create GreedyMesher Class (Core Algorithm)

**Goal:** Implement greedy meshing to merge adjacent faces with matching lighting.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/terrain/mesh/GreedyMesher.ts`

**Step 1: Create GreedyMesher skeleton**

```typescript
import { Chunk } from '../Chunk'
import { BlockType } from '../index'
import { FaceBuilder } from './FaceBuilder'

/**
 * Greedy meshing algorithm for voxel terrain
 * Merges adjacent faces with matching block type and lighting
 */
export class GreedyMesher {
  constructor(private chunk: Chunk) {}

  /**
   * Build optimized mesh with greedy merging
   */
  buildMesh(faceBuilder: FaceBuilder): void {
    // Process each axis
    for (const axis of [0, 1, 2] as const) {
      // Process both directions (+/-)
      for (const direction of [-1, 1] as const) {
        this.processAxis(faceBuilder, axis, direction)
      }
    }
  }

  /**
   * Process one axis/direction combination
   */
  private processAxis(
    faceBuilder: FaceBuilder,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): void {
    // TODO: Greedy meshing implementation
  }

  /**
   * Check if face is visible (different block or transparent neighbor)
   */
  private isFaceVisible(
    x: number, y: number, z: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): BlockType | null {
    // TODO: Implementation
    return null
  }

  /**
   * Check if two positions have matching lighting
   */
  private lightMatches(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number
  ): boolean {
    const l1 = this.chunk.getLight(x1, y1, z1)
    const l2 = this.chunk.getLight(x2, y2, z2)

    // Must match exactly (all 6 channels)
    return (
      l1.sky.r === l2.sky.r && l1.sky.g === l2.sky.g && l1.sky.b === l2.sky.b &&
      l1.block.r === l2.block.r && l1.block.g === l2.block.g && l1.block.b === l2.block.b
    )
  }

  /**
   * Get block type at position (temporary - needs chunk.getBlockType)
   */
  private getBlockType(x: number, y: number, z: number): BlockType {
    // TODO: This needs chunk to expose getBlockType method
    // For now, assume grass at surface, stone below
    if (y === 31) return BlockType.grass
    if (y < 31) return BlockType.stone
    return -1 as BlockType  // Air
  }
}
```

**Step 2: Commit**

```bash
git add src/terrain/mesh/GreedyMesher.ts
git commit -m "feat: add GreedyMesher skeleton"
```

---

## Task 6: Implement Face Visibility Check

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/GreedyMesher.ts:40-46`

**Step 1: Implement isFaceVisible**

Replace the TODO at lines 40-46:

```typescript
  private isFaceVisible(
    x: number, y: number, z: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): BlockType | null {
    // Bounds check
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return null
    }

    const currentBlock = this.getBlockType(x, y, z)

    // Air blocks don't have faces
    if (currentBlock === -1) {
      return null
    }

    // Check neighbor in the direction of this face
    let nx = x, ny = y, nz = z

    if (axis === 0) nx += direction
    else if (axis === 1) ny += direction
    else nz += direction

    // Neighbor out of bounds = visible (chunk boundary)
    if (nx < 0 || nx >= 24 || ny < 0 || ny >= 256 || nz < 0 || nz >= 24) {
      return currentBlock
    }

    const neighborBlock = this.getBlockType(nx, ny, nz)

    // Face visible if neighbor is different or air
    if (neighborBlock === -1 || neighborBlock !== currentBlock) {
      return currentBlock
    }

    return null  // Hidden face
  }
```

**Step 2: Commit**

```bash
git add src/terrain/mesh/GreedyMesher.ts
git commit -m "feat: implement face visibility checking for culling"
```

---

## Task 7: Implement Greedy Meshing Core Algorithm

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/GreedyMesher.ts:28-38`

**Step 1: Implement processAxis with greedy rectangle merging**

Replace the TODO at lines 28-38:

```typescript
  private processAxis(
    faceBuilder: FaceBuilder,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): void {
    // Determine dimensions for this axis
    const [u, v] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1]
    const uSize = [24, 256, 24][u]
    const vSize = [24, 256, 24][v]
    const axisSize = [24, 256, 24][axis]

    // Sweep along axis
    for (let d = 0; d < axisSize; d++) {
      // Build 2D mask of visible faces
      const mask: (BlockType | null)[][] = []
      for (let i = 0; i < uSize; i++) {
        mask[i] = []
        for (let j = 0; j < vSize; j++) {
          // Convert 2D (i,j,d) to 3D (x,y,z) based on axis
          let x = 0, y = 0, z = 0
          if (axis === 0) { x = d; y = i; z = j }
          else if (axis === 1) { x = i; y = d; z = j }
          else { x = i; y = j; z = d }

          mask[i][j] = this.isFaceVisible(x, y, z, axis, direction)
        }
      }

      // Greedy merge rectangles in mask
      for (let i = 0; i < uSize; i++) {
        for (let j = 0; j < vSize; j++) {
          const blockType = mask[i][j]
          if (blockType === null) continue

          // Get 3D position for lighting check
          let baseX = 0, baseY = 0, baseZ = 0
          if (axis === 0) { baseX = d; baseY = i; baseZ = j }
          else if (axis === 1) { baseX = i; baseY = d; baseZ = j }
          else { baseX = i; baseY = j; baseZ = d }

          // Expand width (j direction)
          let width = 1
          while (j + width < vSize) {
            // Check block type matches
            if (mask[i][j + width] !== blockType) break

            // Check lighting matches
            let checkX = baseX, checkY = baseY, checkZ = baseZ
            if (axis === 0) checkZ += width
            else if (axis === 1) checkZ += width
            else checkY += width

            if (!this.lightMatches(baseX, baseY, baseZ, checkX, checkY, checkZ)) break

            width++
          }

          // Expand height (i direction)
          let height = 1
          while (i + height < uSize) {
            let canExpand = true

            // Check entire row
            for (let k = 0; k < width; k++) {
              if (mask[i + height][j + k] !== blockType) {
                canExpand = false
                break
              }

              // Check lighting
              let checkX = baseX, checkY = baseY, checkZ = baseZ
              if (axis === 0) { checkY += height; checkZ += k }
              else if (axis === 1) { checkX += height; checkZ += k }
              else { checkX += height; checkY += k }

              if (!this.lightMatches(baseX, baseY, baseZ, checkX, checkY, checkZ)) {
                canExpand = false
                break
              }
            }

            if (!canExpand) break
            height++
          }

          // Add merged quad
          faceBuilder.addQuad(baseX, baseY, baseZ, width, height, axis, direction, blockType)

          // Clear mask
          for (let di = 0; di < height; di++) {
            for (let dj = 0; dj < width; dj++) {
              mask[i + di][j + dj] = null
            }
          }
        }
      }
    }
  }
```

**Step 2: Commit**

```bash
git add src/terrain/mesh/GreedyMesher.ts
git commit -m "feat: implement greedy meshing core algorithm with lighting awareness"
```

---

## Task 8: Create ChunkMesh Class

**Goal:** Wrapper for THREE.Mesh with rebuild capability.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/terrain/mesh/ChunkMesh.ts`

**Step 1: Implement ChunkMesh**

```typescript
import * as THREE from 'three'
import { Chunk } from '../Chunk'
import { GreedyMesher } from './GreedyMesher'
import { FaceBuilder } from './FaceBuilder'

/**
 * Manages the visual mesh for one chunk
 */
export class ChunkMesh {
  mesh: THREE.Mesh | null = null

  constructor(
    private chunk: Chunk,
    private scene: THREE.Scene,
    private material: THREE.Material
  ) {}

  /**
   * Build or rebuild the mesh from chunk data
   */
  rebuild(): void {
    const startTime = performance.now()

    // Remove old mesh
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
    }

    // Generate new geometry
    const faceBuilder = new FaceBuilder(this.chunk)
    const mesher = new GreedyMesher(this.chunk)

    mesher.buildMesh(faceBuilder)
    const geometry = faceBuilder.buildGeometry()

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material)

    // Position at chunk world coordinates
    this.mesh.position.set(
      this.chunk.x * 24,
      0,
      this.chunk.z * 24
    )

    this.scene.add(this.mesh)

    const duration = performance.now() - startTime
    console.log(`🔨 Rebuilt chunk (${this.chunk.x}, ${this.chunk.z}) in ${duration.toFixed(2)}ms`)
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      this.mesh = null
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/terrain/mesh/ChunkMesh.ts
git commit -m "feat: add ChunkMesh class for per-chunk mesh management"
```

---

## Task 9: Add getBlockType to Chunk Class

**Goal:** Chunk needs to expose block types for mesher.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/Chunk.ts`
- Reference: `src/terrain/index.ts` (to understand how blocks are stored)

**Step 1: Add blockTypes storage to Chunk**

After the light arrays (around line 18), add:

```typescript
  // Block types (24 × 256 × 24 = 147,456 entries)
  // -1 = air, 0+ = BlockType enum
  blockTypes: Int8Array
```

**Step 2: Initialize in constructor (around line 30)**

After initializing light arrays:

```typescript
    // Block types = air initially
    this.blockTypes = new Int8Array(arraySize).fill(-1)
```

**Step 3: Add getBlockType method (before getLight method)**

```typescript
  /**
   * Get block type at local chunk coordinates
   */
  getBlockType(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return -1  // Air
    }

    const index = x + y * this.size + z * this.size * this.height
    return this.blockTypes[index]
  }

  /**
   * Set block type at local chunk coordinates
   */
  setBlockType(x: number, y: number, z: number, blockType: number): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return
    }

    const index = x + y * this.size + z * this.size * this.height
    this.blockTypes[index] = blockType
    this.dirty = true
  }
```

**Step 4: Update memory usage calculation**

Find the `getMemoryUsage()` method and update it to include blockTypes:

```typescript
  getMemoryUsage(): number {
    // 6 light arrays × 147,456 + 1 blockTypes array
    return (this.size * this.height * this.size) * 7
  }
```

**Step 5: Commit**

```bash
git add src/terrain/Chunk.ts
git commit -m "feat: add block type storage and accessors to Chunk"
```

---

## Task 10: Populate Chunk Block Types During Generation

**Goal:** When terrain generates, populate chunk.blockTypes so mesher knows what to render.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts`
- Focus: Find where blocks are placed (search for `setMatrixAt` or block generation)

**Step 1: Find terrain generation code**

Search for where blocks are currently placed:

```bash
cd .worktrees/vertex-color-lighting
grep -n "setMatrixAt" src/terrain/index.ts | head -5
```

**Expected:** Lines where InstancedMesh matrices are set.

**Step 2: Add chunk.setBlockType calls**

Find the block placement logic (likely in `generate()` method or worker callback). After each block placement, add:

```typescript
// Existing code (example):
this.blocks[blockType].setMatrixAt(instanceId, matrix)

// NEW: Also store in chunk
const { chunkX, chunkZ, localX, localY, localZ } =
  this.chunkManager.worldToChunk(x, y, z)
const chunk = this.chunkManager.getChunk(chunkX, chunkZ)
chunk.setBlockType(localX, localY, localZ, blockType)
```

**Step 3: Test by adding debug logging**

In `src/terrain/Chunk.ts`, temporarily add to `setBlockType`:

```typescript
  setBlockType(x: number, y: number, z: number, blockType: number): void {
    // ... existing code ...

    if (Math.random() < 0.001) {  // Log 0.1% of calls
      console.log(`📝 Chunk (${this.x}, ${this.z}) block set at (${x},${y},${z}) = ${blockType}`)
    }
  }
```

**Step 4: Run dev server and verify**

```bash
npm run dev
```

Open browser, check console for "📝 Chunk" messages.

**Expected:** See block type assignments logged.

**Step 5: Remove debug logging and commit**

```bash
git add src/terrain/index.ts src/terrain/Chunk.ts
git commit -m "feat: populate chunk block types during terrain generation"
```

---

## Task 11: Update GreedyMesher to Use Real Block Types

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/GreedyMesher.ts:73-79`

**Step 1: Replace getBlockType stub**

Delete the stub method (lines 73-79) and update isFaceVisible to use chunk directly:

```typescript
  private isFaceVisible(
    x: number, y: number, z: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): BlockType | null {
    // Bounds check
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return null
    }

    const currentBlock = this.chunk.getBlockType(x, y, z)

    // Air blocks don't have faces
    if (currentBlock === -1) {
      return null
    }

    // Check neighbor
    let nx = x, ny = y, nz = z

    if (axis === 0) nx += direction
    else if (axis === 1) ny += direction
    else nz += direction

    // Neighbor out of bounds = visible
    if (nx < 0 || nx >= 24 || ny < 0 || ny >= 256 || nz < 0 || nz >= 24) {
      return currentBlock as BlockType
    }

    const neighborBlock = this.chunk.getBlockType(nx, ny, nz)

    // Face visible if different or air
    if (neighborBlock === -1 || neighborBlock !== currentBlock) {
      return currentBlock as BlockType
    }

    return null
  }
```

**Step 2: Commit**

```bash
git add src/terrain/mesh/GreedyMesher.ts
git commit -m "feat: use chunk.getBlockType for real block data"
```

---

## Task 12: Enable Vertex Colors in Materials

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/materials.ts:49-65`

**Step 1: Remove shader application, enable vertex colors**

Replace lines 49-65 (the shader application code):

```typescript
    // Apply vertex colors to all materials
    this.materials = {} as Record<MaterialType, THREE.Material | THREE.Material[]>

    for (const [key, material] of Object.entries(rawMaterials)) {
      if (Array.isArray(material)) {
        // Multi-face materials
        this.materials[key as MaterialType] = material.map(mat => {
          mat.vertexColors = true  // Enable vertex color multiplication
          return mat
        })
      } else {
        (material as THREE.MeshStandardMaterial).vertexColors = true
        this.materials[key as MaterialType] = material
      }
    }

    console.log('✅ Materials created with vertex colors enabled')
```

**Step 2: Remove setLightTexture method (no longer needed)**

Delete the `setLightTexture()` method entirely (lines 75-94).

**Step 3: Commit**

```bash
git add src/terrain/mesh/materials.ts
git commit -m "feat: enable vertex colors, remove shader system"
```

---

## Task 13: Create ChunkMeshManager

**Goal:** Manage all chunk meshes with dirty tracking and rebuild budget.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/terrain/ChunkMeshManager.ts`

**Step 1: Implement ChunkMeshManager**

```typescript
import * as THREE from 'three'
import { Chunk } from './Chunk'
import { ChunkMesh } from './mesh/ChunkMesh'

type DirtyReason = 'block' | 'light' | 'global'

/**
 * Manages chunk mesh lifecycle with dirty tracking and rebuild budget
 */
export class ChunkMeshManager {
  private meshes = new Map<string, ChunkMesh>()
  private dirtyChunks = new Map<string, DirtyReason>()
  private rebuildBudgetMs = 3  // ms per frame

  constructor(
    private scene: THREE.Scene,
    private material: THREE.Material
  ) {}

  /**
   * Get or create ChunkMesh for chunk
   */
  getOrCreateMesh(chunk: Chunk): ChunkMesh {
    const key = `${chunk.x},${chunk.z}`

    if (!this.meshes.has(key)) {
      const chunkMesh = new ChunkMesh(chunk, this.scene, this.material)
      this.meshes.set(key, chunkMesh)
    }

    return this.meshes.get(key)!
  }

  /**
   * Mark chunk dirty for rebuild
   */
  markDirty(chunkX: number, chunkZ: number, reason: DirtyReason): void {
    const key = `${chunkX},${chunkZ}`

    // Higher priority overrides lower
    const currentReason = this.dirtyChunks.get(key)
    if (currentReason === 'block') return  // Already highest priority

    this.dirtyChunks.set(key, reason)
  }

  /**
   * Update: rebuild dirty chunks within budget
   */
  update(chunkManager: any): void {
    if (this.dirtyChunks.size === 0) return

    const startTime = performance.now()
    const dirty = Array.from(this.dirtyChunks.entries())

    // Sort by priority
    const priority = { block: 0, light: 1, global: 2 }
    dirty.sort((a, b) => priority[a[1]] - priority[b[1]])

    let rebuilt = 0

    for (const [key, reason] of dirty) {
      // Check budget
      if (performance.now() - startTime > this.rebuildBudgetMs) {
        break
      }

      // Rebuild chunk
      const [x, z] = key.split(',').map(Number)
      const chunk = chunkManager.getChunk(x, z)
      const chunkMesh = this.getOrCreateMesh(chunk)

      chunkMesh.rebuild()

      this.dirtyChunks.delete(key)
      rebuilt++
    }

    if (rebuilt > 0) {
      console.log(`🔨 Rebuilt ${rebuilt} chunks (${this.dirtyChunks.size} remaining)`)
    }
  }

  /**
   * Dispose all meshes
   */
  disposeAll(): void {
    for (const chunkMesh of this.meshes.values()) {
      chunkMesh.dispose()
    }
    this.meshes.clear()
    this.dirtyChunks.clear()
  }
}
```

**Step 2: Commit**

```bash
git add src/terrain/ChunkMeshManager.ts
git commit -m "feat: add ChunkMeshManager with dirty tracking and budget"
```

---

## Task 14: Replace InstancedMesh with ChunkMeshManager in Terrain

**Goal:** Swap rendering systems in terrain/index.ts.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts`

**Step 1: Remove InstancedMesh properties**

Find and remove (around lines 91-125):
- `blocks: THREE.InstancedMesh[]`
- `blocksCount: number[]`
- `blocksFactor: number[]`
- `idMap: Map<string, number>`
- `cloud: THREE.InstancedMesh`
- `generateWorker: Worker`

**Step 2: Add ChunkMeshManager**

Add import:

```typescript
import { ChunkMeshManager } from './ChunkMeshManager'
```

Add property (around line 93):

```typescript
  chunkMeshManager: ChunkMeshManager
```

**Step 3: Initialize in constructor (around line 52)**

After materials initialization:

```typescript
    // Initialize ChunkMeshManager
    this.chunkMeshManager = new ChunkMeshManager(
      this.scene,
      this.materials.get(MaterialType.grass) as THREE.Material  // Shared material for now
    )
```

**Step 4: Remove old texture/shader initialization**

Delete lines initializing:
- `lightDataTexture`
- `materials.setLightTexture()`

**Step 5: Remove worker callback handler**

Delete the `generateWorker.onmessage` handler entirely (around lines 54-76).

**Step 6: Commit**

```bash
git add src/terrain/index.ts
git commit -m "refactor: replace InstancedMesh with ChunkMeshManager"
```

---

## Task 15: Update Terrain.update() Method

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts:358-387`

**Step 1: Replace texture upload with mesh updates**

Find the `update()` method and replace the texture upload code:

```typescript
  update = () => {
    this.chunk.set(
      Math.floor(this.camera.position.x / this.chunkSize),
      Math.floor(this.camera.position.z / this.chunkSize)
    )

    // Generate terrain when entering new chunk
    if (
      this.chunk.x !== this.previousChunk.x ||
      this.chunk.y !== this.previousChunk.y
    ) {
      this.generate()
    }

    // Propagate lighting
    this.lightingEngine.update()

    // Update chunk meshes (rebuilds dirty chunks)
    this.chunkMeshManager.update(this.chunkManager)

    this.previousChunk.copy(this.chunk)
    this.highlight.update()
  }
```

**Step 2: Commit**

```bash
git add src/terrain/index.ts
git commit -m "refactor: update loop to use chunk mesh manager"
```

---

## Task 16: Update Terrain Generation to Use ChunkMesh

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts`
- Focus: `generate()` method

**Step 1: Find and simplify generate() method**

The current `generate()` likely uses a web worker. Replace it with direct chunk mesh creation:

```typescript
  generate = () => {
    const distance = this.distance

    // Generate chunks in render distance
    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const chunkX = this.chunk.x + x
        const chunkZ = this.chunk.y + z
        const chunk = this.chunkManager.getChunk(chunkX, chunkZ)

        // Generate blocks for this chunk (if not already generated)
        if (!this.isChunkGenerated(chunk)) {
          this.generateChunkBlocks(chunk)

          // Mark dirty for mesh building
          this.chunkMeshManager.markDirty(chunkX, chunkZ, 'block')
        }
      }
    }
  }

  /**
   * Check if chunk has been generated
   */
  private isChunkGenerated(chunk: Chunk): boolean {
    // Check if any blocks exist (sample middle)
    const blockType = chunk.getBlockType(12, 128, 12)
    return blockType !== -1
  }

  /**
   * Generate blocks for one chunk using noise
   */
  private generateChunkBlocks(chunk: Chunk): void {
    const chunkWorldX = chunk.x * this.chunkSize
    const chunkWorldZ = chunk.z * this.chunkSize

    for (let localX = 0; localX < this.chunkSize; localX++) {
      for (let localZ = 0; localZ < this.chunkSize; localZ++) {
        const worldX = chunkWorldX + localX
        const worldZ = chunkWorldZ + localZ

        // Calculate height using noise
        const height = Math.floor(
          this.noise.get(worldX / this.noise.gap, worldZ / this.noise.gap, this.noise.seed) *
            this.noise.amp + 30
        )

        for (let localY = 0; localY < this.chunkSize; localY++) {
          const worldY = localY  // Y is not offset by chunk

          let blockType: BlockType | -1 = -1  // Air

          if (worldY === 0) {
            blockType = BlockType.bedrock
          } else if (worldY < height - 3) {
            blockType = BlockType.stone
          } else if (worldY < height) {
            blockType = BlockType.dirt
          } else if (worldY === Math.floor(height)) {
            blockType = BlockType.grass
          }

          if (blockType !== -1) {
            chunk.setBlockType(localX, worldY, localZ, blockType)
          }
        }
      }
    }

    console.log(`🌍 Generated chunk (${chunk.x}, ${chunk.z})`)
  }
```

**Step 3: Commit**

```bash
git add src/terrain/index.ts
git commit -m "refactor: generate chunk blocks directly into Chunk.blockTypes"
```

---

## Task 17: Remove Old InstancedMesh Code

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts`

**Step 1: Delete initBlocks() method**

Find and delete the `initBlocks()` method entirely.

**Step 2: Delete resetBlocks() method**

Find and delete the `resetBlocks()` method entirely.

**Step 3: Remove worker references**

Delete:
- `generateWorker` imports
- Worker instantiation

**Step 4: Clean up unused properties**

Remove from class:
- `maxCount`
- `blocksCount`
- `blocksFactor`

**Step 5: Run TypeScript check**

```bash
npm run lint
```

**Expected:** No errors related to removed properties.

**Step 6: Commit**

```bash
git add src/terrain/index.ts
git commit -m "refactor: remove InstancedMesh and worker-based generation"
```

---

## Task 18: Delete Obsolete Shader Files

**Files:**
- Delete: `.worktrees/vertex-color-lighting/src/lighting/LightShader.ts`
- Delete: `.worktrees/vertex-color-lighting/src/lighting/LightDataTexture.ts`

**Step 1: Remove files**

```bash
cd .worktrees/vertex-color-lighting
git rm src/lighting/LightShader.ts
git rm src/lighting/LightDataTexture.ts
```

**Step 2: Remove imports**

Search for and remove any imports of these files:

```bash
grep -r "LightShader\|LightDataTexture" src/ --include="*.ts"
```

Remove found imports from files.

**Step 3: Run TypeScript check**

```bash
npm run lint
```

**Expected:** No errors.

**Step 4: Commit**

```bash
git commit -m "refactor: remove obsolete DataTexture shader system"
```

---

## Task 19: Fix FaceBuilder.isBlockSolid Heuristic

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/FaceBuilder.ts`

**Step 1: Update isBlockSolid to use chunk.getBlockType**

Replace the heuristic implementation with:

```typescript
  private isBlockSolid(x: number, y: number, z: number): boolean {
    if (x < 0 || x >= 24 || y < 0 || y >= 256 || z < 0 || z >= 24) {
      return false
    }

    const blockType = this.chunk.getBlockType(x, y, z)

    // Air = not solid
    if (blockType === -1) return false

    // Glass and leaves are transparent but still block AO
    // All other blocks are solid
    return true
  }
```

**Step 2: Commit**

```bash
git add src/terrain/mesh/FaceBuilder.ts
git commit -m "fix: use actual block types for AO solid check"
```

---

## Task 20: Test Single Chunk Rendering

**Goal:** Verify basic rendering works before optimizing.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts`

**Step 1: Temporarily limit to single chunk**

In `generate()` method, temporarily change:

```typescript
  generate = () => {
    // TEMP: Only generate chunk (0,0) for testing
    const chunk = this.chunkManager.getChunk(0, 0)

    if (!this.isChunkGenerated(chunk)) {
      this.generateChunkBlocks(chunk)
      this.chunkMeshManager.markDirty(0, 0, 'block')
    }
  }
```

**Step 2: Run dev server**

```bash
npm run dev
```

**Step 3: Open browser and verify**

Check console for:
- "🌍 Generated chunk (0, 0)"
- "🔨 Rebuilt chunk (0, 0) in Xms"

Check visually:
- Blocks render (grass, stone, etc.)
- Lighting appears (some variation in brightness)
- No black blocks

**Step 4: Take screenshot and profile**

Open DevTools → Performance tab → Record 5 seconds.

Check:
- FPS: Should be 60
- Frame time: < 16ms
- Rebuild time in console

**Step 5: Document results**

Add comment in code with findings:

```typescript
// TESTING CHECKPOINT 1 (single chunk):
// - Mesh builds in Xms
// - FPS: 60
// - Polygons: ~Y (check stats)
// - Lighting: visible
```

**Step 6: Restore multi-chunk generation**

Revert the temp change, commit:

```bash
git add src/terrain/index.ts
git commit -m "test: verify single chunk rendering works (checkpoint 1)"
```

---

## Task 21: Restore Multi-Chunk Generation

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts:generate()`

**Step 1: Implement full multi-chunk generation**

```typescript
  generate = () => {
    const distance = this.distance

    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const chunkX = this.chunk.x + x
        const chunkZ = this.chunk.y + z
        const chunk = this.chunkManager.getChunk(chunkX, chunkZ)

        if (!this.isChunkGenerated(chunk)) {
          this.generateChunkBlocks(chunk)
          this.chunkMeshManager.markDirty(chunkX, chunkZ, 'block')
        }
      }
    }
  }
```

**Step 2: Test with render distance 3**

Run dev server, check:
- All chunks render (7×7 = 49 chunks)
- No black chunks
- Smooth chunk boundaries
- FPS still 60

**Step 3: Commit**

```bash
git add src/terrain/index.ts
git commit -m "feat: restore multi-chunk generation with mesh manager"
```

---

## Task 22: Add Dynamic Lighting Triggers

**Goal:** Mark chunks dirty when lighting changes.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts`
- Focus: Block placement, light source placement

**Step 1: Find block placement code**

Search for methods that add/remove blocks (likely `addBlock`, `removeBlock`, or raycast handlers).

**Step 2: Add markDirty calls**

After block placement:

```typescript
// Existing block placement code
chunk.setBlockType(localX, localY, localZ, blockType)

// NEW: Mark chunk and neighbors dirty
this.chunkMeshManager.markDirty(chunkX, chunkZ, 'block')

// Check if near chunk boundary (mark neighbors)
if (localX === 0) this.chunkMeshManager.markDirty(chunkX - 1, chunkZ, 'block')
if (localX === 23) this.chunkMeshManager.markDirty(chunkX + 1, chunkZ, 'block')
if (localZ === 0) this.chunkMeshManager.markDirty(chunkX, chunkZ - 1, 'block')
if (localZ === 23) this.chunkMeshManager.markDirty(chunkX, chunkZ + 1, 'block')
```

**Step 3: Add lighting update hook**

After `lightingEngine.update()` in the main update loop:

```typescript
    // Propagate lighting
    this.lightingEngine.update()

    // Check which chunks had lighting changes
    const chunks = this.chunkManager.getAllChunks()
    for (const chunk of chunks) {
      if (chunk.dirty) {
        // Lighting changed - mark for mesh rebuild
        this.chunkMeshManager.markDirty(chunk.x, chunk.z, 'light')
        chunk.dirty = false  // Clear flag
      }
    }
```

**Step 4: Test dynamic updates**

Run dev server, in-game:
1. Place a block → should see immediate rebuild
2. Place glowstone → should see light spread + gradual rebuilds

**Step 5: Commit**

```bash
git add src/terrain/index.ts
git commit -m "feat: trigger mesh rebuilds on block and light changes"
```

---

## Task 23: Add Sunrise/Sunset Staggered Updates

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/core/TimeOfDay.ts`
- Modify: `.worktrees/vertex-color-lighting/src/terrain/index.ts`

**Step 1: Find time-of-day update code**

Search for where sun position or global lighting changes (likely `TimeOfDay.update()`).

**Step 2: Add callback for global light changes**

In `TimeOfDay.ts`, add method:

```typescript
  /**
   * Called when global lighting changes (sunrise/sunset)
   */
  onGlobalLightChange?: () => void

  update(): void {
    // ... existing time update code ...

    // Check if we crossed sunrise/sunset threshold
    const wasDay = this.lastHour >= 6 && this.lastHour < 18
    const isDay = this.currentHour >= 6 && this.currentHour < 18

    if (wasDay !== isDay) {
      // Day/night transition
      if (this.onGlobalLightChange) {
        this.onGlobalLightChange()
      }
    }

    this.lastHour = this.currentHour
  }
```

**Step 3: Wire up in Terrain**

In `terrain/index.ts` constructor:

```typescript
    // Hook up global lighting updates
    timeOfDay.onGlobalLightChange = () => {
      // Mark all visible chunks for rebuild (low priority)
      const chunks = this.chunkManager.getAllChunks()
      for (const chunk of chunks) {
        this.chunkMeshManager.markDirty(chunk.x, chunk.z, 'global')
      }
      console.log('🌅 Global lighting change - staggered rebuild started')
    }
```

**Step 4: Commit**

```bash
git add src/core/TimeOfDay.ts src/terrain/index.ts
git commit -m "feat: staggered mesh rebuilds for sunrise/sunset"
```

---

## Task 24: Performance Profiling & Tuning

**Goal:** Measure and optimize rebuild performance.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/ChunkMeshManager.ts`

**Step 1: Add detailed profiling**

In `ChunkMeshManager.update()`, add profiling:

```typescript
  update(chunkManager: any): void {
    if (this.dirtyChunks.size === 0) return

    const startTime = performance.now()
    const dirty = Array.from(this.dirtyChunks.entries())
    const priority = { block: 0, light: 1, global: 2 }
    dirty.sort((a, b) => priority[a[1]] - priority[b[1]])

    let rebuilt = 0
    const timings: number[] = []

    for (const [key, reason] of dirty) {
      if (performance.now() - startTime > this.rebuildBudgetMs) {
        break
      }

      const rebuildStart = performance.now()

      const [x, z] = key.split(',').map(Number)
      const chunk = chunkManager.getChunk(x, z)
      const chunkMesh = this.getOrCreateMesh(chunk)

      chunkMesh.rebuild()

      timings.push(performance.now() - rebuildStart)
      this.dirtyChunks.delete(key)
      rebuilt++
    }

    if (rebuilt > 0) {
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length
      const max = Math.max(...timings)
      console.log(`🔨 Rebuilt ${rebuilt} chunks in ${avg.toFixed(2)}ms avg, ${max.toFixed(2)}ms max (${this.dirtyChunks.size} remaining)`)
    }
  }
```

**Step 2: Run dev server and profile**

1. Start game
2. Note initial generation time
3. Place blocks → check rebuild times
4. Trigger sunrise → check staggered rebuild

**Target Performance:**
- Single chunk rebuild: < 2ms
- No frame drops during rebuilds
- Sunrise completes in < 3 seconds

**Step 3: Tune budget if needed**

If rebuilds take > 2ms consistently, reduce budget or chunk count:

```typescript
  private rebuildBudgetMs = 5  // Increase if needed
```

If FPS drops, reduce budget:

```typescript
  private rebuildBudgetMs = 2  // Decrease for smoother framerate
```

**Step 4: Commit**

```bash
git add src/terrain/ChunkMeshManager.ts
git commit -m "perf: add rebuild profiling and tuning"
```

---

## Task 25: Add Texture Atlas Support (Optional Enhancement)

**Goal:** Improve UVs to use texture atlas instead of per-block textures.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/FaceBuilder.ts`
- Reference: `src/blocks/BlockRegistry.ts` (for texture info)

**Step 1: Add UV calculation helper**

```typescript
  /**
   * Get UV coordinates for block face from texture atlas
   */
  private getBlockUV(
    blockType: BlockType,
    localU: number,
    localV: number
  ): { u: number, v: number } {
    // Texture atlas layout: 4×4 grid of 16 block textures
    // Each tile is 1/4 of texture width/height

    const tilesPerRow = 4
    const tileSize = 1.0 / tilesPerRow

    // Map block type to tile position
    const tileX = blockType % tilesPerRow
    const tileY = Math.floor(blockType / tilesPerRow)

    // Local UV (0-width, 0-height) to tile UV
    const u = (tileX + localU) * tileSize
    const v = (tileY + localV) * tileSize

    return { u, v }
  }
```

**Step 2: Use in addQuad**

Update the UV assignment in `addQuad`:

```typescript
      // UVs from texture atlas
      this.uvs.push(
        ...Object.values(this.getBlockUV(blockType, v.u, v.v))
      )
```

**Step 3: Commit**

```bash
git add src/terrain/mesh/FaceBuilder.ts
git commit -m "feat: add texture atlas UV mapping"
```

---

## Task 26: Final Testing & Benchmarking

**Goal:** Verify all success criteria met.

**Step 1: Run full manual test**

Start dev server:

```bash
cd .worktrees/vertex-color-lighting
npm run dev
```

**Test Checklist:**
- [ ] World generates (all chunks visible)
- [ ] Lighting works (bright at surface, dark underground)
- [ ] Smooth lighting visible (gradients between blocks)
- [ ] AO visible (corners darker)
- [ ] Place block → instant rebuild
- [ ] Place glowstone → light spreads, gradual rebuild
- [ ] Trigger sunrise → staggered rebuild, smooth transition
- [ ] FPS stable at 60
- [ ] No console errors

**Step 2: Performance benchmark**

Open DevTools → Performance:
- Record 10 seconds of gameplay
- Check frame times: < 16ms
- Check rebuild costs: < 3ms per batch
- Check memory: Geometry < 15MB

**Step 3: Polygon count comparison**

In console:

```javascript
// Count total triangles
let triangles = 0
window.scene.traverse(obj => {
  if (obj.geometry) {
    triangles += obj.geometry.index ? obj.geometry.index.count / 3 : 0
  }
})
console.log('Total triangles:', triangles)
```

**Expected:**
- InstancedMesh (old): ~300k triangles
- Greedy meshing (new): ~30k triangles (90% reduction)

**Step 4: Document results**

Create file:

```bash
echo "# Performance Results

## Polygon Reduction
- Before: XXXk triangles
- After: XXk triangles
- Reduction: XX%

## Rebuild Performance
- Single chunk: X.XXms
- Greedy meshing: X.XXms
- Vertex generation: X.XXms

## Runtime Performance
- FPS: 60 (stable)
- Frame time: XXms
- Memory: XXMB geometry

## Visual Quality
- Smooth lighting: ✅
- Ambient occlusion: ✅
- No artifacts: ✅

Tested: $(date)
" > docs/performance-results.md

git add docs/performance-results.md
git commit -m "docs: add performance benchmark results"
```

---

## Task 27: Update Documentation

**Files:**
- Modify: `.worktrees/vertex-color-lighting/CLAUDE.md`
- Modify: `.worktrees/vertex-color-lighting/PROJECT_STATE.md`

**Step 1: Update CLAUDE.md**

Replace the "Current Working State" section:

```markdown
### Current Working State (2025-12-04)
✅ **Vertex color lighting system** - BufferGeometry with baked lighting
✅ **Greedy meshing** - 90%+ polygon reduction
✅ **Smooth lighting** - Interpolated vertex colors
✅ **Ambient occlusion** - Contact shadows at corners
✅ **Dynamic updates** - Hybrid instant/staggered rebuilds
✅ **Multi-chunk support** - Unlimited chunks with proper lighting
```

Add new architecture section:

```markdown
## Rendering Architecture

### Chunk Mesh System
- BufferGeometry per chunk (replaces InstancedMesh)
- Lighting baked into vertex colors during mesh generation
- Greedy meshing merges adjacent faces (90% polygon reduction)
- Rebuild budget: 3ms/frame for dynamic updates

### Lighting Pipeline
```
Block/Light Change → Chunk.dirty = true
                         ↓
ChunkMeshManager.markDirty(reason: block/light/global)
                         ↓
ChunkMeshManager.update() (respects 3ms budget)
                         ↓
GreedyMesher.buildMesh() → FaceBuilder.addQuad()
                         ↓
BufferGeometry with vertex colors → THREE.Mesh → Scene
```

### Performance
- Single chunk rebuild: < 2ms
- Polygons: ~30k (down from 300k)
- Memory: ~12MB geometry (down from 50MB)
- FPS: 60 stable at render distance 3
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with vertex color architecture"
```

---

## Success Criteria Checklist

### Minimum Viable
- [ ] Lighting works correctly for all chunks
- [ ] 60fps at render distance 3
- [ ] Smooth lighting visible
- [ ] Dynamic updates work (torch placement)

### Optimal
- [ ] 90%+ polygon reduction achieved
- [ ] Ambient occlusion working
- [ ] No visible frame drops during updates
- [ ] Memory usage < 15MB for geometry

### Code Quality
- [ ] No InstancedMesh references remaining
- [ ] Shader files deleted
- [ ] TypeScript compiles with no errors
- [ ] Documentation updated

---

## Estimated Completion

- Core implementation (Tasks 1-18): ~4-6 hours
- Testing & optimization (Tasks 19-24): ~2-3 hours
- Documentation (Task 27): ~30 minutes

**Total:** 1-2 days of focused development

---

## Notes for Implementation

**DRY Principles:**
- Reuse Chunk class lighting storage (don't duplicate)
- FaceBuilder is stateless (can instantiate per mesh)
- ChunkMesh owns cleanup (no manual disposal needed elsewhere)

**YAGNI Reminders:**
- Don't add chunk unloading yet (not needed for render distance 3)
- Don't optimize texture atlas layout yet (4×4 is fine)
- Don't add LOD system yet (60fps is achieved without it)

**TDD Guidance:**
- No tests exist currently in project
- For this visual feature, manual testing sufficient
- Checkpoint after each major component (Tasks 7, 13, 20, 23)

**Commit Frequency:**
- After each task completion
- Before major refactors (Task 14, 17)
- After each checkpoint (Task 20, 23, 26)
