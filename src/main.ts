import Core from './core'
import Control from './control'
import Player from './player'
// import Terrain from './terrain'  // REMOVED: Using hexagonal architecture only
import { GameOrchestrator } from './modules/game'
import UI from './ui'
import Audio from './audio'
import InputManager from './input/InputManager'
import { DEFAULT_ACTIONS } from './input/defaultBindings'
import Noise from './game/Noise'

import './style.css'

// Initialize BlockRegistry
import { initializeBlockRegistry } from './blocks'
initializeBlockRegistry()

// Initialize InputManager
const inputManager = new InputManager()
inputManager.registerActions(DEFAULT_ACTIONS)
inputManager.loadBindings() // Load custom bindings from localStorage
console.log('🎮 InputManager initialized with', inputManager.getAllActions().length, 'actions')

const core = new Core()
const camera = core.camera
const scene = core.scene
const renderer = core.renderer
const timeOfDay = core.timeOfDay

const player = new Player()
const audio = new Audio(camera)

// NEW HEXAGONAL ARCHITECTURE ONLY
const game = new GameOrchestrator(scene, camera)

// Create stub for Control/UI compatibility (temporary until they're migrated)
const terrainStub = {
  blocks: [],
  materials: new Map(),
  customBlocks: [],
  noise: new Noise(),  // FIX: Use actual Noise instance with get() method
  lightingEngine: { update: () => {} },
  chunkManager: {
    worldToChunk: () => ({ chunkX: 0, chunkZ: 0, localX: 0, localY: 0, localZ: 0 }),
    getLightAt: () => ({ sky: { r: 15, g: 15, b: 15 }, block: { r: 0, g: 0, b: 0 } }),
    getAllChunks: () => [],
    getTotalMemoryUsage: () => 0
  },
  camera: camera,
  scene: scene,
  distance: 3,
  chunkSize: 24,
  initBlocks: () => { console.log('⚠️ terrainStub.initBlocks() called - noop') },
  generate: () => { console.log('⚠️ terrainStub.generate() called - noop') },
  generateAdjacentBlocks: () => {},
  getCount: () => 0,
  setCount: () => {},
  materialType: [],
  update: () => {}  // Add update method
}

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).game = game
  (window as any).debug = {
    enableTracing: () => game.enableEventTracing(),
    replayCommands: (from: number) => game.replayCommands(from),
    getCommandLog: () => game.getCommandLog()
  }

  console.log('✅ Hexagonal architecture active')
  console.log('🐛 Debug: window.debug.enableTracing()')
}

const control = new Control(scene, camera, player, terrainStub as any, audio, timeOfDay, inputManager)

const ui = new UI(terrainStub as any, control, timeOfDay, inputManager)

// DEBUG: Expose for browser console debugging
;(window as any).scene = scene
;(window as any).terrain = terrain
;(window as any).camera = camera

// animation
;(function animate() {
  // let p1 = performance.now()
  requestAnimationFrame(animate)

  control.update()
  game.update()  // NEW: GameOrchestrator
  ui.update()
  timeOfDay.update()
  // Old lightingEngine removed - now event-driven

  renderer.render(scene, camera)
  // console.log(performance.now()-p1)
})()
