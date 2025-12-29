// src/shared/domain/LightValue.ts

export interface RGB {
  r: number
  g: number
  b: number
}

export interface LightValue {
  sky: RGB
  block: RGB
}

export function combineLightChannels(light: LightValue): RGB {
  return {
    r: Math.max(light.sky.r, light.block.r),
    g: Math.max(light.sky.g, light.block.g),
    b: Math.max(light.sky.b, light.block.b)
  }
}

// Minimum ambient light (5%) - prevents pitch black areas in caves/shadows
const AMBIENT_MINIMUM = 0.05

export function normalizeLightToColor(light: RGB): RGB {
  // Add ambient minimum so unlit areas are dim but visible
  return {
    r: Math.max(AMBIENT_MINIMUM, light.r / 15),
    g: Math.max(AMBIENT_MINIMUM, light.g / 15),
    b: Math.max(AMBIENT_MINIMUM, light.b / 15)
  }
}
