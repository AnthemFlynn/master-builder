// src/modules/lighting/index.ts
export { LightValue, RGB, combineLightChannels, normalizeLightToColor } from './domain/LightValue'
export { LightData } from './domain/LightData'
export { ILightingQuery } from './ports/ILightingQuery'
export { LightingService } from './application/LightingService'

// Private to module (not exported):
// - LightingPipeline (internal implementation)
// - Individual passes (internal implementation)
