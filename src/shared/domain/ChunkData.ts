import { ChunkCoordinate } from './ChunkCoordinate'

/**
 * Unified Chunk Data Structure (Bit-Packed + Sparse Metadata)
 * 
 * Bit Layout (Uint32):
 * [0-15]  Block ID (16 bits)
 * [16-19] Sky Light (4 bits)
 * [20-23] Red Light (4 bits)
 * [24-27] Green Light (4 bits)
 * [28-31] Blue Light (4 bits)
 */
export class ChunkData {
  readonly coord: ChunkCoordinate
  readonly size: number = 24
  readonly height: number = 256
  
  // The core data buffer
  private data: Uint32Array
  
  // Sparse metadata for complex blocks (Chests, Signs, etc.)
  private metadata: Map<number, any>

  // Bit Masks
  static readonly ID_MASK = 0xFFFF
  static readonly SKY_MASK = 0xF0000
  static readonly R_MASK = 0xF00000
  static readonly G_MASK = 0xF000000
  static readonly B_MASK = 0xF0000000

  // Bit Shifts
  static readonly SKY_SHIFT = 16
  static readonly R_SHIFT = 20
  static readonly G_SHIFT = 24
  static readonly B_SHIFT = 28

  constructor(coord: ChunkCoordinate, buffer?: ArrayBuffer, metadata?: Map<number, any>) {
    this.coord = coord
    const length = this.size * this.height * this.size
    
    if (buffer) {
      if (buffer.byteLength !== length * 4) {
        throw new Error(`Invalid buffer size. Expected ${length * 4}, got ${buffer.byteLength}`)
      }
      this.data = new Uint32Array(buffer)
    } else {
      this.data = new Uint32Array(length)
    }

    this.metadata = metadata || new Map()
  }

  getRawBuffer(): ArrayBuffer {
    return this.data.buffer
  }

  getMetadata(): Map<number, any> {
    return this.metadata
  }

  setBuffer(buffer: ArrayBuffer): void {
    const length = this.size * this.height * this.size
    if (buffer.byteLength !== length * 4) {
      throw new Error(`Invalid buffer size. Expected ${length * 4}, got ${buffer.byteLength}`)
    }
    this.data = new Uint32Array(buffer)
  }

  private getIndex(x: number, y: number, z: number): number {
    // Y-major standard (x + z*size + y*size*size)
    return x + z * this.size + y * this.size * this.size
  }

  // --- Block ID Access ---

  getBlockId(x: number, y: number, z: number): number {
    if (this.isOutOfBounds(x, y, z)) return 0
    const val = this.data[this.getIndex(x, y, z)]
    return val & ChunkData.ID_MASK
  }

  setBlockId(x: number, y: number, z: number, id: number): void {
    if (this.isOutOfBounds(x, y, z)) return
    const index = this.getIndex(x, y, z)
    const val = this.data[index]
    // Clear ID bits and set new ID
    this.data[index] = (val & ~ChunkData.ID_MASK) | (id & ChunkData.ID_MASK)
  }

  // --- Light Access ---

  getSkyLight(x: number, y: number, z: number): number {
    if (this.isOutOfBounds(x, y, z)) return 15 // Default to full sky if out (or 0?)
    const val = this.data[this.getIndex(x, y, z)]
    return (val & ChunkData.SKY_MASK) >>> ChunkData.SKY_SHIFT
  }

  setSkyLight(x: number, y: number, z: number, light: number): void {
    if (this.isOutOfBounds(x, y, z)) return
    const index = this.getIndex(x, y, z)
    const val = this.data[index]
    this.data[index] = (val & ~ChunkData.SKY_MASK) | ((light & 0xF) << ChunkData.SKY_SHIFT)
  }

  getBlockLight(x: number, y: number, z: number): { r: number, g: number, b: number } {
    if (this.isOutOfBounds(x, y, z)) return { r: 0, g: 0, b: 0 }
    const val = this.data[this.getIndex(x, y, z)]
    return {
      r: (val & ChunkData.R_MASK) >>> ChunkData.R_SHIFT,
      g: (val & ChunkData.G_MASK) >>> ChunkData.G_SHIFT,
      b: (val & ChunkData.B_MASK) >>> ChunkData.B_SHIFT
    }
  }

  setBlockLight(x: number, y: number, z: number, r: number, g: number, b: number): void {
    if (this.isOutOfBounds(x, y, z)) return
    const index = this.getIndex(x, y, z)
    let val = this.data[index]
    val = (val & ~ChunkData.R_MASK) | ((r & 0xF) << ChunkData.R_SHIFT)
    val = (val & ~ChunkData.G_MASK) | ((g & 0xF) << ChunkData.G_SHIFT)
    val = (val & ~ChunkData.B_MASK) | ((b & 0xF) << ChunkData.B_SHIFT)
    this.data[index] = val
  }

  // --- Metadata Access ---

  getBlockMetadata(x: number, y: number, z: number): any | undefined {
    if (this.isOutOfBounds(x, y, z)) return undefined
    return this.metadata.get(this.getIndex(x, y, z))
  }

  setBlockMetadata(x: number, y: number, z: number, meta: any): void {
    if (this.isOutOfBounds(x, y, z)) return
    const index = this.getIndex(x, y, z)
    if (meta === undefined || meta === null) {
      this.metadata.delete(index)
    } else {
      this.metadata.set(index, meta)
    }
  }

  private isOutOfBounds(x: number, y: number, z: number): boolean {
    return x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size
  }
}
