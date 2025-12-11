// src/modules/environment/domain/voxel-lighting/LightValue.ts
import { RGB, LightValue } from '../../../../../shared/domain/LightValue' // Corrected import path

export function combineLightChannels(light: LightValue): RGB {
  return {
    r: Math.max(light.sky.r, light.block.r),
    g: Math.max(light.sky.g, light.block.g),
    b: Math.max(light.sky.b, light.block.b)
  }
}

export function normalizeLightToColor(light: RGB): RGB {
  // No clamp, allow full darkness (0.0)
  return {
    r: light.r / 15,
    g: light.g / 15,
    b: light.b / 15
  }
}
