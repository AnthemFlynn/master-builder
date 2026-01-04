// src/shared/domain/ChunkColumn.ts
import { ChunkCoordinate } from './ChunkCoordinate'
import { ChunkSection } from './ChunkSection'
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  CHUNK_HEIGHT,
  SECTION_HEIGHT,
  SECTIONS_PER_CHUNK,
  BLOCKS_PER_SECTION
} from '../constants/ChunkConstants'

/**
 * ChunkColumn - A vertical column of 24 ChunkSections (16x16x384)
 *
 * Minecraft 1.18+ standard chunk format with vertical sectioning.
 * Maintains backward-compatible API with the original ChunkData class.
 *
 * Benefits over flat array:
 * - Skip meshing empty sections (all air)
 * - Frustum cull per section
 * - Lazy allocation of sections (sparse chunks use less memory)
 * - Better cache locality for vertical operations
 */
export class ChunkColumn {
  readonly coord: ChunkCoordinate
  readonly size: number = CHUNK_WIDTH    // 16
  readonly depth: number = CHUNK_DEPTH   // 16
  readonly height: number = CHUNK_HEIGHT // 384

  /**
   * 24 vertical sections, lazily allocated
   * Index 0 = Y 0-15, Index 1 = Y 16-31, etc.
   */
  private sections: (ChunkSection | null)[]

  /**
   * Sparse metadata for complex blocks (Chests, Signs, etc.)
   */
  private metadata: Map<number, any>

  /**
   * Cached buffer for getSharedBuffer() - avoids 400KB allocation per call
   * Invalidated when any block/light changes
   */
  private cachedBuffer: ArrayBuffer | null = null
  private bufferDirty: boolean = true

  /**
   * Cached native buffer for serializeNative() - avoids serialization overhead
   * Uses same dirty flag as cachedBuffer since both depend on block/light data
   */
  private cachedNativeBuffer: ArrayBuffer | null = null

  constructor(coord: ChunkCoordinate, buffer?: ArrayBuffer, metadata?: Map<number, any>) {
    this.coord = coord
    this.sections = new Array(SECTIONS_PER_CHUNK).fill(null)
    this.metadata = metadata || new Map()

    if (buffer) {
      this.setBuffer(buffer)
    }
  }

  /**
   * Get or create section at index
   */
  private getOrCreateSection(sectionIndex: number): ChunkSection {
    if (!this.sections[sectionIndex]) {
      this.sections[sectionIndex] = new ChunkSection()
    }
    return this.sections[sectionIndex]!
  }

  /**
   * Get section for a world Y coordinate (may be null if not allocated)
   */
  private getSectionForY(y: number): ChunkSection | null {
    const sectionIndex = Math.floor(y / SECTION_HEIGHT)
    if (sectionIndex < 0 || sectionIndex >= SECTIONS_PER_CHUNK) return null
    return this.sections[sectionIndex]
  }

  /**
   * Get local Y within a section (0-15)
   */
  private getLocalY(y: number): number {
    return y % SECTION_HEIGHT
  }

  /**
   * Convert world Y to section index
   */
  private getSectionIndex(y: number): number {
    return Math.floor(y / SECTION_HEIGHT)
  }

  /**
   * Bounds check
   */
  private isOutOfBounds(x: number, y: number, z: number): boolean {
    return x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.depth
  }

  /**
   * Get global block index (for metadata storage)
   */
  private getGlobalIndex(x: number, y: number, z: number): number {
    return x + z * this.size + y * this.size * this.depth
  }

  // === Block ID Access ===

  getBlockId(x: number, y: number, z: number): number {
    if (this.isOutOfBounds(x, y, z)) return 0
    const section = this.getSectionForY(y)
    if (!section) return 0 // Unallocated section = air
    return section.getBlock(x, this.getLocalY(y), z)
  }

  setBlockId(x: number, y: number, z: number, id: number): void {
    if (this.isOutOfBounds(x, y, z)) return
    const sectionIndex = this.getSectionIndex(y)
    const section = this.getOrCreateSection(sectionIndex)
    section.setBlock(x, this.getLocalY(y), z, id)
    this.invalidateCaches()
  }

  // === Light Access ===

  getSkyLight(x: number, y: number, z: number): number {
    if (this.isOutOfBounds(x, y, z)) return 15
    const section = this.getSectionForY(y)
    if (!section) return 15 // Unallocated = full sky light
    return section.getSkyLight(x, this.getLocalY(y), z)
  }

  setSkyLight(x: number, y: number, z: number, light: number): void {
    if (this.isOutOfBounds(x, y, z)) return
    const sectionIndex = this.getSectionIndex(y)
    const section = this.getOrCreateSection(sectionIndex)
    section.setSkyLight(x, this.getLocalY(y), z, light)
    this.invalidateCaches()
  }

  getBlockLight(x: number, y: number, z: number): { r: number; g: number; b: number } {
    if (this.isOutOfBounds(x, y, z)) return { r: 0, g: 0, b: 0 }
    const section = this.getSectionForY(y)
    if (!section) return { r: 0, g: 0, b: 0 }
    return section.getBlockLight(x, this.getLocalY(y), z)
  }

  setBlockLight(x: number, y: number, z: number, r: number, g: number, b: number): void {
    if (this.isOutOfBounds(x, y, z)) return
    const sectionIndex = this.getSectionIndex(y)
    const section = this.getOrCreateSection(sectionIndex)
    section.setBlockLight(x, this.getLocalY(y), z, r, g, b)
    this.invalidateCaches()
  }

  /**
   * Invalidate all cached buffers when chunk data changes
   * Called by setBlockId, setSkyLight, setBlockLight
   */
  private invalidateCaches(): void {
    this.bufferDirty = true
    this.cachedNativeBuffer = null
  }

  // === Metadata Access ===

  getBlockMetadata(x: number, y: number, z: number): any | undefined {
    if (this.isOutOfBounds(x, y, z)) return undefined
    return this.metadata.get(this.getGlobalIndex(x, y, z))
  }

  setBlockMetadata(x: number, y: number, z: number, meta: any): void {
    if (this.isOutOfBounds(x, y, z)) return
    const index = this.getGlobalIndex(x, y, z)
    if (meta === undefined || meta === null) {
      this.metadata.delete(index)
    } else {
      this.metadata.set(index, meta)
    }
  }

  getMetadata(): Map<number, any> {
    return this.metadata
  }

  // === Section Access (for optimization) ===

  /**
   * Get section at index (0-23)
   */
  getSection(index: number): ChunkSection | null {
    if (index < 0 || index >= SECTIONS_PER_CHUNK) return null
    return this.sections[index]
  }

  /**
   * Check if section is empty (for culling)
   */
  isSectionEmpty(index: number): boolean {
    const section = this.sections[index]
    return !section || section.isEmpty
  }

  /**
   * Check if section needs remeshing
   */
  isSectionDirty(index: number): boolean {
    const section = this.sections[index]
    return !section || section.isDirty
  }

  /**
   * Get all non-empty section indices
   */
  getNonEmptySections(): number[] {
    const result: number[] = []
    for (let i = 0; i < SECTIONS_PER_CHUNK; i++) {
      if (this.sections[i] && !this.sections[i]!.isEmpty) {
        result.push(i)
      }
    }
    return result
  }

  // === Buffer Serialization (backward compatibility with ChunkData) ===

  /**
   * Get raw buffer - ALLOCATES NEW 400KB BUFFER EVERY CALL
   * @deprecated Use getSharedBuffer() for read-only access to avoid memory churn
   */
  getRawBuffer(): ArrayBuffer {
    return this.buildBuffer()
  }

  /**
   * Get shared buffer for read-only access (Physics, Meshing neighbors)
   * Returns cached buffer, only rebuilds when chunk data changes.
   * WARNING: Do not modify the returned buffer - it's shared!
   */
  getSharedBuffer(): ArrayBuffer {
    if (this.bufferDirty || !this.cachedBuffer) {
      this.cachedBuffer = this.buildBuffer()
      this.bufferDirty = false
    }
    return this.cachedBuffer
  }

  /**
   * Internal: Build the flat buffer representation
   */
  private buildBuffer(): ArrayBuffer {
    const length = this.size * this.depth * this.height
    const buffer = new ArrayBuffer(length * 4)
    const data = new Uint32Array(buffer)

    for (let y = 0; y < this.height; y++) {
      const sectionIndex = this.getSectionIndex(y)
      const section = this.sections[sectionIndex]
      const localY = this.getLocalY(y)

      for (let z = 0; z < this.depth; z++) {
        for (let x = 0; x < this.size; x++) {
          const globalIndex = x + z * this.size + y * this.size * this.depth

          if (!section) {
            // Unallocated section: air with full sky light
            data[globalIndex] = 0x000F0000 // sky=15, all else 0
          } else {
            const blockId = section.getBlock(x, localY, z)
            const skyLight = section.getSkyLight(x, localY, z)
            const blockLight = section.getBlockLight(x, localY, z)

            // Pack into Uint32: [0-15] blockID, [16-19] sky, [20-23] R, [24-27] G, [28-31] B
            data[globalIndex] =
              (blockId & 0xFFFF) |
              ((skyLight & 0xF) << 16) |
              ((blockLight.r & 0xF) << 20) |
              ((blockLight.g & 0xF) << 24) |
              ((blockLight.b & 0xF) << 28)
          }
        }
      }
    }

    return buffer
  }

  /**
   * Set data from ChunkData-compatible buffer (Uint32Array)
   */
  setBuffer(buffer: ArrayBuffer): void {
    const length = this.size * this.depth * this.height
    if (buffer.byteLength !== length * 4) {
      throw new Error(`Invalid buffer size. Expected ${length * 4}, got ${buffer.byteLength}`)
    }

    const data = new Uint32Array(buffer)

    for (let y = 0; y < this.height; y++) {
      const sectionIndex = this.getSectionIndex(y)
      const localY = this.getLocalY(y)

      for (let z = 0; z < this.depth; z++) {
        for (let x = 0; x < this.size; x++) {
          const globalIndex = x + z * this.size + y * this.size * this.depth
          const val = data[globalIndex]

          const blockId = val & 0xFFFF
          const skyLight = (val >> 16) & 0xF
          const r = (val >> 20) & 0xF
          const g = (val >> 24) & 0xF
          const b = (val >> 28) & 0xF

          // Only allocate section if we have non-air data
          if (blockId !== 0 || skyLight !== 15 || r !== 0 || g !== 0 || b !== 0) {
            const section = this.getOrCreateSection(sectionIndex)
            section.setBlock(x, localY, z, blockId)
            section.setSkyLight(x, localY, z, skyLight)
            section.setBlockLight(x, localY, z, r, g, b)
          }
        }
      }
    }

    // Cache the buffer we just loaded (avoid rebuilding on first getSharedBuffer call)
    this.cachedBuffer = buffer.slice(0)  // Clone to ensure we own it
    this.bufferDirty = false
  }

  // === Native Section Serialization (more efficient) ===

  /**
   * Serialize to native section format (cached computation, fresh buffer)
   * Format: [sectionCount][sectionIndex, sectionData]...
   *
   * Caches the serialized data internally but returns a copy each call.
   * This avoids the expensive serialization work while supporting transfer
   * to workers (transferred ArrayBuffers become detached).
   *
   * Performance: First call builds cache (~1-2ms), subsequent calls just copy (~0.1ms)
   */
  serializeNative(): ArrayBuffer {
    // Build cache if not available
    if (!this.cachedNativeBuffer) {
      this.cachedNativeBuffer = this.buildNativeBuffer()
    }

    // Return a copy (required because callers may transfer the buffer to workers)
    return this.cachedNativeBuffer.slice(0)
  }

  /**
   * Internal: Build the native section format buffer
   */
  private buildNativeBuffer(): ArrayBuffer {
    const nonEmptySections = this.getNonEmptySections()
    const sectionDataSize = BLOCKS_PER_SECTION * 4 // 2 bytes blocks + 2 bytes light

    // Header: 4 bytes for section count
    // Per section: 4 bytes index + sectionDataSize bytes data
    const totalSize = 4 + nonEmptySections.length * (4 + sectionDataSize)
    const buffer = new ArrayBuffer(totalSize)
    const view = new DataView(buffer)

    view.setUint32(0, nonEmptySections.length, true)

    let offset = 4
    for (const sectionIndex of nonEmptySections) {
      const section = this.sections[sectionIndex]!
      view.setUint32(offset, sectionIndex, true)
      offset += 4

      const sectionBuffer = section.serialize()
      new Uint8Array(buffer, offset, sectionDataSize).set(new Uint8Array(sectionBuffer))
      offset += sectionDataSize
    }

    return buffer
  }

  /**
   * Deserialize from native section format
   */
  static deserializeNative(coord: ChunkCoordinate, buffer: ArrayBuffer): ChunkColumn {
    const column = new ChunkColumn(coord)
    const view = new DataView(buffer)

    const sectionCount = view.getUint32(0, true)
    const sectionDataSize = BLOCKS_PER_SECTION * 4

    let offset = 4
    for (let i = 0; i < sectionCount; i++) {
      const sectionIndex = view.getUint32(offset, true)
      offset += 4

      const sectionBuffer = buffer.slice(offset, offset + sectionDataSize)
      column.sections[sectionIndex] = ChunkSection.deserialize(sectionBuffer)
      offset += sectionDataSize
    }

    return column
  }
}

// Re-export as ChunkData for backward compatibility
export { ChunkColumn as ChunkData }
