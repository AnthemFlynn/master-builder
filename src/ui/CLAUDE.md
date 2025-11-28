   1 # UI System - Context
   2 
   3 **File**: `src/ui/index.ts` (323 lines)
   4 **Purpose**: State machine for game modes and HUD management
   5 
   6 ---
   7 
   8 ## Critical: Event Listener Problem We Just Fixed
   9 
  10 ### The Bug
  11 The `Bag` class (inventory) was registering keyboard and mouse wheel listeners in its constructor:
  12 ```typescript
  13 // OLD (BROKEN):
  14 constructor() {
  15   document.body.addEventListener('keydown', ...) // Always active!
  16   document.body.addEventListener('wheel', ...)   // Always active!
  17 }
  18 ```
  19 
  20 This meant number keys 1-9 and mouse wheel were ALWAYS listening, even on splash screen.
  21 
  22 ### The Fix
  23 Added `enable()` and `disable()` methods:
  24 ```typescript
  25 // NEW (FIXED):
  26 class Bag {
  27   constructor() {
  28     // Define handlers but DON'T register
  29     this.keydownHandler = (e) => { /* handle 1-9 keys */ }
  30     this.wheelHandler = (e) => { /* handle wheel */ }
  31   }
  32   
  33   enable() {
  34     // Only called when entering play mode
  35     document.body.addEventListener('keydown', this.keydownHandler)
  36     document.body.addEventListener('wheel', this.wheelHandler)
  37   }
  38   
  39   disable() {
  40     // Called when leaving play mode
  41     document.body.removeEventListener('keydown', this.keydownHandler)
  42     document.body.removeEventListener('wheel', this.wheelHandler)
  43   }
  44 }
  45 ```
  46 
  47 ### Where It's Called
  48 ```typescript
  49 // src/ui/index.ts
  50 onPlay() {
  51   this.bag.enable()  // ✅ Activate controls
  52   // ... show HUD ...
  53 }
  54 
  55 onPause() {
  56   this.bag.disable()  // ✅ Deactivate controls
  57   // ... hide HUD ...
  58 }
  59 
  60 onExit() {
  61   this.bag.disable()  // ✅ Deactivate controls
  62   // ... back to splash ...
  63 }
  64 ```
  65 
  66 ---
  67 
  68 ## State Machine Architecture
  69 
  70 ### 4 States
  71 ```
  72 1. SPLASH - Initial state, only splash visible
  73 2. MENU - Menu overlay, no game controls
  74 3. PLAYING - Pointer locked, HUD visible, controls active
  75 4. PAUSE - Menu overlay over game, HUD hidden, controls inactive
  76 ```
  77 
  78 ### State Transitions
  79 
  80 **SPLASH → MENU:**
  81 ```typescript
  82 // Triggered by: any keydown or click
  83 handleSplashExit() {
  84   this.splash?.classList.add('hidden')
  85   this.menu?.classList.remove('hidden')
  86 }
  87 ```
  88 
  89 **MENU → PLAYING:**
  90 ```typescript
  91 // Triggered by: "Play" button click
  92 onPlay() {
  93   // Hide menu
  94   this.menu?.classList.add('hidden')
  95   this.splash?.classList.add('hidden')
  96   
  97   // Show HUD
  98   this.crossHair.classList.remove('hidden')
  99   this.fps.fps.classList.remove('hidden')
 100   this.bag.bag.classList.remove('hidden')
 101   
 102   // Enable controls ✅
 103   this.bag.enable()
 104   
 105   // Update button text
 106   this.play.innerHTML = 'Resume'
 107 }
 108 ```
 109 
 110 **PLAYING → PAUSE:**
 111 ```typescript
 112 // Triggered by: E key or pointer unlock
 113 onPause() {
 114   // Show menu
 115   this.menu?.classList.remove('hidden')
 116   
 117   // Hide HUD
 118   this.crossHair.classList.add('hidden')
 119   this.fps.fps.classList.add('hidden')
 120   this.bag.bag.classList.add('hidden')
 121   
 122   // Disable controls ✅
 123   this.bag.disable()
 124   
 125   // Update button text
 126   this.save.innerHTML = 'Save and Exit'
 127 }
 128 ```
 129 
 130 **MENU/PAUSE → SPLASH:**
 131 ```typescript
 132 // Triggered by: "Exit" button click
 133 onExit() {
 134   // Hide menu, show splash
 135   this.menu?.classList.add('hidden')
 136   this.splash?.classList.remove('hidden')
 137   
 138   // Hide all HUD
 139   this.crossHair.classList.add('hidden')
 140   this.fps.fps.classList.add('hidden')
 141   this.bag.bag.classList.add('hidden')
 142   
 143   // Disable controls ✅
 144   this.bag.disable()
 145   
 146   // Reset button text
 147   this.play.innerHTML = 'Play'
 148   this.save.innerHTML = 'Load Game'
 149   
 150   // Re-register splash exit listener
 151   document.addEventListener('keydown', handleSplashExit, { once: true })
 152   document.addEventListener('click', handleSplashExit, { once: true })
 153 }
 154 ```
 155 
 156 ---
 157 
 158 ## HUD Components
 159 
 160 ### FPS Counter (`src/ui/fps/index.ts`)
 161 ```typescript
 162 class FPS {
 163   fps = document.createElement('div')  // The DOM element
 164   
 165   update() {
 166     // Called every frame
 167     // Updates display every 1000ms
 168   }
 169 }
 170 ```
 171 
 172 **Visibility Control:**
 173 - Initially hidden: `this.fps.fps.classList.add('hidden')`
 174 - Show on play: `this.fps.fps.classList.remove('hidden')`
 175 - Hide on pause: `this.fps.fps.classList.add('hidden')`
 176 
 177 ### Inventory Bag (`src/ui/bag/index.ts`)
 178 ```typescript
 179 class Bag {
 180   bag = document.createElement('div')  // Container
 181   items = Array(10)  // 10 slots
 182   current = 0  // Currently selected slot
 183   
 184   enable()  // ✅ Activate controls
 185   disable() // ✅ Deactivate controls
 186 }
 187 ```
 188 
 189 **Block Types (in order):**
 190 1. Grass
 191 2. Stone
 192 3. Tree
 193 4. Wood
 194 5. Diamond
 195 6. Quartz
 196 7. Glass
 197 8-10. Empty slots
 198 
 199 **Controls (only when enabled):**
 200 - Number keys 1-9: Direct selection
 201 - Mouse wheel: Cycle through
 202 - Visual feedback: `.selected` class (green border + glow)
 203 
 204 ### Crosshair
 205 ```typescript
 206 // Created in UI constructor
 207 this.crossHair = document.createElement('div')
 208 this.crossHair.className = 'cross-hair hidden'  // Initially hidden
 209 this.crossHair.innerHTML = '+'
 210 document.body.appendChild(this.crossHair)
 211 ```
 212 
 213 ---
 214 
 215 ## Pointer Lock Integration
 216 
 217 ### Automatic State Changes
 218 ```typescript
 219 // Registered in UI constructor
 220 document.addEventListener('pointerlockchange', () => {
 221   if (document.pointerLockElement) {
 222     onPlay()   // Pointer locked → Playing state
 223   } else {
 224     onPause()  // Pointer unlocked → Pause state
 225   }
 226 })
 227 ```
 228 
 229 **Important:**
 230 - This is SEPARATE from the button click handlers
 231 - Clicking "Play" → locks pointer → triggers pointerlockchange → calls onPlay()
 232 - Pressing E → unlocks pointer → triggers pointerlockchange → calls onPause()
 233 
 234 ---
 235 
 236 ## DOM Element References
 237 
 238 ```typescript
 239 // Screens
 240 splash = document.querySelector('#splash')
 241 menu = document.querySelector('#menu')
 242 features = document.querySelector('.features')  // Controls guide
 243 settings = document.querySelector('.settings')
 244 
 245 // Buttons
 246 play = document.querySelector('#play')
 247 save = document.querySelector('#save')
 248 setting = document.querySelector('#setting')
 249 feature = document.querySelector('#feature')
 250 back = document.querySelector('#back')
 251 exit = document.querySelector('#exit')
 252 
 253 // Modals
 254 saveModal = document.querySelector('.save-modal')
 255 loadModal = document.querySelector('.load-modal')
 256 
 257 // Settings inputs
 258 distanceInput = document.querySelector('#distance-input')
 259 fovInput = document.querySelector('#fov-input')
 260 musicInput = document.querySelector('#music-input')
 261 
 262 // HUD (created dynamically)
 263 crossHair = document.createElement('div')
 264 fps.fps = document.createElement('div')
 265 bag.bag = document.createElement('div')
 266 ```
 267 
 268 ---
 269 
 270 ## CSS Classes Used
 271 
 272 ### Visibility
 273 - `.hidden` - display: none !important
 274 - `.show` - opacity: 1 !important (for modals)
 275 
 276 ### Bag Selection
 277 - `.selected` - Green border + glow effect
 278 
 279 ### Z-Index Hierarchy
 280 - Splash: 10000 (top)
 281 - Modals: 300
 282 - Settings/Features: 200
 283 - Menu: 100
 284 - HUD (crosshair, FPS, bag): 1000
 285 
 286 ---
 287 
 288 ## Save/Load System
 289 
 290 ### Save Game
 291 ```typescript
 292 // Triggered by: "Save and Exit" button
 293 localStorage.setItem('block', JSON.stringify(terrain.customBlocks))
 294 localStorage.setItem('seed', JSON.stringify(terrain.noise.seed))
 295 localStorage.setItem('position', JSON.stringify({x, y, z}))
 296 
 297 // Show success modal
 298 this.saveModal?.classList.remove('hidden')
 299 setTimeout(() => this.saveModal?.classList.add('show'))
 300 // ... fade out after 1s ...
 301 
 302 // Return to splash
 303 onExit()
 304 ```
 305 
 306 ### Load Game
 307 ```typescript
 308 // Triggered by: "Load Game" button
 309 const seed = Number(localStorage.getItem('seed'))
 310 const blocks = JSON.parse(localStorage.getItem('block'))
 311 const pos = JSON.parse(localStorage.getItem('position'))
 312 
 313 terrain.noise.seed = seed
 314 terrain.customBlocks = blocks
 315 terrain.initBlocks()
 316 terrain.generate()
 317 terrain.camera.position.set(pos.x, pos.y, pos.z)
 318 
 319 // Show success modal
 320 this.loadModal?.classList.remove('hidden')
 321 // ... same fade pattern ...
 322 
 323 // Start playing
 324 onPlay()
 325 control.control.lock()
 326 ```
 327 
 328 ---
 329 
 330 ## Common Issues
 331 
 332 ### "HUD visible on splash screen"
 333 - Check initial `classList.add('hidden')` in constructor
 334 - Verify z-index of splash screen (should be 10000)
 335 - Check if `onExit()` is hiding all HUD elements
 336 
 337 ### "Controls working when they shouldn't"
 338 - Check if `bag.enable()` is being called
 339 - Verify pointer lock state
 340 - Check event listener registration
 341 
 342 ### "Can't return to splash screen"
 343 - Check if splash exit listener is re-registered in `onExit()`
 344 - Verify splash element has `.hidden` removed
 345 
 346 ---
 347 
 348 **Last Updated**: 2025-11-28
