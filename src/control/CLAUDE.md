   1 # Control System - Context
   2 
   3 **File**: `src/control/index.ts` (1178 lines)
   4 **Purpose**: Manages all input, physics, collision detection, and block interactions
   5 
   6 ---
   7 
   8 ## Critical Implementation Details
   9 
  10 ### Event Listener Architecture
  11 
  12 **Pointer Lock Pattern:**
  13 ```typescript
  14 document.addEventListener('pointerlockchange', () => {
  15   if (document.pointerLockElement) {
  16     // REGISTER all game controls
  17     document.body.addEventListener('keydown', setMovementHandler)
  18     document.body.addEventListener('keyup', resetMovementHandler)
  19     document.body.addEventListener('mousedown', mousedownHandler)
  20     document.body.addEventListener('mouseup', mouseupHandler)
  21     document.body.addEventListener('mousemove', mouseMoveHandler)
  22     document.body.addEventListener('keydown', changeHoldingBlockHandler)
  23   } else {
  24     // REMOVE all game controls
  25     // (all removeEventListener calls)
  26   }
  27 })
  28 ```
  29 
  30 **Why This Matters:**
  31 - Controls ONLY active when pointer is locked (playing)
  32 - Prevents input during splash/menu states
  33 - Clean listener management prevents memory leaks
  34 
  35 ### Mouse Look Implementation
  36 
  37 **Custom Mouse Handler** (lines 481-501):
  38 ```typescript
  39 mouseMoveHandler = (e: MouseEvent) => {
  40   if (!document.pointerLockElement) return
  41   
  42   const movementX = e.movementX || 0
  43   const movementY = e.movementY || 0
  44   const sensitivity = 0.002
  45   
  46   this.euler.setFromQuaternion(this.camera.quaternion)
  47   this.euler.y -= movementX * sensitivity
  48   this.euler.x -= movementY * sensitivity
  49   
  50   // Limit pitch to prevent flipping
  51   this.euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.euler.x))
  52   
  53   this.camera.quaternion.setFromEuler(this.euler)
  54 }
  55 ```
  56 
  57 **Key Points:**
  58 - Uses Euler angles for rotation (not PointerLockControls default)
  59 - Sensitivity of 0.002 radians per pixel
  60 - Pitch clamped to ±90° to prevent camera flipping
  61 - Yaw is unlimited (full 360° rotation)
  62 
  63 ### Collision Detection
  64 
  65 **6-Direction Raycasting:**
  66 - Front (positive X)
  67 - Back (negative X)
  68 - Left (negative Z)
  69 - Right (positive Z)
  70 - Down (negative Y) - for ground detection
  71 - Up (positive Y) - for ceiling detection
  72 
  73 **Collision Flow:**
  74 ```
  75 collideCheckAll()
  76   ↓
  77 For each direction:
  78   1. Create simulation mesh with nearby blocks
  79   2. Raycast from player position
  80   3. Check intersection
  81   4. Set collision flag (frontCollide, backCollide, etc.)
  82   ↓
  83 Movement handler uses flags to allow/prevent movement
  84 ```
  85 
  86 ### Physics System
  87 
  88 **Gravity:**
  89 - Constant: 25 units/second²
  90 - Terminal velocity: controlled by `player.falling` property
  91 - Only applied when not in flying mode
  92 
  93 **Jumping:**
  94 ```
  95 Initial velocity: 8 units/second upward
  96 Duration: ~300ms before gravity takes over
  97 Double-jump: Not allowed
  98 ```
  99 
 100 **Flying Mode:**
 101 - Toggle with Q key
 102 - No gravity
 103 - Free movement in all directions
 104 - Speed controlled by player.speed
 105 
 106 ### Block Interaction
 107 
 108 **Building (Right Click):**
 109 1. Raycast from camera center
 110 2. Get hit block and face normal
 111 3. Calculate new block position (hit + normal)
 112 4. Check if position conflicts with player
 113 5. Place block using `holdingBlock` type
 114 6. Update InstancedMesh matrix
 115 7. Add to customBlocks array
 116 8. Play sound effect
 117 
 118 **Destroying (Left Click):**
 119 1. Raycast from camera center
 120 2. Get hit block
 121 3. Check if bedrock (can't destroy)
 122 4. Set matrix to zero matrix (effectively removes)
 123 5. Animate block shrinking
 124 6. Update customBlocks array (mark as removed)
 125 7. Play sound effect
 126 8. Generate adjacent blocks (reveal hidden blocks)
 127 
 128 **Hold to Build/Destroy:**
 129 - setInterval at 333ms (3 actions/second)
 130 - Triggered on mousedown
 131 - Cleared on mouseup
 132 
 133 ### Movement System
 134 
 135 **Key Bindings:**
 136 - W/S: Forward/Backward (velocity.x)
 137 - A/D: Strafe Left/Right (velocity.z)
 138 - Space: Jump (walking) / Fly Up (flying)
 139 - Shift: Sneak (walking) / Fly Down (flying)
 140 - Q: Toggle flying mode
 141 
 142 **Velocity Application:**
 143 ```
 144 Walking mode:
 145   - Use PointerLockControls.moveForward/moveRight
 146   - Apply gravity
 147   - Check collisions
 148   - Prevent movement if colliding
 149   
 150 Flying mode:
 151   - Direct position manipulation
 152   - No gravity
 153   - No collision (debug mode)
 154 ```
 155 
 156 ---
 157 
 158 ## Common Issues
 159 
 160 ### "Mouse not rotating camera"
 161 - Check if `mouseMoveHandler` is registered (pointer lock active?)
 162 - Verify `euler` property is initialized
 163 - Check sensitivity value (should be 0.002)
 164 
 165 ### "Player falling through floor"
 166 - Check downCollide raycaster
 167 - Verify terrain has collision meshes
 168 - Check far distance on raycaster
 169 
 170 ### "Can't destroy blocks"
 171 - Check if clicking on bedrock (can't destroy)
 172 - Verify raycaster.far is set (should be 8)
 173 - Check if pointer is locked
 174 
 175 ---
 176 
 177 ## Dependencies
 178 
 179 **Three.js Objects:**
 180 - PointerLockControls (from `three/addons/controls/PointerLockControls`)
 181 - Raycaster (for collision and block interaction)
 182 - Vector3, Matrix4, Euler (for math)
 183 
 184 **External Classes:**
 185 - Player (mode, speed, body dimensions)
 186 - Terrain (blocks, customBlocks, materials)
 187 - Audio (sound effects)
 188 
 189 ---
 190 
 191 ## Performance Considerations
 192 
 193 **Collision Checks:**
 194 - 6 raycasts per frame (one for each direction)
 195 - Temporary InstancedMesh created per check
 196 - Could be optimized with spatial partitioning
 197 
 198 **Block Interaction:**
 199 - Single raycast per click (not per frame)
 200 - InstancedMesh matrix updates are fast
 201 - Sound effects loaded once, played multiple times
 202 
 203 **Event Listeners:**
 204 - Properly added/removed to prevent leaks
 205 - No listeners active when not needed (splash/menu)
 206 
 207 ---
 208 
 209 **Last Updated**: 2025-11-28
