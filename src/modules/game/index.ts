// src/modules/game/index.ts
export { GameOrchestrator } from './application/GameOrchestrator'

// Re-export from shared for backward compatibility
// (prefer importing directly from shared/infrastructure)
export { EventBus } from '../../shared/infrastructure/EventBus'
export { CommandBus } from '../../shared/infrastructure/CommandBus'

// Commands (for external use)
export { GenerateChunkCommand } from './domain/commands/GenerateChunkCommand'
export { PlaceBlockCommand } from './domain/commands/PlaceBlockCommand'
export { RemoveBlockCommand } from './domain/commands/RemoveBlockCommand'
