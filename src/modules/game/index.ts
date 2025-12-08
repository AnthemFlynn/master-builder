// src/modules/game/index.ts
export { GameOrchestrator } from './application/GameOrchestrator'
export { EventBus } from './infrastructure/EventBus'
export { CommandBus } from './infrastructure/CommandBus'

// Commands (for external use)
export { GenerateChunkCommand } from './domain/commands/GenerateChunkCommand'
export { PlaceBlockCommand } from './domain/commands/PlaceBlockCommand'
