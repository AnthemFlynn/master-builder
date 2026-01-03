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
  createPackedTransparentMaterial,
  updateFogUniforms
} from '../shaders/VoxelShader'

export class MaterialSystem {
  // Legacy shared materials
  private opaqueMaterial: THREE.ShaderMaterial | null = null
  private transparentMaterial: THREE.ShaderMaterial | null = null
  private vegetationMaterial: THREE.ShaderMaterial | null = null

  // Packed shared materials (SOTA)
  private packedOpaqueMaterial: THREE.ShaderMaterial | null = null
  private packedTransparentMaterial: THREE.ShaderMaterial | null = null

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

    // Create packed shared materials (using 0,0,0 offset as base)
    this.packedOpaqueMaterial = createPackedOpaqueMaterial(this.textureArray, new THREE.Vector3(0, 0, 0))
    this.packedTransparentMaterial = createPackedTransparentMaterial(this.textureArray, new THREE.Vector3(0, 0, 0))

    // Mark all as shared
    this.opaqueMaterial.userData.shared = true
    this.transparentMaterial.userData.shared = true
    this.vegetationMaterial.userData.shared = true
    this.packedOpaqueMaterial.userData.shared = true
    this.packedTransparentMaterial.userData.shared = true

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

  getPackedOpaqueMaterial(): THREE.Material {
    return this.packedOpaqueMaterial || this.fallbackOpaque
  }

  getPackedTransparentMaterial(): THREE.Material {
    return this.packedTransparentMaterial || this.fallbackTransparent
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
