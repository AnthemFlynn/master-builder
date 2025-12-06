import './style.css'
import Core from './core'
import { GameOrchestrator } from './modules/game'

// Initialize BlockRegistry
import { initializeBlockRegistry } from './blocks'
initializeBlockRegistry()

// Initialize Three.js core
const core = new Core()
const camera = core.camera
const scene = core.scene
const renderer = core.renderer
const timeOfDay = core.timeOfDay

// Initialize game (all modules)
const game = new GameOrchestrator(scene, camera)

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).game = game
  (window as any).debug = {
    enableTracing: () => game.enableEventTracing(),
    replayCommands: (from: number) => game.replayCommands(from),
    getCommandLog: () => game.getCommandLog()
  }

  console.log('✅ Hexagonal architecture active - 9 modules loaded')
  console.log('🐛 Debug: window.debug.enableTracing()')
}

// Animation loop
;(function animate() {
  requestAnimationFrame(animate)

  game.update()
  timeOfDay.update()

  renderer.render(scene, camera)
})()

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

console.log('✅ Game initialized - all hexagonal modules operational')
