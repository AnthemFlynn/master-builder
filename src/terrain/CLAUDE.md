   1 # Terrain System - Context
   2 
   3 **File**: `src/terrain/index.ts`
   4 **Purpose**: Procedural world generation using Perlin noise and chunk-based rendering
   5 
   6 ---
   7 
   8 ## Core Concepts
   9 
  10 ### Chunk-Based Generation
  11 - Terrain generated in chunks around player
  12 - Chunk size: Configurable (default in code)
  13 - Render distance: 1-8 chunks (user configurable)
  14 - Dynamic loading/unloading based on player position
  15 
  16 ### Perlin Noise
  17 Uses Three.js `ImprovedNoise` for procedural generation:
  18 ```
  19 Height = noise.get(x/gap, z/gap, seed) * amp + baseHeight
  20 ```
  21 
  22 **Noise Parameters:**
  23 - `gap`: Controls frequency (larger = smoother terrain)
  24 - `amp`: Controls amplitude (height variation)
  25 - `seed`: Random seed for reproducibility
  26 
  27 ---
  28 
  29 ## Block Types
  30 
  31 ### Material Types (12 total)
  32 Defined in `src/terrain/mesh/materials.ts`:
  33 1. Grass
  34 2. Stone
  35 3. Tree (log)
  36 4. Leaf
  37 5. Coal
  38 6. Wood (planks)
  39 7. Diamond
  40 8. Quartz
  41 9. Glass
  42 10. Bedrock
  43 11. Sand
  44 12. Cloud
  45 
  46 ### Block Generation Logic
  47 
  48 **Base Terrain** (y=30 + noise):
  49 - Grass on top
  50 - Stone underneath
  51 - Bedrock at bottom (y=0)
  52 
  53 **Trees** (when conditions met):
  54 ```typescript
  55 if (treeNoise > threshold && y >= 27 && stoneNoise < stoneThreshold) {
  56   // Generate tree trunk (height = treeHeight)
  57   for (let i = 1; i <= treeHeight; i++) {
  58     placeBlock(x, y + i, z, BlockType.tree)
  59   }
  60 }
  61 ```
  62 
  63 **Leaves** (around tree tops):
  64 ```typescript
  65 if (leafNoise > leafThreshold && nearTree) {
  66   placeBlock(x, y, z, BlockType.leaf)
  67 }
  68 ```
  69 
  70 **Ores** (underground):
  71 - Coal: Random pockets based on coalNoise
  72 - Diamond: Rare, deep underground
  73 
  74 ---
  75 
  76 ## InstancedMesh System
  77 
  78 ### Why InstancedMesh?
  79 - Renders 10,000+ blocks efficiently
  80 - Single draw call per block type
  81 - Matrix-based positioning (no individual meshes)
  82 
  83 ### Block Array Structure
  84 ```typescript
  85 blocks = {
  86   [BlockType.grass]: InstancedMesh,
  87   [BlockType.stone]: InstancedMesh,
  88   [BlockType.tree]: InstancedMesh,
  89   // ... etc
  90 }
  91 ```
  92 
  93 ### Matrix Management
  94 ```typescript
  95 // Place block
  96 const matrix = new THREE.Matrix4()
  97 matrix.setPosition(x, y, z)
  98 blocks[type].setMatrixAt(instanceId, matrix)
  99 blocks[type].instanceMatrix.needsUpdate = true
 100 
 101 // Remove block (set to zero matrix)
 102 blocks[type].setMatrixAt(instanceId, new THREE.Matrix4().set(0,0,0,0,...))
 103 ```
 104 
 105 ---
 106 
 107 ## Custom Blocks System
 108 
 109 ### What Are Custom Blocks?
 110 Player-placed or player-removed blocks that differ from procedural generation.
 111 
 112 ```typescript
 113 class Block {
 114   x: number
 115   y: number
 116   z: number
 117   type: BlockType
 118   placed: boolean  // true = placed by player, false = removed by player
 119 }
 120 ```
 121 
 122 ### customBlocks Array
 123 ```typescript
 124 terrain.customBlocks = [
 125   { x: 5, y: 32, z: 10, type: BlockType.diamond, placed: true },
 126   { x: 8, y: 30, z: 15, type: BlockType.grass, placed: false },
 127   // ...
 128 ]
 129 ```
 130 
 131 **Persistence:**
 132 - Saved to localStorage on "Save and Exit"
 133 - Loaded from localStorage on "Load Game"
 134 - Merged with procedural generation on world load
 135 
 136 ---
 137 
 138 ## Noise Configuration
 139 
 140 ### Terrain Noise
 141 ```typescript
 142 noise.seed = Math.random()  // World seed
 143 noise.gap = 22              // Frequency
 144 noise.amp = 8               // Height variation
 145 ```
 146 
 147 ### Stone Noise (underground)
 148 ```typescript
 149 noise.stoneSeed = seed * 0.4
 150 noise.stoneGap = 12
 151 noise.stoneAmp = 8
 152 noise.stoneThreshold = 3.5  // How much stone vs dirt
 153 ```
 154 
 155 ### Tree Noise
 156 ```typescript
 157 noise.treeSeed = seed * 0.7
 158 noise.treeGap = 2
 159 noise.treeAmp = 6
 160 noise.treeHeight = 10       // Tree trunk height
 161 noise.treeThreshold = 4     // How common trees are
 162 ```
 163 
 164 ### Leaf Noise
 165 ```typescript
 166 noise.leafSeed = seed * 0.8
 167 noise.leafGap = 2
 168 noise.leafAmp = 5
 169 noise.leafThreshold = -0.03  // How dense foliage is
 170 ```
 171 
 172 ### Coal Noise
 173 ```typescript
 174 noise.coalSeed = seed * 0.5
 175 noise.coalGap = 3
 176 noise.coalAmp = 8
 177 noise.coalThreshold = 3      // How common coal is
 178 ```
 179 
 180 ---
 181 
 182 ## Generation Flow
 183 
 184 ### Initial Generation
 185 ```typescript
 186 1. initBlocks() - Create InstancedMesh for each block type
 187 2. generate() - Generate initial chunks around spawn point
 188 3. For each chunk:
 189    - Calculate noise values
 190    - Place base terrain blocks
 191    - Add trees where conditions met
 192    - Add leaves around trees
 193    - Add ores underground
 194    - Apply customBlocks (player modifications)
 195 ```
 196 
 197 ### Runtime Updates
 198 ```typescript
 199 terrain.update() called every frame:
 200   - Check player position
 201   - If player moved to new chunk:
 202     - Generate new chunks in render distance
 203     - Remove far chunks (optimization)
 204 ```
 205 
 206 ---
 207 
 208 ## Web Worker Integration
 209 
 210 ### Generate Worker (`src/terrain/worker/generate.ts`)
 211 - Runs terrain generation off main thread
 212 - Prevents frame drops during chunk creation
 213 - Sends block positions back to main thread
 214 - Main thread creates InstancedMesh matrices
 215 
 216 **Message Format:**
 217 ```typescript
 218 {
 219   blocks: Block[],       // All blocks to generate
 220   seed: number,          // World seed
 221   noiseParams: {...},    // Noise configuration
 222 }
 223 ```
 224 
 225 ---
 226 
 227 ## Performance Optimizations
 228 
 229 ### Current Optimizations
 230 1. **InstancedMesh** - Single draw call per block type
 231 2. **Web Worker** - Generation doesn't block rendering
 232 3. **Chunk-based** - Only generate/render visible chunks
 233 4. **Matrix reuse** - Update matrices instead of creating new meshes
 234 
 235 ### Potential Optimizations
 236 1. **LOD (Level of Detail)** - Lower detail for distant chunks
 237 2. **Spatial Partitioning** - Octree for faster queries
 238 3. **Frustum Culling** - Don't render chunks outside view
 239 4. **Greedy Meshing** - Combine adjacent blocks into single mesh
 240 5. **Texture Atlas** - Single texture for all block types
 241 
 242 ---
 243 
 244 ## Block Interaction Flow
 245 
 246 ### Building (Adding Block)
 247 ```typescript
 248 1. Control.mousedownHandler (right click)
 249 2. Raycast to find hit block and face
 250 3. Calculate new position (hit + normal)
 251 4. Call terrain.blocks[type].setMatrixAt(instanceId, matrix)
 252 5. Add to terrain.customBlocks array
 253 6. Mark instanceMatrix.needsUpdate = true
 254 ```
 255 
 256 ### Destroying (Removing Block)
 257 ```typescript
 258 1. Control.mousedownHandler (left click)
 259 2. Raycast to find hit block
 260 3. Call terrain.blocks[type].setMatrixAt(instanceId, zeroMatrix)
 261 4. Add to terrain.customBlocks with placed=false
 262 5. Call terrain.generateAdjacentBlocks(position)
 263 6. Mark instanceMatrix.needsUpdate = true
 264 ```
 265 
 266 ### Adjacent Block Generation
 267 ```typescript
 268 generateAdjacentBlocks(position) {
 269   // When a block is removed, check 6 neighboring positions
 270   // If they should have blocks (according to noise), generate them
 271   // This reveals blocks that were hidden behind the removed block
 272 }
 273 ```
 274 
 275 ---
 276 
 277 ## Fog System
 278 
 279 ```typescript
 280 scene.fog = new THREE.Fog(
 281   0x87ceeb,                    // Sky blue color
 282   1,                           // Start distance
 283   terrain.distance * 24 + 24   // End distance (based on render distance)
 284 )
 285 ```
 286 
 287 **Purpose:**
 288 - Hides far terrain pop-in
 289 - Improves performance (less rendering needed)
 290 - Creates atmospheric depth
 291 
 292 ---
 293 
 294 ## Common Issues
 295 
 296 ### "Terrain not generating"
 297 - Check web worker is running (dev tools)
 298 - Verify noise parameters are set
 299 - Check render distance > 0
 300 - Look for errors in generate() function
 301 
 302 ### "Blocks appearing/disappearing"
 303 - Check chunk boundaries
 304 - Verify customBlocks array not corrupted
 305 - Check maxCount setting (may be too low)
 306 
 307 ### "Poor performance"
 308 - Reduce render distance
 309 - Check instanceMatrix update frequency
 310 - Profile draw calls (should be ~12 per frame, one per block type)
 311 - Check chunk count (may be generating too many)
 312 
 313 ---
 314 
 315 **Last Updated**: 2025-11-28
