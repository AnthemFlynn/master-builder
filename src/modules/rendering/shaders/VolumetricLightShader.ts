// src/modules/rendering/shaders/VolumetricLightShader.ts
import * as THREE from 'three'

/**
 * VolumetricLightShader - God rays / light shafts
 *
 * Uses radial blur from light source positions to create volumetric effect.
 * Supports multiple light sources (sun + emissive blocks).
 */
export const VolumetricLightShader = {
  name: 'VolumetricLightShader',

  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    lightPositions: { value: [] as THREE.Vector2[] },  // Screen-space positions
    lightColors: { value: [] as THREE.Vector3[] },
    lightCount: { value: 0 },
    density: { value: 0.8 },
    weight: { value: 0.4 },
    decay: { value: 0.95 },
    samples: { value: 80 },
    exposure: { value: 0.3 }
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
    uniform sampler2D tDepth;
    uniform vec2 lightPositions[16];
    uniform vec3 lightColors[16];
    uniform int lightCount;
    uniform float density;
    uniform float weight;
    uniform float decay;
    uniform int samples;
    uniform float exposure;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 godRays = vec3(0.0);

      // Process each light source
      for (int l = 0; l < 16; l++) {
        if (l >= lightCount) break;

        vec2 lightPos = lightPositions[l];
        vec3 lightColor = lightColors[l];

        // Direction from pixel to light
        vec2 deltaTexCoord = (vUv - lightPos) * density / float(samples);
        vec2 texCoord = vUv;

        float illuminationDecay = 1.0;
        vec3 rayColor = vec3(0.0);

        // March toward light, accumulating color
        for (int i = 0; i < 100; i++) {
          if (i >= samples) break;

          texCoord -= deltaTexCoord;

          // Sample scene at this point
          vec3 sampleColor = texture2D(tDiffuse, texCoord).rgb;

          // Accumulate weighted sample
          sampleColor *= illuminationDecay * weight;
          rayColor += sampleColor;

          illuminationDecay *= decay;
        }

        godRays += rayColor * lightColor;
      }

      // Add god rays to original color
      color.rgb += godRays * exposure;

      gl_FragColor = color;
    }
  `
}

/**
 * Project world position to screen space
 */
export function projectToScreen(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number
): THREE.Vector2 {
  const pos = worldPos.clone().project(camera)
  return new THREE.Vector2(
    (pos.x + 1) / 2,
    (pos.y + 1) / 2
  )
}
