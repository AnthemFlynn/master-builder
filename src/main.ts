import Core from './core'
import Control from './control'
import Player from './player'
import Terrain from './terrain'
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

const terrain = new Terrain(scene, camera)
const control = new Control(scene, camera, player, terrain, audio, timeOfDay, inputManager)

const ui = new UI(terrain, control, timeOfDay, inputManager)

// animation
;(function animate() {
  // let p1 = performance.now()
  requestAnimationFrame(animate)

  control.update()
  terrain.update()
  ui.update()
  timeOfDay.update()

  renderer.render(scene, camera)
  // console.log(performance.now()-p1)
})()
