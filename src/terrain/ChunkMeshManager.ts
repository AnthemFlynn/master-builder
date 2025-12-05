import * as THREE from 'three'
import { Chunk } from './Chunk'
import { ChunkMesh } from './mesh/ChunkMesh'

type DirtyReason = 'block' | 'light' | 'global'

/**
 * Manages chunk mesh lifecycle with dirty tracking and rebuild budget
 */
export class ChunkMeshManager {
  private meshes = new Map<string, ChunkMesh>()
  private dirtyChunks = new Map<string, DirtyReason>()
  private rebuildBudgetMs = 3  // ms per frame

  constructor(
    private scene: THREE.Scene,
    private material: THREE.Material
  ) {}

  /**
   * Get or create ChunkMesh for chunk
   */
  getOrCreateMesh(chunk: Chunk): ChunkMesh {
    const key = `${chunk.x},${chunk.z}`

    if (!this.meshes.has(key)) {
      const chunkMesh = new ChunkMesh(chunk, this.scene, this.material)
      this.meshes.set(key, chunkMesh)
    }

    return this.meshes.get(key)!
  }

  /**
   * Mark chunk dirty for rebuild
   */
  markDirty(chunkX: number, chunkZ: number, reason: DirtyReason): void {
    const key = `${chunkX},${chunkZ}`

    // Higher priority overrides lower
    const currentReason = this.dirtyChunks.get(key)
    if (currentReason === 'block') return  // Already highest priority

    this.dirtyChunks.set(key, reason)
  }

  /**
   * Update: rebuild dirty chunks within budget
   */
  update(chunkManager: any): void {
    if (this.dirtyChunks.size === 0) return

    const startTime = performance.now()
    const dirty = Array.from(this.dirtyChunks.entries())

    // Sort by priority
    const priority = { block: 0, light: 1, global: 2 }
    dirty.sort((a, b) => priority[a[1]] - priority[b[1]])

    let rebuilt = 0

    for (const [key, reason] of dirty) {
      // Check budget
      if (performance.now() - startTime > this.rebuildBudgetMs) {
        break
      }

      // Rebuild chunk
      const [x, z] = key.split(',').map(Number)
      const chunk = chunkManager.getChunk(x, z)
      const chunkMesh = this.getOrCreateMesh(chunk)

      chunkMesh.rebuild()

      this.dirtyChunks.delete(key)
      rebuilt++
    }

    if (rebuilt > 0) {
      console.log(`🔨 Rebuilt ${rebuilt} chunks (${this.dirtyChunks.size} remaining)`)
    }
  }

  /**
   * Dispose all meshes
   */
  disposeAll(): void {
    for (const chunkMesh of this.meshes.values()) {
      chunkMesh.dispose()
    }
    this.meshes.clear()
    this.dirtyChunks.clear()
  }
}
