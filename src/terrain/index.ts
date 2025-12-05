import * as THREE from 'three'
import Materials, { MaterialType } from './mesh/materials'
import Block from './mesh/block'
import Highlight from './highlight'
import { ChunkManager } from './ChunkManager'
import { LightingEngine } from '../lighting/LightingEngine'
import { ChunkMeshManager } from './ChunkMeshManager'
import { blockRegistry } from '../blocks'
import Noise from './noise'

export enum BlockType {
  grass = 0,
  sand = 1,
  tree = 2,
  leaf = 3,
  dirt = 4,
  stone = 5,
  coal = 6,
  wood = 7,
  diamond = 8,
  quartz = 9,
  glass = 10,
  bedrock = 11,
  glowstone = 12,
  redstone_lamp = 13
}
export default class Terrain {
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene
    this.camera = camera
    this.maxCount =
      (this.distance * this.chunkSize * 2 + this.chunkSize) ** 2 + 500
    this.highlight = new Highlight(scene, camera, this)
    this.scene.add(this.cloud)

    // Initialize ChunkManager
    this.chunkManager = new ChunkManager()
    console.log('✅ ChunkManager initialized')

    // Initialize LightingEngine
    this.lightingEngine = new LightingEngine(
      this.chunkManager,
      (x, y, z) => this.getBlockTypeAt(x, y, z)  // Callback
    )

    // Initialize ChunkMeshManager
    this.chunkMeshManager = new ChunkMeshManager(
      this.scene,
      this.materials.get(MaterialType.grass) as THREE.Material  // Shared material for now
    )
    console.log('✅ ChunkMeshManager initialized')
  }
  // core properties
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  distance = 3
  chunkSize = 24

  // terrain properties
  maxCount: number
  chunk = new THREE.Vector2(0, 0)
  previousChunk = new THREE.Vector2(0, 0)
  noise = new Noise()

  // materials
  materials = new Materials()

  // lighting system
  chunkManager: ChunkManager
  lightingEngine: LightingEngine
  chunkMeshManager: ChunkMeshManager

  // other properties
  customBlocks: Block[] = []
  highlight: Highlight

  // cloud
  cloud = new THREE.InstancedMesh(
    new THREE.BoxGeometry(20, 5, 14),
    new THREE.MeshStandardMaterial({
      transparent: true,
      color: 0xffffff,
      opacity: 0.4
    }),
    1000
  )
  cloudCount = 0
  cloudGap = 5


  generate = () => {
    const distance = this.distance

    // Generate chunks in render distance
    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const chunkX = this.chunk.x + x
        const chunkZ = this.chunk.y + z
        const chunk = this.chunkManager.getChunk(chunkX, chunkZ)

        // Generate blocks for this chunk (if not already generated)
        if (!this.isChunkGenerated(chunk)) {
          this.generateChunkBlocks(chunk)

          // Mark dirty for mesh building
          this.chunkMeshManager.markDirty(chunkX, chunkZ, 'block')
        }
      }
    }

    // cloud
    if (this.cloudGap++ > 5) {
      this.cloudGap = 0
      this.cloud.instanceMatrix = new THREE.InstancedBufferAttribute(
        new Float32Array(1000 * 16),
        16
      )
      this.cloudCount = 0
      for (
        let x =
          -this.chunkSize * this.distance * 3 + this.chunkSize * this.chunk.x;
        x <
        this.chunkSize * this.distance * 3 +
          this.chunkSize +
          this.chunkSize * this.chunk.x;
        x += 20
      ) {
        for (
          let z =
            -this.chunkSize * this.distance * 3 + this.chunkSize * this.chunk.y;
          z <
          this.chunkSize * this.distance * 3 +
            this.chunkSize +
            this.chunkSize * this.chunk.y;
          z += 20
        ) {
          const matrix = new THREE.Matrix4()
          matrix.setPosition(x, 80 + (Math.random() - 0.5) * 30, z)

          if (Math.random() > 0.8) {
            this.cloud.setMatrixAt(this.cloudCount++, matrix)
          }
        }
      }
      this.cloud.instanceMatrix.needsUpdate = true
    }
  }

  /**
   * Check if chunk has been generated
   */
  private isChunkGenerated(chunk: any): boolean {
    // Check if any blocks exist (sample middle)
    const blockType = chunk.getBlockType(12, 128, 12)
    return blockType !== -1
  }

  /**
   * Generate blocks for one chunk using noise
   */
  private generateChunkBlocks(chunk: any): void {
    const chunkWorldX = chunk.x * this.chunkSize
    const chunkWorldZ = chunk.z * this.chunkSize

    for (let localX = 0; localX < this.chunkSize; localX++) {
      for (let localZ = 0; localZ < this.chunkSize; localZ++) {
        const worldX = chunkWorldX + localX
        const worldZ = chunkWorldZ + localZ

        // Calculate height using noise
        const height = Math.floor(
          this.noise.get(worldX / this.noise.gap, worldZ / this.noise.gap, this.noise.seed) *
            this.noise.amp + 30
        )

        for (let localY = 0; localY < 256; localY++) {
          const worldY = localY  // Y is not offset by chunk

          let blockType: BlockType | -1 = -1  // Air

          if (worldY === 0) {
            blockType = BlockType.bedrock
          } else if (worldY < height - 3) {
            blockType = BlockType.stone
          } else if (worldY < height) {
            blockType = BlockType.dirt
          } else if (worldY === Math.floor(height)) {
            blockType = BlockType.grass
          }

          if (blockType !== -1) {
            chunk.setBlockType(localX, worldY, localZ, blockType)
          }
        }
      }
    }

    console.log(`🌍 Generated chunk (${chunk.x}, ${chunk.z})`)
  }

  // generate adjacent blocks after removing a block (vertical infinity world)
  generateAdjacentBlocks = (position: THREE.Vector3) => {
    const { x, y, z } = position
    const noise = this.noise
    const yOffset = Math.floor(
      noise.get(x / noise.gap, z / noise.gap, noise.seed) * noise.amp
    )

    if (y > 30 + yOffset) {
      return
    }

    const stoneOffset =
      noise.get(x / noise.stoneGap, z / noise.stoneGap, noise.stoneSeed) *
      noise.stoneAmp

    let type: BlockType

    if (stoneOffset > noise.stoneThreshold || y < 23) {
      type = BlockType.stone
    } else {
      if (yOffset < -3) {
        type = BlockType.sand
      } else {
        type = BlockType.dirt
      }
    }

    this.buildBlock(new THREE.Vector3(x, y - 1, z), type)
    this.buildBlock(new THREE.Vector3(x, y + 1, z), type)
    this.buildBlock(new THREE.Vector3(x - 1, y, z), type)
    this.buildBlock(new THREE.Vector3(x + 1, y, z), type)
    this.buildBlock(new THREE.Vector3(x, y, z - 1), type)
    this.buildBlock(new THREE.Vector3(x, y, z + 1), type)
  }

  buildBlock = (position: THREE.Vector3, type: BlockType, ignoreHeightCheck = false) => {
    const noise = this.noise

    // check if it's natural terrain (unless ignoreHeightCheck is true for structures)
    if (!ignoreHeightCheck) {
      const yOffset = Math.floor(
        noise.get(position.x / noise.gap, position.z / noise.gap, noise.seed) *
          noise.amp
      )
      if (position.y >= 30 + yOffset || position.y < 0) {
        return
      }
    }

    position.y === 0 && (type = BlockType.bedrock)

    // check custom blocks
    for (const block of this.customBlocks) {
      if (
        block.x === position.x &&
        block.y === position.y &&
        block.z === position.z
      ) {
        return
      }
    }

    // build block
    this.customBlocks.push(
      new Block(position.x, position.y, position.z, type, true)
    )

    // Store block type in chunk
    const worldToChunk = this.chunkManager.worldToChunk(
      Math.floor(position.x),
      Math.floor(position.y),
      Math.floor(position.z)
    )
    const chunk = this.chunkManager.getChunk(worldToChunk.chunkX, worldToChunk.chunkZ)
    chunk.setBlockType(worldToChunk.localX, worldToChunk.localY, worldToChunk.localZ, type)

    // Mark chunk and neighbors dirty for mesh rebuild
    this.chunkMeshManager.markDirty(worldToChunk.chunkX, worldToChunk.chunkZ, 'block')

    // Check if near chunk boundary (mark neighbors)
    if (worldToChunk.localX === 0) this.chunkMeshManager.markDirty(worldToChunk.chunkX - 1, worldToChunk.chunkZ, 'block')
    if (worldToChunk.localX === 23) this.chunkMeshManager.markDirty(worldToChunk.chunkX + 1, worldToChunk.chunkZ, 'block')
    if (worldToChunk.localZ === 0) this.chunkMeshManager.markDirty(worldToChunk.chunkX, worldToChunk.chunkZ - 1, 'block')
    if (worldToChunk.localZ === 23) this.chunkMeshManager.markDirty(worldToChunk.chunkX, worldToChunk.chunkZ + 1, 'block')

    // Trigger light update if block emits light
    const blockDef = blockRegistry.get(type)
    if (blockDef && (blockDef.emissive.r > 0 || blockDef.emissive.g > 0 || blockDef.emissive.b > 0)) {
      this.lightingEngine.addLightSource(
        Math.floor(position.x),
        Math.floor(position.y),
        Math.floor(position.z),
        blockDef.emissive
      )
    }
  }

  /**
   * Get block type at world coordinates
   * Returns -1 if out of bounds or air
   */
  getBlockTypeAt(x: number, y: number, z: number): number {
    // Check customBlocks first (player-placed)
    const custom = this.customBlocks.find(b =>
      Math.floor(b.x) === Math.floor(x) &&
      Math.floor(b.y) === Math.floor(y) &&
      Math.floor(b.z) === Math.floor(z)
    )

    if (custom) {
      return custom.placed ? custom.type : -1  // Return type if placed, -1 if removed
    }

    // Check generated terrain using noise
    const height = 30 + this.noise.get(x / this.noise.gap, z / this.noise.gap) * this.noise.amp

    if (y > height) return -1  // Air
    if (y === Math.floor(height)) return BlockType.grass  // Surface
    if (y < height) return BlockType.stone  // Underground

    return -1
  }

  update = () => {
    this.chunk.set(
      Math.floor(this.camera.position.x / this.chunkSize),
      Math.floor(this.camera.position.z / this.chunkSize)
    )

    //generate terrain when getting into new chunk
    if (
      this.chunk.x !== this.previousChunk.x ||
      this.chunk.y !== this.previousChunk.y
    ) {
      this.generate()
    }

    // Propagate lighting
    this.lightingEngine.update()

    // Check which chunks had lighting changes
    const chunks = this.chunkManager.getAllChunks()
    for (const chunk of chunks) {
      if (chunk.dirty) {
        // Lighting changed - mark for mesh rebuild
        this.chunkMeshManager.markDirty(chunk.x, chunk.z, 'light')
        chunk.dirty = false  // Clear flag
      }
    }

    // Update chunk meshes (rebuilds dirty chunks)
    this.chunkMeshManager.update(this.chunkManager)

    this.previousChunk.copy(this.chunk)
    this.highlight.update()
  }
}
