import * as THREE from 'three';
import Materials, { MaterialType } from './Materials';

export interface BlockData {
  position: { x: number; y: number; z: number };
  materialType: MaterialType;
}

export default class BlockManager {
  private instancedMeshes: Map<MaterialType, THREE.InstancedMesh>;
  private blockCounts: Map<MaterialType, number>;
  private materials: Materials;
  private scene: THREE.Scene;
  private maxBlocksPerMaterial = 10000;
  private placedBlocks: BlockData[] = [];
  private onBlockPlaced?: () => void;
  private onBlockRemoved?: () => void;

  constructor(scene: THREE.Scene, materials: Materials, onBlockPlaced?: () => void, onBlockRemoved?: () => void) {
    this.scene = scene;
    this.materials = materials;
    this.onBlockPlaced = onBlockPlaced;
    this.onBlockRemoved = onBlockRemoved;
    this.instancedMeshes = new Map();
    this.blockCounts = new Map();
    this.initializeInstancedMeshes();
  }

  private initializeInstancedMeshes(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    Object.values(MaterialType).forEach(type => {
      if (typeof type === 'number') {
        const material = this.materials.get(type);
        const mesh = new THREE.InstancedMesh(
          geometry,
          material as THREE.Material,
          this.maxBlocksPerMaterial
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.instancedMeshes.set(type, mesh);
        this.blockCounts.set(type, 0);
        this.scene.add(mesh);
      }
    });
  }

  placeBlock(position: { x: number; y: number; z: number }, materialType: MaterialType): void {
    const gridPos = {
      x: Math.round(position.x),
      y: Math.round(position.y),
      z: Math.round(position.z)
    };

    if (this.hasBlockAt(gridPos)) {
      console.warn('Block already exists at', gridPos);
      return;
    }

    const mesh = this.instancedMeshes.get(materialType);
    const count = this.blockCounts.get(materialType) || 0;

    if (!mesh || count >= this.maxBlocksPerMaterial) {
      console.error('Cannot place block: max blocks reached');
      return;
    }

    const matrix = new THREE.Matrix4();
    matrix.setPosition(gridPos.x, gridPos.y, gridPos.z);

    mesh.setMatrixAt(count, matrix);
    mesh.instanceMatrix.needsUpdate = true;

    this.blockCounts.set(materialType, count + 1);

    this.placedBlocks.push({
      position: gridPos,
      materialType
    });

    // Trigger callback
    if (this.onBlockPlaced) {
      this.onBlockPlaced();
    }
  }

  removeBlock(position: { x: number; y: number; z: number }): boolean {
    const gridPos = {
      x: Math.round(position.x),
      y: Math.round(position.y),
      z: Math.round(position.z)
    };

    const blockIndex = this.placedBlocks.findIndex(
      b => b.position.x === gridPos.x &&
           b.position.y === gridPos.y &&
           b.position.z === gridPos.z
    );

    if (blockIndex === -1) return false;

    const block = this.placedBlocks[blockIndex];
    const mesh = this.instancedMeshes.get(block.materialType);

    if (!mesh) return false;

    const zeroMatrix = new THREE.Matrix4();
    zeroMatrix.scale(new THREE.Vector3(0, 0, 0));

    const count = this.blockCounts.get(block.materialType) || 0;
    mesh.setMatrixAt(count - 1, zeroMatrix);
    mesh.instanceMatrix.needsUpdate = true;

    this.placedBlocks.splice(blockIndex, 1);
    this.blockCounts.set(block.materialType, count - 1);

    // Trigger callback
    if (this.onBlockRemoved) {
      this.onBlockRemoved();
    }

    return true;
  }

  hasBlockAt(position: { x: number; y: number; z: number }): boolean {
    return this.placedBlocks.some(
      b => b.position.x === position.x &&
           b.position.y === position.y &&
           b.position.z === position.z
    );
  }

  getBlocks(): BlockData[] {
    return [...this.placedBlocks];
  }

  getAllMeshes(): THREE.InstancedMesh[] {
    return Array.from(this.instancedMeshes.values());
  }

  dispose(): void {
    this.instancedMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    });
  }
}
