import Core from './core'
import Control from './control'
import Player from './player'
// import Terrain from './terrain'  // REMOVED: Using hexagonal architecture only
import { TerrainOrchestrator } from './modules/terrain/application/TerrainOrchestrator'
import UI from './ui'
import Audio from './audio'
import InputManager from './input/InputManager'
import { DEFAULT_ACTIONS } from './input/defaultBindings'

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
  blocks: {},
  materials: new Map(),
  customBlocks: [],
  noise: { seed: 0, stoneSeed: 0, treeSeed: 0, coalSeed: 0, leafSeed: 0, treeHeight: 10 },
  lightingEngine: { update: () => {} },
  camera: camera,
  initBlocks: () => {},
  generate: () => {},
  generateAdjacentBlocks: () => {},
  getCount: () => 0,
  setCount: () => {},
  materialType: []
}

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).terrain = terrain
  (window as any).debug = {
    enableTracing: () => terrain.enableEventTracing(),
    replayCommands: (from: number) => terrain.replayCommands(from),
    getCommandLog: () => terrain.getCommandLog()
  }

  console.log('✅ Hexagonal architecture active (old system removed)')
  console.log('🐛 Debug: window.debug.enableTracing()')
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
