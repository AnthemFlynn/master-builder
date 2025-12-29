import Core from './core'
import { GameOrchestrator } from './modules/game'
import { initializeAsyncServices } from './modules/game/GameFactory'
import { PlayerMode } from './modules/player/domain/PlayerMode'
import { SaveGameCommand } from './modules/persistence/domain/commands/SaveGameCommand'
import { LoadGameCommand } from './modules/persistence/domain/commands/LoadGameCommand'

// Initialize BlockRegistry
import { initializeBlockRegistry } from './modules/blocks'
initializeBlockRegistry()

// Initialize Three.js core
const core = new Core()
const camera = core.camera
const scene = core.scene
const renderer = core.renderer

// Initialize game (all modules)
const game = new GameOrchestrator(scene, camera)

// Initialize async services (persistence, world manager, etc.)
;(async () => {
  try {
    await initializeAsyncServices(game.getServices(), renderer)
    startGame()
  } catch (error) {
    console.error('[main.ts] Error during async initialization:', error)
    throw error
  }
})()

function startGame() {

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
    save: (slotName = 'manual-save') => game.commandBus.send(new SaveGameCommand(slotName, slotName, false)),
    load: (slotName = 'manual-save') => game.commandBus.send(new LoadGameCommand(slotName)),
    listSaves: async () => await game.getPersistenceService().listSaveSlots()
  }

  // Force time to Solar Noon for consistent development lighting
  game.getEnvironmentService().setHour(12)

  console.log('✅ Hexagonal architecture active - 11 modules loaded (persistence added)')
  console.log('🐛 Debug: window.debug.enableTracing()')
  console.log('💾 Debug: window.debug.save() / window.debug.load() / window.debug.listSaves()')
}
}

// Animation loop with frame budget enforcement
const FRAME_BUDGET_MS = 16.67 // 60fps target
const FRAME_BUDGET_WARNING_MS = 33.33 // Warn if frame takes >2 frames worth
let lastFrameTime = performance.now()
let frameOverrunCount = 0
let lastOverrunWarning = 0

;(function animate() {
  requestAnimationFrame(animate)

  const frameStart = performance.now()
  const deltaTime = frameStart - lastFrameTime
  lastFrameTime = frameStart

  try {
    // Skip heavy processing if we're severely behind (>3 frames)
    const skipHeavyProcessing = deltaTime > FRAME_BUDGET_MS * 3

    game.update(skipHeavyProcessing)

    const uiService = game.getUIService()
    if (uiService && uiService.updateFPS) {
      uiService.updateFPS()
    }

    renderer.render(scene, camera)

    // Frame budget enforcement: warn if we're taking too long
    const frameEnd = performance.now()
    const frameDuration = frameEnd - frameStart

    if (frameDuration > FRAME_BUDGET_WARNING_MS) {
      frameOverrunCount++
      // Throttle warnings to avoid console spam
      if (frameEnd - lastOverrunWarning > 5000) {
        console.warn(`⚠️ Frame budget exceeded: ${frameDuration.toFixed(1)}ms (${frameOverrunCount} overruns in last 5s)`)
        frameOverrunCount = 0
        lastOverrunWarning = frameEnd
      }
    }
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