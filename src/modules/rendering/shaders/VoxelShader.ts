// src/modules/rendering/shaders/VoxelShader.ts
import * as THREE from 'three'

/**
 * VoxelShader - Custom shader material for voxel rendering
 *
 * Uses texture arrays (sampler2DArray) for efficient single-draw-call rendering.
 * Supports:
 * - Texture array sampling with layer index per vertex
 * - Vertex colors for ambient occlusion and lighting
 * - Fog support
 * - Alpha testing for vegetation cutouts
 */

export const voxelVertexShader = /* glsl */ `
precision highp float;

// Vertex attributes
attribute float aLayer;  // Texture layer index

// Varyings to fragment shader
varying vec2 vUv;
varying vec3 vColor;
varying float vLayer;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vColor = color;
  vLayer = aLayer;
  vNormal = normalize(normalMatrix * normal);

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

export const voxelFragmentShader = /* glsl */ `
precision highp float;
precision highp sampler2DArray;

// Uniforms
uniform sampler2DArray uTextureArray;
uniform float uAlphaTest;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform bool uUseFog;
uniform vec3 uEmissive;
uniform float uEmissiveIntensity;

// Varyings from vertex shader
varying vec2 vUv;
varying vec3 vColor;
varying float vLayer;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  // Sample texture array
  vec4 texColor = texture(uTextureArray, vec3(vUv, vLayer));

  // Alpha test for vegetation cutouts
  if (texColor.a < uAlphaTest) {
    discard;
  }

  // Apply vertex colors (AO, lighting)
  vec3 finalColor = texColor.rgb * vColor;

  // Add emissive
  finalColor += uEmissive * uEmissiveIntensity;

  // Apply fog
  if (uUseFog) {
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = smoothstep(uFogNear, uFogFar, depth);
    finalColor = mix(finalColor, uFogColor, fogFactor);
  }

  gl_FragColor = vec4(finalColor, texColor.a);
}
`

// Underwater fragment shader variant
export const voxelFragmentShaderUnderwater = /* glsl */ `
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray uTextureArray;
uniform float uAlphaTest;
uniform vec3 uWaterTint;
uniform float uWaterFogDensity;

varying vec2 vUv;
varying vec3 vColor;
varying float vLayer;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec4 texColor = texture(uTextureArray, vec3(vUv, vLayer));

  if (texColor.a < uAlphaTest) {
    discard;
  }

  vec3 finalColor = texColor.rgb * vColor;

  // Underwater fog effect
  float depth = gl_FragCoord.z / gl_FragCoord.w;
  float fogFactor = 1.0 - exp(-uWaterFogDensity * depth);
  finalColor = mix(finalColor, uWaterTint, clamp(fogFactor, 0.0, 0.8));

  gl_FragColor = vec4(finalColor, texColor.a);
}
`

/**
 * Create a voxel material using the custom shader
 */
export interface VoxelMaterialOptions {
  textureArray: THREE.DataArrayTexture
  transparent?: boolean
  alphaTest?: number
  depthWrite?: boolean
  side?: THREE.Side
  fog?: boolean
  emissive?: THREE.Color
  emissiveIntensity?: number
}

export function createVoxelMaterial(options: VoxelMaterialOptions): THREE.ShaderMaterial {
  const {
    textureArray,
    transparent = false,
    alphaTest = 0.0,
    depthWrite = true,
    side = THREE.FrontSide,
    fog = true,
    emissive = new THREE.Color(0, 0, 0),
    emissiveIntensity = 0
  } = options

  const material = new THREE.ShaderMaterial({
    vertexShader: voxelVertexShader,
    fragmentShader: voxelFragmentShader,
    uniforms: {
      uTextureArray: { value: textureArray },
      uAlphaTest: { value: alphaTest },
      uFogColor: { value: new THREE.Color(0xcccccc) },
      uFogNear: { value: 50 },
      uFogFar: { value: 200 },
      uUseFog: { value: fog },
      uEmissive: { value: emissive },
      uEmissiveIntensity: { value: emissiveIntensity }
    },
    transparent,
    depthWrite,
    side,
    vertexColors: true
  })

  return material
}

/**
 * Create material for opaque blocks
 */
export function createOpaqueMaterial(textureArray: THREE.DataArrayTexture): THREE.ShaderMaterial {
  return createVoxelMaterial({
    textureArray,
    transparent: false,
    alphaTest: 0.0,
    depthWrite: true,
    side: THREE.FrontSide,
    fog: true
  })
}

/**
 * Create material for transparent blocks (water, glass, ice)
 */
export function createTransparentMaterial(textureArray: THREE.DataArrayTexture): THREE.ShaderMaterial {
  return createVoxelMaterial({
    textureArray,
    transparent: true,
    alphaTest: 0.0,
    depthWrite: false, // Don't write depth for true transparency
    side: THREE.FrontSide,
    fog: true
  })
}

/**
 * Create material for vegetation (alpha test cutout)
 */
export function createVegetationMaterial(textureArray: THREE.DataArrayTexture): THREE.ShaderMaterial {
  return createVoxelMaterial({
    textureArray,
    transparent: true,
    alphaTest: 0.5, // Cutout transparency
    depthWrite: true, // Can write depth since using alpha test
    side: THREE.DoubleSide, // Render both sides for cross-billboards
    fog: true
  })
}

/**
 * Update fog uniforms (call when fog settings change)
 */
export function updateFogUniforms(
  material: THREE.ShaderMaterial,
  fogColor: THREE.Color,
  fogNear: number,
  fogFar: number
): void {
  material.uniforms.uFogColor.value.copy(fogColor)
  material.uniforms.uFogNear.value = fogNear
  material.uniforms.uFogFar.value = fogFar
}

/**
 * Update emissive uniforms (for light-emitting blocks)
 */
export function updateEmissiveUniforms(
  material: THREE.ShaderMaterial,
  emissive: THREE.Color,
  intensity: number
): void {
  material.uniforms.uEmissive.value.copy(emissive)
  material.uniforms.uEmissiveIntensity.value = intensity
}
