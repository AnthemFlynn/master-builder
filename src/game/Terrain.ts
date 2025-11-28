import * as THREE from 'three';
import Noise from './Noise';
import Materials, { MaterialType } from './Materials';

export default class Terrain {
  private scene: THREE.Scene;
  private materials: Materials;
  private noise: Noise;

  // Terrain mesh using InstancedMesh
  private terrainMesh!: THREE.InstancedMesh;
  private terrainSize = 128; // 128x128 block area
  private baseHeight = 30; // Base Y level

  // Track terrain heights for each x,z position
  private heightMap: Map<string, number>;

  constructor(scene: THREE.Scene, materials: Materials) {
    this.scene = scene;
    this.materials = materials;
    this.noise = new Noise();
    this.heightMap = new Map();

    this.generateTerrain();
  }

  private generateTerrain(): void {
    // Calculate total blocks needed
    const totalBlocks = this.terrainSize * this.terrainSize;

    // Create instanced mesh for grass blocks
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = this.materials.get(MaterialType.Cobblestone);

    this.terrainMesh = new THREE.InstancedMesh(
      geometry,
      material as THREE.Material,
      totalBlocks
    );
    this.terrainMesh.castShadow = true;
    this.terrainMesh.receiveShadow = true;

    // Generate height-mapped terrain
    const matrix = new THREE.Matrix4();
    let instanceIndex = 0;

    const halfSize = this.terrainSize / 2;

    for (let x = -halfSize; x < halfSize; x++) {
      for (let z = -halfSize; z < halfSize; z++) {
        // Use noise to determine height
        const height = Math.floor(
          this.noise.get(x / this.noise.gap, z / this.noise.gap, this.noise.seed) *
          this.noise.amp
        ) + this.baseHeight;

        // Store height in map
        this.heightMap.set(`${x},${z}`, height);

        // Position block at terrain height
        matrix.setPosition(x, height, z);
        this.terrainMesh.setMatrixAt(instanceIndex++, matrix);
      }
    }

    this.terrainMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.terrainMesh);
  }

  getHeightAt(x: number, z: number): number {
    const roundedX = Math.round(x);
    const roundedZ = Math.round(z);
    return this.heightMap.get(`${roundedX},${roundedZ}`) ?? this.baseHeight;
  }

  isWithinBounds(x: number, z: number): boolean {
    const halfSize = this.terrainSize / 2;
    return Math.abs(x) < halfSize && Math.abs(z) < halfSize;
  }

  getTerrainSize(): number {
    return this.terrainSize;
  }

  getBaseHeight(): number {
    return this.baseHeight;
  }

  getMesh(): THREE.InstancedMesh {
    return this.terrainMesh;
  }

  dispose(): void {
    this.scene.remove(this.terrainMesh);
    this.terrainMesh.geometry.dispose();
    this.heightMap.clear();
  }
}
