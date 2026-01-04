// src/shared/domain/ChunkSection.ts
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  SECTION_HEIGHT,
  BLOCKS_PER_SECTION
} from '../constants/ChunkConstants'
import { BlockType } from '../../modules/world/domain/BlockType'

/**
 * ChunkSection - A 16x16x16 vertical slice of a chunk column
 *
 * Minecraft-style vertical subdivision enables:
 * - Frustum culling per section (skip sections above/below camera)
 * - Skip meshing empty sections (all air)
 * - Sparse storage for mostly-empty chunks
 * - Efficient light propagation per section
 *
 * Data Layout:
 * - blocks: Uint16Array[4096] - 12-bit block ID + 4-bit metadata
 * - light: Uint16Array[4096] - 4-bit sky + 4-bit R + 4-bit G + 4-bit B
 */
export class ChunkSection {
  /**
   * Block data: 4096 entries (16x16x16)
   * Each entry is a Uint16 containing:
   * - bits 0-11: block type ID (0-4095)
   * - bits 12-15: block metadata/state (0-15)
   */
  private blocks: Uint16Array

  /**
   * Light data: 4096 entries
   * Each entry is a Uint16 containing:
   * - bits 0-3: block light blue (0-15)
   * - bits 4-7: block light green (0-15)
   * - bits 8-11: block light red (0-15)
   * - bits 12-15: sky light (0-15)
   */
  private light: Uint16Array

  /**
   * Track if section is empty (all air) for fast culling
   */
  private _isEmpty: boolean = true

  /**
   * Track if section needs remeshing
   */
  private _isDirty: boolean = true

  /**
   * Non-air block count for isEmpty tracking
   */
  private nonAirCount: number = 0

  // Bit masks for light
  static readonly LIGHT_B_MASK = 0x000F
  static readonly LIGHT_G_MASK = 0x00F0
  static readonly LIGHT_R_MASK = 0x0F00
  static readonly LIGHT_SKY_MASK = 0xF000

  // Bit shifts for light
  static readonly LIGHT_B_SHIFT = 0
  static readonly LIGHT_G_SHIFT = 4
  static readonly LIGHT_R_SHIFT = 8
  static readonly LIGHT_SKY_SHIFT = 12

  constructor() {
    this.blocks = new Uint16Array(BLOCKS_PER_SECTION)
    this.light = new Uint16Array(BLOCKS_PER_SECTION)
    // Initialize all sky light to max (will be recalculated)
    this.light.fill(0xF000) // sky=15, r=0, g=0, b=0
  }

  /**
   * Get block index from local coordinates (0-15 for each axis)
   * Y-major layout for cache efficiency during vertical operations
   */
  private getIndex(x: number, y: number, z: number): number {
    return x + z * CHUNK_WIDTH + y * CHUNK_WIDTH * CHUNK_DEPTH
  }

  /**
   * Get block type at local coordinates
   */
  getBlock(x: number, y: number, z: number): number {
    return this.blocks[this.getIndex(x, y, z)] & 0x0FFF
  }

  /**
   * Set block type at local coordinates
   */
  setBlock(x: number, y: number, z: number, blockType: number): void {
    const index = this.getIndex(x, y, z)
    const oldBlock = this.blocks[index] & 0x0FFF
    const metadata = this.blocks[index] & 0xF000

    // Update non-air count
    if (oldBlock === BlockType.air && blockType !== BlockType.air) {
      this.nonAirCount++
    } else if (oldBlock !== BlockType.air && blockType === BlockType.air) {
      this.nonAirCount--
    }

    this.blocks[index] = (blockType & 0x0FFF) | metadata
    this._isEmpty = this.nonAirCount === 0
    this._isDirty = true
  }

  /**
   * Get block metadata (0-15)
   */
  getMetadata(x: number, y: number, z: number): number {
    return (this.blocks[this.getIndex(x, y, z)] >> 12) & 0x0F
  }

  /**
   * Set block metadata (0-15)
   */
  setMetadata(x: number, y: number, z: number, metadata: number): void {
    const index = this.getIndex(x, y, z)
    const blockType = this.blocks[index] & 0x0FFF
    this.blocks[index] = blockType | ((metadata & 0x0F) << 12)
    this._isDirty = true
  }

  /**
   * Get sky light at local coordinates (0-15)
   */
  getSkyLight(x: number, y: number, z: number): number {
    return (this.light[this.getIndex(x, y, z)] & ChunkSection.LIGHT_SKY_MASK) >>> ChunkSection.LIGHT_SKY_SHIFT
  }

  /**
   * Set sky light at local coordinates (0-15)
   */
  setSkyLight(x: number, y: number, z: number, level: number): void {
    const index = this.getIndex(x, y, z)
    const current = this.light[index]
    this.light[index] = (current & ~ChunkSection.LIGHT_SKY_MASK) | ((level & 0x0F) << ChunkSection.LIGHT_SKY_SHIFT)
  }

  /**
   * Get block light RGB at local coordinates
   */
  getBlockLight(x: number, y: number, z: number): { r: number; g: number; b: number } {
    const val = this.light[this.getIndex(x, y, z)]
    return {
      r: (val & ChunkSection.LIGHT_R_MASK) >>> ChunkSection.LIGHT_R_SHIFT,
      g: (val & ChunkSection.LIGHT_G_MASK) >>> ChunkSection.LIGHT_G_SHIFT,
      b: (val & ChunkSection.LIGHT_B_MASK) >>> ChunkSection.LIGHT_B_SHIFT
    }
  }

  /**
   * Set block light RGB at local coordinates (each 0-15)
   */
  setBlockLight(x: number, y: number, z: number, r: number, g: number, b: number): void {
    const index = this.getIndex(x, y, z)
    const skyLight = this.light[index] & ChunkSection.LIGHT_SKY_MASK
    this.light[index] = skyLight |
      ((r & 0x0F) << ChunkSection.LIGHT_R_SHIFT) |
      ((g & 0x0F) << ChunkSection.LIGHT_G_SHIFT) |
      ((b & 0x0F) << ChunkSection.LIGHT_B_SHIFT)
  }

  /**
   * Check if section is empty (all air blocks)
   */
  get isEmpty(): boolean {
    return this._isEmpty
  }

  /**
   * Check if section needs remeshing
   */
  get isDirty(): boolean {
    return this._isDirty
  }

  /**
   * Mark section as clean (after meshing)
   */
  markClean(): void {
    this._isDirty = false
  }

  /**
   * Mark section as dirty (needs remeshing)
   */
  markDirty(): void {
    this._isDirty = true
  }

  /**
   * Fill entire section with a block type
   */
  fill(blockType: number): void {
    this.blocks.fill(blockType & 0x0FFF)
    this.nonAirCount = blockType === BlockType.air ? 0 : BLOCKS_PER_SECTION
    this._isEmpty = blockType === BlockType.air
    this._isDirty = true
  }

  /**
   * Get raw block data buffer (for worker transfer)
   */
  getBlockBuffer(): Uint16Array {
    return this.blocks
  }

  /**
   * Get raw light data buffer (for worker transfer)
   */
  getLightBuffer(): Uint16Array {
    return this.light
  }

  /**
   * Create from raw buffers (for worker hydration)
   */
  static fromBuffers(blocks: Uint16Array, light: Uint16Array): ChunkSection {
    const section = new ChunkSection()
    section.blocks.set(blocks)
    section.light.set(light)

    // Recalculate non-air count
    section.nonAirCount = 0
    for (let i = 0; i < BLOCKS_PER_SECTION; i++) {
      if ((section.blocks[i] & 0x0FFF) !== BlockType.air) {
        section.nonAirCount++
      }
    }
    section._isEmpty = section.nonAirCount === 0
    section._isDirty = true

    return section
  }

  /**
   * Serialize to ArrayBuffer for transfer
   * Format: blocks (4096 * 2 bytes) + light (4096 * 2 bytes) = 16384 bytes
   */
  serialize(): ArrayBuffer {
    const buffer = new ArrayBuffer(BLOCKS_PER_SECTION * 4) // 2 bytes blocks + 2 bytes light
    const blockView = new Uint16Array(buffer, 0, BLOCKS_PER_SECTION)
    const lightView = new Uint16Array(buffer, BLOCKS_PER_SECTION * 2, BLOCKS_PER_SECTION)

    blockView.set(this.blocks)
    lightView.set(this.light)

    return buffer
  }

  /**
   * Deserialize from ArrayBuffer
   */
  static deserialize(buffer: ArrayBuffer): ChunkSection {
    const blockView = new Uint16Array(buffer, 0, BLOCKS_PER_SECTION)
    const lightView = new Uint16Array(buffer, BLOCKS_PER_SECTION * 2, BLOCKS_PER_SECTION)

    return ChunkSection.fromBuffers(blockView, lightView)
  }
}
