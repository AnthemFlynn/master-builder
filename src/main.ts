import Core from './core'
import Control from './control'
import Player from './player'
import Terrain from './terrain'
import UI from './ui'
import Audio from './audio'

import './style.css'

const core = new Core()
const camera = core.camera
const scene = core.scene
const renderer = core.renderer
const timeOfDay = core.timeOfDay

const player = new Player()
const audio = new Audio(camera)

const terrain = new Terrain(scene, camera)
const control = new Control(scene, camera, player, terrain, audio, timeOfDay)

const ui = new UI(terrain, control, timeOfDay)

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
