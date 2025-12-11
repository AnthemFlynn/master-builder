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
