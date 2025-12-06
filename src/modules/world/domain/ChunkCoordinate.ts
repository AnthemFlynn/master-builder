// src/modules/world/domain/ChunkCoordinate.ts
export class ChunkCoordinate {
  constructor(
    public readonly x: number,
    public readonly z: number
  ) {}

  equals(other: ChunkCoordinate): boolean {
    return this.x === other.x && this.z === other.z
  }

  toKey(): string {
    return `${this.x},${this.z}`
  }

  static fromKey(key: string): ChunkCoordinate {
    const [x, z] = key.split(',').map(Number)
    return new ChunkCoordinate(x, z)
  }
}
