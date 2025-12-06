import Core from './core'
import Control from './control'
import Player from './player'
import Terrain from './terrain'  // Keep for Control/UI compatibility (strangler pattern)
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

// STRANGLER PATTERN: Run both systems in parallel
// Old Terrain for Control/UI compatibility
const terrain = new Terrain(scene, camera)

// New hexagonal architecture (runs alongside)
const terrainOrchestrator = new TerrainOrchestrator(scene, camera)

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).terrain = terrain  // Old API for compatibility
  (window as any).terrainOrchestrator = terrainOrchestrator
  (window as any).debug = {
    enableTracing: () => terrainOrchestrator.enableEventTracing(),
    replayCommands: (from: number) => terrainOrchestrator.replayCommands(from),
    getCommandLog: () => terrainOrchestrator.getCommandLog()
  }

  console.log('🐛 Debug helpers available: window.debug.enableTracing()')
  console.log('⚠️ STRANGLER PATTERN: Both terrain systems running (old + new hexagonal)')
}

const control = new Control(scene, camera, player, terrain, audio, timeOfDay, inputManager)

const ui = new UI(terrain, control, timeOfDay, inputManager)

// animation
;(function animate() {
  // let p1 = performance.now()
  requestAnimationFrame(animate)

  control.update()
  terrain.update()  // OLD: Keep for now (strangler pattern)
  terrainOrchestrator.update()  // NEW: Hexagonal architecture
  ui.update()
  timeOfDay.update()
  terrain.lightingEngine.update()  // OLD: Keep for now

  renderer.render(scene, camera)
  // console.log(performance.now()-p1)
})()
