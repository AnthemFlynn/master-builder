import * as THREE from 'three'
import { blockRegistry } from '../../../modules/world/blocks'
import { textureArrayLoader } from './TextureArrayLoader'
import {
  createOpaqueMaterial,
  createTransparentMaterial,
  createVegetationMaterial,
  updateFogUniforms
} from '../shaders/VoxelShader'

/**
 * MaterialSystem - Manages materials for voxel rendering
 *
 * Uses texture arrays (DataArrayTexture) for efficient single-draw-call rendering.
 * Instead of one material per block type, we have only 3 shared materials:
 * - Opaque (solid blocks)
 * - Transparent (water, glass, ice)
 * - Vegetation (flowers, grass with alpha cutout)
 *
 * The texture layer index is stored per-vertex in the mesh geometry.
 */
export class MaterialSystem {
  // Shared materials (texture array approach - only 3 total!)
  private opaqueMaterial: THREE.ShaderMaterial | null = null
  private transparentMaterial: THREE.ShaderMaterial | null = null
  private vegetationMaterial: THREE.ShaderMaterial | null = null

  // Fallback materials (for before texture array loads)
  private fallbackOpaque: THREE.MeshBasicMaterial
  private fallbackTransparent: THREE.MeshBasicMaterial

  private isInitialized = false
  private initPromise: Promise<void> | null = null

  constructor() {
    // Create simple fallback materials
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

  /**
   * Initialize the texture array and create materials
   * Call this after block registry is populated
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  private async doInitialize(): Promise<void> {
    console.log('🎨 MaterialSystem: Loading texture array...')

    // Get all texture names from block registry
    const textureNames = blockRegistry.getAllTextureNames()
    console.log(`📦 Found ${textureNames.length} unique textures`)

    // Load textures into array
    await textureArrayLoader.loadTextures(textureNames)

    const textureArray = textureArrayLoader.getTextureArray()
    if (!textureArray) {
      console.error('❌ MaterialSystem: Failed to create texture array')
      return
    }

    // Create shared materials
    this.opaqueMaterial = createOpaqueMaterial(textureArray)
    this.transparentMaterial = createTransparentMaterial(textureArray)
    this.vegetationMaterial = createVegetationMaterial(textureArray)

    this.isInitialized = true
    console.log('✅ MaterialSystem: Texture array materials ready')
  }

  /**
   * Get material for OPAQUE geometry (solid blocks)
   * Returns the shared opaque material (all solid blocks use same material)
   */
  getOpaqueMaterial(_materialKey?: string): THREE.Material {
    if (!this.isInitialized || !this.opaqueMaterial) {
      return this.fallbackOpaque
    }
    return this.opaqueMaterial
  }

  /**
   * Get material for TRANSPARENT geometry (water, glass, vegetation)
   * Checks materialKey to determine if it's vegetation (alpha cutout) or true transparent
   */
  getTransparentMaterial(materialKey: string): THREE.Material {
    if (!this.isInitialized) {
      return this.fallbackTransparent
    }

    // Check if it's vegetation (cross-billboard)
    if (materialKey.endsWith(':cross')) {
      return this.vegetationMaterial || this.fallbackTransparent
    }

    // True transparency (water, glass, ice)
    return this.transparentMaterial || this.fallbackTransparent
  }

  /**
   * Get texture layer index for a texture name
   * Used by VertexBuilder to set per-vertex layer indices
   */
  getTextureLayerIndex(textureName: string): number {
    return textureArrayLoader.getLayerIndex(textureName)
  }

  /**
   * Get the texture layer lookup function for VertexBuilder
   */
  getTextureLayerLookup(): (name: string) => number {
    return (name: string) => textureArrayLoader.getLayerIndex(name)
  }

  /**
   * Update fog settings on all materials
   */
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

  /**
   * Check if texture array is loaded
   */
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
    this.isInitialized = false
    this.initPromise = null
  }
}
