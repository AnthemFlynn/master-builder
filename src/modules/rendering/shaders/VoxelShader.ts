// src/modules/rendering/shaders/VoxelShader.ts
import * as THREE from 'three'

/**
 * VoxelShader - SOTA packed vertex format shader
 *
 * Unpacks 12-byte vertices (3 × uint32) in the vertex shader:
 * - uint32[0]: Position (X, Z, Y) + Normal index + AO level
 * - uint32[1]: UV + Texture layer
 * - uint32[2]: Color RGB8
 *
 * This format reduces vertex size from 48 bytes to 12 bytes (4× reduction).
 */

export const packedVoxelVertexShader = /* glsl */ `
precision highp float;
precision highp int;

// Packed vertex attributes (3 × uint32 = 12 bytes per vertex)
attribute uint aPackedPosNormal;  // Position + Normal + AO
attribute uint aPackedUVTex;      // UV + Texture layer
attribute uint aPackedColor;      // RGB8 color

// Uniforms
uniform vec3 uChunkOffset;  // World position of chunk origin

// Varyings to fragment shader
varying vec2 vUv;
varying vec3 vColor;
varying float vLayer;
varying vec3 vWorldPosition;
varying vec3 vNormal;

// Normal vectors lookup table
const vec3 NORMALS[6] = vec3[6](
  vec3(1.0, 0.0, 0.0),   // 0: +X
  vec3(-1.0, 0.0, 0.0),  // 1: -X
  vec3(0.0, 1.0, 0.0),   // 2: +Y
  vec3(0.0, -1.0, 0.0),  // 3: -Y
  vec3(0.0, 0.0, 1.0),   // 4: +Z
  vec3(0.0, 0.0, -1.0)   // 5: -Z
);

void main() {
  // Unpack position from aPackedPosNormal
  // bits 0-4: X, bits 5-9: Z, bits 10-18: Y
  float x = float(aPackedPosNormal & 0x1Fu);
  float z = float((aPackedPosNormal >> 5u) & 0x1Fu);
  float y = float((aPackedPosNormal >> 10u) & 0x1FFu);

  // Unpack normal index (bits 19-21) and AO (bits 22-23)
  uint normalIdx = (aPackedPosNormal >> 19u) & 0x7u;
  // uint aoLevel = (aPackedPosNormal >> 22u) & 0x3u;  // Available if needed

  // Unpack UV and texture layer from aPackedUVTex
  // bits 0-7: U, bits 8-15: V, bits 16-27: texture layer
  float u = float(aPackedUVTex & 0xFFu) / 16.0;  // Unscale from packed format
  float v = float((aPackedUVTex >> 8u) & 0xFFu) / 16.0;
  float texLayer = float((aPackedUVTex >> 16u) & 0xFFFu);

  // Unpack color from aPackedColor
  // bits 0-7: R, bits 8-15: G, bits 16-23: B
  float r = float(aPackedColor & 0xFFu) / 255.0;
  float g = float((aPackedColor >> 8u) & 0xFFu) / 255.0;
  float b = float((aPackedColor >> 16u) & 0xFFu) / 255.0;

  // Reconstruct position
  vec3 localPos = vec3(x, y, z);
  vec3 worldPos = localPos + uChunkOffset;

  // Get normal from lookup table
  vec3 normal = normalIdx < 6u ? NORMALS[normalIdx] : vec3(0.0, 1.0, 0.0);

  // Set varyings
  vUv = vec2(u, v);
  vColor = vec3(r, g, b);
  vLayer = texLayer;
  vNormal = normalize(normalMatrix * normal);
  vWorldPosition = worldPos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}
`

// Legacy vertex shader for backwards compatibility
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
 * Material options
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
  usePacked?: boolean  // Use packed vertex format
  chunkOffset?: THREE.Vector3  // Chunk world position (for packed format)
}

/**
 * Create a voxel material using packed or legacy shader
 */
export function createVoxelMaterial(options: VoxelMaterialOptions): THREE.ShaderMaterial {
  const {
    textureArray,
    transparent = false,
    alphaTest = 0.0,
    depthWrite = true,
    side = THREE.FrontSide,
    fog = true,
    emissive = new THREE.Color(0, 0, 0),
    emissiveIntensity = 0,
    usePacked = false,
    chunkOffset = new THREE.Vector3(0, 0, 0)
  } = options

  const material = new THREE.ShaderMaterial({
    vertexShader: usePacked ? packedVoxelVertexShader : voxelVertexShader,
    fragmentShader: voxelFragmentShader,
    uniforms: {
      uTextureArray: { value: textureArray },
      uAlphaTest: { value: alphaTest },
      uFogColor: { value: new THREE.Color(0xcccccc) },
      uFogNear: { value: 50 },
      uFogFar: { value: 200 },
      uUseFog: { value: fog },
      uEmissive: { value: emissive },
      uEmissiveIntensity: { value: emissiveIntensity },
      uChunkOffset: { value: chunkOffset }
    },
    transparent,
    depthWrite,
    side,
    vertexColors: !usePacked,  // Legacy format uses vertex colors attribute
    glslVersion: usePacked ? THREE.GLSL3 : undefined  // GLSL3 for uint attributes
  })

  return material
}

/**
 * Create material for opaque blocks (legacy format)
 */
export function createOpaqueMaterial(textureArray: THREE.DataArrayTexture): THREE.ShaderMaterial {
  return createVoxelMaterial({
    textureArray,
    transparent: false,
    alphaTest: 0.0,
    depthWrite: true,
    side: THREE.FrontSide,
    fog: true,
    usePacked: false
  })
}

/**
 * Create material for opaque blocks (packed format)
 */
export function createPackedOpaqueMaterial(
  textureArray: THREE.DataArrayTexture,
  chunkOffset: THREE.Vector3
): THREE.ShaderMaterial {
  return createVoxelMaterial({
    textureArray,
    transparent: false,
    alphaTest: 0.0,
    depthWrite: true,
    side: THREE.FrontSide,
    fog: true,
    usePacked: true,
    chunkOffset
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
    depthWrite: false,
    side: THREE.FrontSide,
    fog: true,
    usePacked: false
  })
}

/**
 * Create material for vegetation (alpha test cutout)
 */
export function createVegetationMaterial(textureArray: THREE.DataArrayTexture): THREE.ShaderMaterial {
  return createVoxelMaterial({
    textureArray,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: true,
    side: THREE.DoubleSide,
    fog: true,
    usePacked: false
  })
}

/**
 * Update fog uniforms
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
 * Update chunk offset for packed materials
 */
export function updateChunkOffset(
  material: THREE.ShaderMaterial,
  chunkOffset: THREE.Vector3
): void {
  if (material.uniforms.uChunkOffset) {
    material.uniforms.uChunkOffset.value.copy(chunkOffset)
  }
}

/**
 * Update emissive uniforms
 */
export function updateEmissiveUniforms(
  material: THREE.ShaderMaterial,
  emissive: THREE.Color,
  intensity: number
): void {
  material.uniforms.uEmissive.value.copy(emissive)
  material.uniforms.uEmissiveIntensity.value = intensity
}
