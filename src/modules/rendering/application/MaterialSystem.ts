// src/modules/rendering/application/MaterialSystem.ts
/**
 * MaterialSystem - Manages materials for voxel rendering
 *
 * Supports both legacy format and SOTA packed vertex format (12 bytes per vertex).
 * Uses texture arrays (DataArrayTexture) for efficient rendering.
 */
import * as THREE from 'three'
import { blockRegistry } from '../../../modules/world/blocks'
import { textureArrayLoader } from './TextureArrayLoader'
import {
  createOpaqueMaterial,
  createTransparentMaterial,
  createVegetationMaterial,
  createPackedOpaqueMaterial,
  updateFogUniforms
} from '../shaders/VoxelShader'

export class MaterialSystem {
  // Legacy shared materials (for backwards compatibility)
  private opaqueMaterial: THREE.ShaderMaterial | null = null
  private transparentMaterial: THREE.ShaderMaterial | null = null
  private vegetationMaterial: THREE.ShaderMaterial | null = null

  // Fallback materials
  private fallbackOpaque: THREE.MeshBasicMaterial
  private fallbackTransparent: THREE.MeshBasicMaterial

  private isInitialized = false
  private initPromise: Promise<void> | null = null

  // Cache texture array for packed material creation
  private textureArray: THREE.DataArrayTexture | null = null

  constructor() {
    this.fallbackOpaque = new THREE.MeshBasicMaterial({
      color: 0x888888,
      vertexColors: true
    })
    this.fallbackTransparent = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    })
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  private async doInitialize(): Promise<void> {
    console.log('🎨 MaterialSystem: Loading texture array...')

    const textureNames = blockRegistry.getAllTextureNames()
    console.log(`📦 Found ${textureNames.length} unique textures`)

    await textureArrayLoader.loadTextures(textureNames)

    this.textureArray = textureArrayLoader.getTextureArray()
    if (!this.textureArray) {
      console.error('❌ MaterialSystem: Failed to create texture array')
      return
    }

    // Create legacy shared materials
    this.opaqueMaterial = createOpaqueMaterial(this.textureArray)
    this.transparentMaterial = createTransparentMaterial(this.textureArray)
    this.vegetationMaterial = createVegetationMaterial(this.textureArray)

    // Mark legacy materials as shared (don't dispose per-chunk)
    this.opaqueMaterial.userData.shared = true
    this.transparentMaterial.userData.shared = true
    this.vegetationMaterial.userData.shared = true

    this.isInitialized = true
    console.log('✅ MaterialSystem: Texture array materials ready (legacy + packed)')
  }

  // === Legacy Material Methods ===

  getOpaqueMaterial(_materialKey?: string): THREE.Material {
    if (!this.isInitialized || !this.opaqueMaterial) {
      return this.fallbackOpaque
    }
    return this.opaqueMaterial
  }

  getTransparentMaterial(materialKey: string): THREE.Material {
    if (!this.isInitialized) {
      return this.fallbackTransparent
    }

    if (materialKey.endsWith(':cross')) {
      return this.vegetationMaterial || this.fallbackTransparent
    }

    return this.transparentMaterial || this.fallbackTransparent
  }

  // === Packed Material Methods (SOTA 12-byte vertices) ===

  /**
   * Create a packed opaque material with chunk offset uniform
   * Each chunk gets its own material instance (for uChunkOffset uniform)
   */
  getPackedOpaqueMaterial(chunkOffset: THREE.Vector3): THREE.Material {
    if (!this.isInitialized || !this.textureArray) {
      return this.fallbackOpaque
    }

    // Create new material instance with chunk-specific offset
    const material = createPackedOpaqueMaterial(this.textureArray, chunkOffset)
    // Mark as NOT shared (will be disposed with chunk)
    material.userData.shared = false
    return material
  }

  /**
   * Create a packed transparent material with chunk offset uniform
   */
  getPackedTransparentMaterial(chunkOffset: THREE.Vector3): THREE.Material {
    if (!this.isInitialized || !this.textureArray) {
      return this.fallbackTransparent
    }

    // Create new material for transparent with packed format
    const material = new THREE.ShaderMaterial({
      vertexShader: `
precision highp float;
precision highp int;

attribute uint aPackedPosNormal;
attribute uint aPackedUVTex;
attribute uint aPackedColor;

uniform vec3 uChunkOffset;

varying vec2 vUv;
varying vec3 vColor;
varying float vLayer;
varying vec3 vWorldPosition;
varying vec3 vNormal;

const vec3 NORMALS[6] = vec3[6](
  vec3(1.0, 0.0, 0.0),
  vec3(-1.0, 0.0, 0.0),
  vec3(0.0, 1.0, 0.0),
  vec3(0.0, -1.0, 0.0),
  vec3(0.0, 0.0, 1.0),
  vec3(0.0, 0.0, -1.0)
);

void main() {
  float x = float(aPackedPosNormal & 0x1Fu);
  float z = float((aPackedPosNormal >> 5u) & 0x1Fu);
  float y = float((aPackedPosNormal >> 10u) & 0x1FFu);
  uint normalIdx = (aPackedPosNormal >> 19u) & 0x7u;

  float u = float(aPackedUVTex & 0xFFu) / 16.0;
  float v = float((aPackedUVTex >> 8u) & 0xFFu) / 16.0;
  float texLayer = float((aPackedUVTex >> 16u) & 0xFFFu);

  float r = float(aPackedColor & 0xFFu) / 255.0;
  float g = float((aPackedColor >> 8u) & 0xFFu) / 255.0;
  float b = float((aPackedColor >> 16u) & 0xFFu) / 255.0;

  vec3 localPos = vec3(x, y, z);
  vec3 worldPos = localPos + uChunkOffset;
  vec3 normal = normalIdx < 6u ? NORMALS[normalIdx] : vec3(0.0, 1.0, 0.0);

  vUv = vec2(u, v);
  vColor = vec3(r, g, b);
  vLayer = texLayer;
  vNormal = normalize(normalMatrix * normal);
  vWorldPosition = worldPos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}
`,
      fragmentShader: `
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray uTextureArray;
uniform float uAlphaTest;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform bool uUseFog;

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

  if (uUseFog) {
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = smoothstep(uFogNear, uFogFar, depth);
    finalColor = mix(finalColor, uFogColor, fogFactor);
  }

  gl_FragColor = vec4(finalColor, texColor.a);
}
`,
      uniforms: {
        uTextureArray: { value: this.textureArray },
        uAlphaTest: { value: 0.5 },
        uFogColor: { value: new THREE.Color(0xcccccc) },
        uFogNear: { value: 50 },
        uFogFar: { value: 200 },
        uUseFog: { value: true },
        uChunkOffset: { value: chunkOffset }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      glslVersion: THREE.GLSL3
    })

    material.userData.shared = false
    return material
  }

  // === Utility Methods ===

  getTextureLayerIndex(textureName: string): number {
    return textureArrayLoader.getLayerIndex(textureName)
  }

  getTextureLayerLookup(): (name: string) => number {
    return (name: string) => textureArrayLoader.getLayerIndex(name)
  }

  updateFog(fogColor: THREE.Color, fogNear: number, fogFar: number): void {
    if (this.opaqueMaterial) {
      updateFogUniforms(this.opaqueMaterial, fogColor, fogNear, fogFar)
    }
    if (this.transparentMaterial) {
      updateFogUniforms(this.transparentMaterial, fogColor, fogNear, fogFar)
    }
    if (this.vegetationMaterial) {
      updateFogUniforms(this.vegetationMaterial, fogColor, fogNear, fogFar)
    }
  }

  isReady(): boolean {
    return this.isInitialized
  }

  dispose(): void {
    this.opaqueMaterial?.dispose()
    this.transparentMaterial?.dispose()
    this.vegetationMaterial?.dispose()
    this.fallbackOpaque.dispose()
    this.fallbackTransparent.dispose()
    textureArrayLoader.dispose()

    this.opaqueMaterial = null
    this.transparentMaterial = null
    this.vegetationMaterial = null
    this.textureArray = null
    this.isInitialized = false
    this.initPromise = null
  }
}
