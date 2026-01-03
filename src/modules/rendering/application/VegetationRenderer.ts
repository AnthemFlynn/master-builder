// src/modules/rendering/application/VegetationRenderer.ts
/**
 * VegetationRenderer - Renders vegetation using THREE.InstancedMesh
 *
 * SOTA technique: Uses instanced rendering for vegetation (grass, flowers, etc.)
 * instead of individual meshes. This reduces draw calls from N to 1 per vegetation type.
 *
 * Benefits:
 * - Single draw call per vegetation type per chunk
 * - GPU-efficient instancing
 * - Supports per-instance rotation, scale, wind animation
 */
import * as THREE from 'three'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../../../shared/constants/ChunkConstants'
import { textureArrayLoader } from './TextureArrayLoader'

// Vegetation instance data layout (16 bytes per instance in shader):
// - position (vec3): x, y, z
// - textureLayer (float): texture array layer

const VEGETATION_VERTEX_SHADER = /* glsl */ `
precision highp float;

// Instance attributes
in vec3 instancePosition;
in float instanceTextureLayer;
in float instanceVariation;

// Built-in attributes (GLSL 300 ES)
in vec3 position;
in vec2 uv;

// Outputs to fragment shader (GLSL 300 ES)
out vec2 vUv;
out float vLayer;
out vec3 vWorldPosition;

// Uniforms
uniform float uTime;
uniform float uWindStrength;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  // Base cross-billboard vertex position (unit quad centered at origin)
  vec3 pos = position;

  // Apply slight rotation based on variation (makes vegetation look more natural)
  float angle = instanceVariation * 6.28318; // 0 to 2*PI
  float c = cos(angle);
  float s = sin(angle);
  pos.xz = vec2(pos.x * c - pos.z * s, pos.x * s + pos.z * c);

  // Wind animation - gentle sway based on height
  float windOffset = sin(uTime * 2.0 + instancePosition.x * 0.5 + instancePosition.z * 0.5);
  pos.x += windOffset * uWindStrength * position.y * 0.1;

  // Scale variation (0.8 to 1.2)
  float scale = 0.8 + instanceVariation * 0.4;
  pos *= scale;

  // Move to world position
  vec3 worldPos = pos + instancePosition;

  vUv = uv;
  vLayer = instanceTextureLayer;
  vWorldPosition = worldPos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}
`

const VEGETATION_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray uTextureArray;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform bool uUseFog;

in vec2 vUv;
in float vLayer;
in vec3 vWorldPosition;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(uTextureArray, vec3(vUv, vLayer));

  // Alpha test for vegetation cutout
  if (texColor.a < 0.5) {
    discard;
  }

  vec3 finalColor = texColor.rgb;

  // Apply fog
  if (uUseFog) {
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = smoothstep(uFogNear, uFogFar, depth);
    finalColor = mix(finalColor, uFogColor, fogFactor);
  }

  fragColor = vec4(finalColor, texColor.a);
}
`

interface ChunkVegetation {
  instancedMesh: THREE.InstancedMesh
  instanceCount: number
}

export class VegetationRenderer {
  private vegetationMeshes = new Map<string, ChunkVegetation>()
  private material: THREE.ShaderMaterial | null = null
  private crossGeometry: THREE.BufferGeometry | null = null
  private isInitialized = false
  private time = 0

  constructor(
    private scene: THREE.Scene,
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e: any) => {
      if (e.vegetationInstances && e.vegetationCount > 0) {
        this.updateVegetation(e.chunkCoord, e.vegetationInstances, e.vegetationCount)
      }
    })

    this.eventBus.on('world', 'ChunkUnloadedEvent', (e: any) => {
      this.disposeChunk(e.chunkCoord)
    })
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Wait for texture array to be ready
    const textureArray = textureArrayLoader.getTextureArray()
    if (!textureArray) {
      console.warn('VegetationRenderer: Texture array not ready')
      return
    }

    // Create cross-billboard geometry (two intersecting quads)
    this.crossGeometry = this.createCrossGeometry()

    // Create instanced material
    this.material = new THREE.ShaderMaterial({
      vertexShader: VEGETATION_VERTEX_SHADER,
      fragmentShader: VEGETATION_FRAGMENT_SHADER,
      uniforms: {
        uTextureArray: { value: textureArray },
        uFogColor: { value: new THREE.Color(0xcccccc) },
        uFogNear: { value: 50 },
        uFogFar: { value: 200 },
        uUseFog: { value: true },
        uTime: { value: 0 },
        uWindStrength: { value: 0.3 }
      },
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      glslVersion: THREE.GLSL3
    })

    this.isInitialized = true
    console.log('VegetationRenderer: Initialized with InstancedMesh support')
  }

  /**
   * Create cross-billboard geometry (two quads at 90 degrees)
   * This is a common technique for vegetation in games
   */
  private createCrossGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    // Two quads intersecting at 90 degrees, centered at bottom
    const positions = new Float32Array([
      // First quad (along X axis)
      -0.5, 0.0, 0.0,
       0.5, 0.0, 0.0,
       0.5, 1.0, 0.0,
      -0.5, 1.0, 0.0,
      // Second quad (along Z axis)
       0.0, 0.0, -0.5,
       0.0, 0.0,  0.5,
       0.0, 1.0,  0.5,
       0.0, 1.0, -0.5
    ])

    const uvs = new Float32Array([
      // First quad
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
      // Second quad
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0
    ])

    const indices = new Uint16Array([
      // First quad
      0, 1, 2, 0, 2, 3,
      // Second quad
      4, 5, 6, 4, 6, 7
    ])

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))

    return geometry
  }

  /**
   * Update vegetation instances for a chunk
   * @param coord Chunk coordinate
   * @param instanceData Float32Array with [x, y, z, textureLayer] per instance
   * @param count Number of instances
   */
  updateVegetation(
    coord: ChunkCoordinate,
    instanceData: Float32Array,
    count: number
  ): void {
    if (!this.isInitialized || !this.material || !this.crossGeometry) {
      return
    }

    const key = coord.toKey()
    const old = this.vegetationMeshes.get(key)

    if (count === 0) {
      if (old) {
        this.scene.remove(old.instancedMesh)
        old.instancedMesh.dispose()
        this.vegetationMeshes.delete(key)
      }
      return
    }

    // Check if we can reuse the existing mesh
    if (old && old.instancedMesh.geometry.attributes.instancePosition.count >= count) {
      const mesh = old.instancedMesh
      
      // Update attributes
      const positionAttr = mesh.geometry.attributes.instancePosition as THREE.InstancedBufferAttribute
      const layerAttr = mesh.geometry.attributes.instanceTextureLayer as THREE.InstancedBufferAttribute
      const variationAttr = mesh.geometry.attributes.instanceVariation as THREE.InstancedBufferAttribute

      for (let i = 0; i < count; i++) {
        const baseIndex = i * 4
        const x = instanceData[baseIndex + 0]
        const y = instanceData[baseIndex + 1]
        const z = instanceData[baseIndex + 2]
        const layer = instanceData[baseIndex + 3]

        positionAttr.setXYZ(i, x, y, z)
        layerAttr.setX(i, layer)
        
        // Variation
        variationAttr.setX(i, this.hashPosition(x, z))
      }

      // Update ranges and flags
      positionAttr.needsUpdate = true
      layerAttr.needsUpdate = true
      variationAttr.needsUpdate = true
      
      // Update visible count
      mesh.count = count
      
      // Update stored count
      old.instanceCount = count
      return
    }

    // --- Create NEW Mesh (if no old mesh or capacity too small) ---

    // Dispose old if it exists (capacity too small)
    if (old) {
      this.scene.remove(old.instancedMesh)
      old.instancedMesh.dispose()
    }

    // Create new InstancedMesh
    const instancedMesh = new THREE.InstancedMesh(
      this.crossGeometry,
      this.material,
      count
    )

    // Set up instance attributes
    const instancePositions = new Float32Array(count * 3)
    const instanceTextureLayers = new Float32Array(count)
    const instanceVariations = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Extract data from packed format [x, y, z, textureLayer]
      const baseIndex = i * 4
      instancePositions[i * 3 + 0] = instanceData[baseIndex + 0]
      instancePositions[i * 3 + 1] = instanceData[baseIndex + 1]
      instancePositions[i * 3 + 2] = instanceData[baseIndex + 2]
      instanceTextureLayers[i] = instanceData[baseIndex + 3]

      // Generate variation from position hash (deterministic per-instance)
      const x = instanceData[baseIndex + 0]
      const z = instanceData[baseIndex + 2]
      instanceVariations[i] = this.hashPosition(x, z)
    }

    // Set instance attributes
    instancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)

    const geometry = instancedMesh.geometry
    geometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(instancePositions, 3))
    geometry.setAttribute('instanceTextureLayer', new THREE.InstancedBufferAttribute(instanceTextureLayers, 1))
    geometry.setAttribute('instanceVariation', new THREE.InstancedBufferAttribute(instanceVariations, 1))

    // Set identity matrices (we use instancePosition attribute instead)
    const matrix = new THREE.Matrix4()
    for (let i = 0; i < count; i++) {
      instancedMesh.setMatrixAt(i, matrix)
    }

    instancedMesh.frustumCulled = true
    instancedMesh.castShadow = false
    instancedMesh.receiveShadow = true

    this.scene.add(instancedMesh)
    this.vegetationMeshes.set(key, { instancedMesh, instanceCount: count })
  }

  /**
   * Simple hash function for position-based variation
   */
  private hashPosition(x: number, y: number): number {
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return hash - Math.floor(hash) // Normalized 0-1
  }

  /**
   * Update time uniform for wind animation
   */
  update(deltaTime: number): void {
    if (!this.material) return

    this.time += deltaTime
    this.material.uniforms.uTime.value = this.time
  }

  /**
   * Update fog uniforms
   */
  updateFog(fogColor: THREE.Color, fogNear: number, fogFar: number): void {
    if (!this.material) return

    this.material.uniforms.uFogColor.value.copy(fogColor)
    this.material.uniforms.uFogNear.value = fogNear
    this.material.uniforms.uFogFar.value = fogFar
  }

  disposeChunk(coord: ChunkCoordinate): void {
    const key = coord.toKey()
    const vegetation = this.vegetationMeshes.get(key)

    if (vegetation) {
      this.scene.remove(vegetation.instancedMesh)
      vegetation.instancedMesh.dispose()
      this.vegetationMeshes.delete(key)
    }
  }

  disposeAll(): void {
    for (const vegetation of this.vegetationMeshes.values()) {
      this.scene.remove(vegetation.instancedMesh)
      vegetation.instancedMesh.dispose()
    }
    this.vegetationMeshes.clear()

    this.crossGeometry?.dispose()
    this.material?.dispose()
    this.crossGeometry = null
    this.material = null
    this.isInitialized = false
  }

  /**
   * Get vegetation instance count for a chunk
   */
  getInstanceCount(coord: ChunkCoordinate): number {
    const key = coord.toKey()
    return this.vegetationMeshes.get(key)?.instanceCount ?? 0
  }

  /**
   * Get total vegetation instance count across all chunks
   */
  getTotalInstanceCount(): number {
    let total = 0
    for (const vegetation of this.vegetationMeshes.values()) {
      total += vegetation.instanceCount
    }
    return total
  }
}
