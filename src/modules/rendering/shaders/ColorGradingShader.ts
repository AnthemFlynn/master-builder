// src/modules/rendering/shaders/ColorGradingShader.ts
import * as THREE from 'three'

/**
 * ColorGradingShader - Saturation, contrast, brightness, vibrance
 *
 * Vibrance boosts muted colors more than saturated ones (like Photoshop).
 */
export const ColorGradingShader = {
  name: 'ColorGradingShader',

  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.0 },   // Neutral - no change
    contrast: { value: 1.0 },     // Neutral - no change
    brightness: { value: 1.0 },   // Neutral - no change
    vibrance: { value: 0.0 }      // Disabled - can cause washout
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float brightness;
    uniform float vibrance;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Brightness
      color.rgb *= brightness;

      // Contrast (around mid-gray)
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;

      // Saturation
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(luminance), color.rgb, saturation);

      // Vibrance (boost low-saturation colors more)
      float maxChannel = max(color.r, max(color.g, color.b));
      float minChannel = min(color.r, min(color.g, color.b));
      float currentSat = (maxChannel - minChannel) / (maxChannel + 0.001);
      float vibranceAmount = vibrance * (1.0 - currentSat);
      color.rgb = mix(vec3(luminance), color.rgb, 1.0 + vibranceAmount);

      gl_FragColor = color;
    }
  `
}
