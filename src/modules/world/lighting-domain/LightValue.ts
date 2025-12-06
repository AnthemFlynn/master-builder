// src/modules/lighting/domain/LightValue.ts
export interface RGB {
  r: number  // 0-15
  g: number  // 0-15
  b: number  // 0-15
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

export function normalizeLightToColor(rgb: RGB): { r: number, g: number, b: number } {
  return {
    r: rgb.r / 15,
    g: rgb.g / 15,
    b: rgb.b / 15
  }
}
