import * as THREE from 'three'
import { Chunk } from '../Chunk'
import { GreedyMesher } from './GreedyMesher'
import { FaceBuilder } from './FaceBuilder'

/**
 * Manages the visual mesh for one chunk
 */
export class ChunkMesh {
  mesh: THREE.Mesh | null = null

  constructor(
    private chunk: Chunk,
    private scene: THREE.Scene,
    private material: THREE.Material
  ) {}

  /**
   * Build or rebuild the mesh from chunk data
   */
  rebuild(): void {
    const startTime = performance.now()

    // Remove old mesh
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
    }

    // Generate new geometry
    const faceBuilder = new FaceBuilder(this.chunk)
    const mesher = new GreedyMesher(this.chunk)

    mesher.buildMesh(faceBuilder)
    const geometry = faceBuilder.buildGeometry()

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material)

    // Position at chunk world coordinates
    this.mesh.position.set(
      this.chunk.x * 24,
      0,
      this.chunk.z * 24
    )

    this.scene.add(this.mesh)

    const duration = performance.now() - startTime
    console.log(`🔨 Rebuilt chunk (${this.chunk.x}, ${this.chunk.z}) in ${duration.toFixed(2)}ms`)
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      this.mesh = null
    }
  }
}
