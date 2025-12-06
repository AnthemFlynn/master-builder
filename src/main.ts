import Core from './core'
import Control from './control'
import Player from './player'
// import Terrain from './terrain'  // REMOVED: Using hexagonal architecture only
import { TerrainOrchestrator } from './modules/terrain/application/TerrainOrchestrator'
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
const terrain = new TerrainOrchestrator(scene, camera)

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
  console.log('🔍 DEBUG: About to assign window.terrain, terrain type:', typeof terrain)
  console.log('🔍 DEBUG: terrain object:', terrain)
  console.log('🔍 DEBUG: terrain.enableEventTracing type:', typeof terrain?.enableEventTracing)

  try {
    (window as any).terrain = terrain
    console.log('🔍 DEBUG: window.terrain assigned successfully')

    try {
      (window as any).debug = {
        enableTracing: () => terrain.enableEventTracing(),
        replayCommands: (from: number) => terrain.replayCommands(from),
        getCommandLog: () => terrain.getCommandLog()
      }
      console.log('🔍 DEBUG: window.debug assigned successfully')
    } catch (debugError) {
      console.error('❌ ERROR creating window.debug:', debugError)
      // Create simpler version
      (window as any).debug = { error: 'Failed to create debug helpers' }
    }

    console.log('✅ Hexagonal architecture active (old system removed)')
    console.log('🐛 Debug: window.debug available')
  } catch (e) {
    console.error('❌ ERROR during window.terrain assignment:', e)
  }
}

const control = new Control(scene, camera, player, terrainStub as any, audio, timeOfDay, inputManager)

const ui = new UI(terrainStub as any, control, timeOfDay, inputManager)

// animation
;(function animate() {
  // let p1 = performance.now()
  requestAnimationFrame(animate)

  control.update()
  terrain.update()  // NEW: Hexagonal architecture
  ui.update()
  timeOfDay.update()
  // Old lightingEngine removed - now event-driven

  renderer.render(scene, camera)
  // console.log(performance.now()-p1)
})()
