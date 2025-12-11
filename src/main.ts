import './style.css'
import Core from './core'
import { GameOrchestrator } from './modules/game'
import { PlayerMode } from './modules/player/domain/PlayerMode'
import { getWorldPreset } from './modules/world/domain/WorldPreset'
import { DEFAULT_WORLD_PRESET_ID } from './modules/world/domain/WorldConfig'

// Initialize BlockRegistry
import { initializeBlockRegistry } from './modules/blocks'
initializeBlockRegistry()

// Initialize Three.js core
const core = new Core()
const camera = core.camera
const scene = core.scene
const renderer = core.renderer
const activePreset = getWorldPreset(DEFAULT_WORLD_PRESET_ID)

// Initialize game (all modules)
const game = new GameOrchestrator(scene, camera)

// Expose for debugging
if (typeof window !== 'undefined') {
  const global = window as any

  if (typeof global.game === 'function') {
    console.warn('window.game already defined. Exposing GameOrchestrator as window.gameOrchestrator instead.')
    global.gameOrchestrator = game
  } else {
    global.game = game
    global.gameOrchestrator = game
  }

  global.debug = {
    enableTracing: () => game.enableEventTracing(),
    replayCommands: (from: number) => game.replayCommands(from),
    getCommandLog: () => game.getCommandLog(),
    getPlayerMode: () => game.getPlayerService().getMode(),
    setPlayerMode: (mode: PlayerMode) => game.getPlayerService().setMode(mode),
    getPlayerPosition: () => game.getPlayerService().getPosition().clone(),
    setHour: (hour: number) => game.getEnvironmentService().setHour(hour),
    getWorldPreset: () => activePreset
  }

  // Force time to Solar Noon for consistent development lighting
  game.getEnvironmentService().setHour(12)

  console.log('✅ Hexagonal architecture active - 10 modules loaded')
  console.log('🐛 Debug: window.debug.enableTracing()')
}

// Animation loop
;(function animate() {
  requestAnimationFrame(animate)

  try {
    game.update()

    const uiService = game.getUIService()
    if (uiService && uiService.updateFPS) {
      uiService.updateFPS()
    }

    renderer.render(scene, camera)
  } catch (error) {
    console.error('❌ Animation loop error:', error)
    throw error
  }
})()

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

console.log('✅ Game initialized - all hexagonal modules operational')