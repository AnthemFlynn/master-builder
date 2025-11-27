import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import BlockManager from './BlockManager';
import Materials, { MaterialType } from './Materials';

describe('BlockManager', () => {
  let scene: THREE.Scene;
  let materials: Materials;
  let blockManager: BlockManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    materials = new Materials();
    blockManager = new BlockManager(scene, materials);
  });

  afterEach(() => {
    blockManager.dispose();
  });

  it('should initialize with no blocks', () => {
    expect(blockManager.getBlocks()).toHaveLength(0);
  });

  it('should create instanced meshes for each material type', () => {
    const meshes = blockManager.getAllMeshes();
    expect(meshes.length).toBeGreaterThan(0);

    meshes.forEach(mesh => {
      expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
    });
  });

  it('should place a block at grid-aligned position', () => {
    blockManager.placeBlock({ x: 1.4, y: 2.6, z: 3.2 }, MaterialType.OakWood);

    const blocks = blockManager.getBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].position).toEqual({ x: 1, y: 3, z: 3 });
    expect(blocks[0].materialType).toBe(MaterialType.OakWood);
  });

  it('should not place a block if one already exists at position', () => {
    blockManager.placeBlock({ x: 1, y: 2, z: 3 }, MaterialType.OakWood);
    blockManager.placeBlock({ x: 1.2, y: 2.3, z: 3.1 }, MaterialType.Brick);

    const blocks = blockManager.getBlocks();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].materialType).toBe(MaterialType.OakWood);
  });

  it('should place multiple blocks of different materials', () => {
    blockManager.placeBlock({ x: 0, y: 0, z: 0 }, MaterialType.OakWood);
    blockManager.placeBlock({ x: 1, y: 0, z: 0 }, MaterialType.Brick);
    blockManager.placeBlock({ x: 2, y: 0, z: 0 }, MaterialType.Gold);

    const blocks = blockManager.getBlocks();
    expect(blocks).toHaveLength(3);

    const materials = blocks.map(b => b.materialType);
    expect(materials).toContain(MaterialType.OakWood);
    expect(materials).toContain(MaterialType.Brick);
    expect(materials).toContain(MaterialType.Gold);
  });

  it('should check if a block exists at a position', () => {
    expect(blockManager.hasBlockAt({ x: 5, y: 5, z: 5 })).toBe(false);

    blockManager.placeBlock({ x: 5, y: 5, z: 5 }, MaterialType.Cobblestone);

    expect(blockManager.hasBlockAt({ x: 5, y: 5, z: 5 })).toBe(true);
  });

  it('should remove a block at a position', () => {
    blockManager.placeBlock({ x: 10, y: 10, z: 10 }, MaterialType.Sandstone);
    expect(blockManager.hasBlockAt({ x: 10, y: 10, z: 10 })).toBe(true);

    const removed = blockManager.removeBlock({ x: 10, y: 10, z: 10 });

    expect(removed).toBe(true);
    expect(blockManager.hasBlockAt({ x: 10, y: 10, z: 10 })).toBe(false);
    expect(blockManager.getBlocks()).toHaveLength(0);
  });

  it('should return false when removing a non-existent block', () => {
    const removed = blockManager.removeBlock({ x: 99, y: 99, z: 99 });
    expect(removed).toBe(false);
  });

  it('should handle grid snapping when removing blocks', () => {
    blockManager.placeBlock({ x: 7, y: 8, z: 9 }, MaterialType.WhiteMarble);

    // Remove with slightly off coordinates
    const removed = blockManager.removeBlock({ x: 7.3, y: 8.4, z: 9.1 });

    expect(removed).toBe(true);
    expect(blockManager.hasBlockAt({ x: 7, y: 8, z: 9 })).toBe(false);
  });

  it('should add instanced meshes to the scene', () => {
    // BlockManager should add instanced meshes to scene during initialization
    const meshes = blockManager.getAllMeshes();

    expect(meshes.length).toBeGreaterThan(0);

    meshes.forEach(mesh => {
      expect(scene.children).toContain(mesh);
    });
  });

  it('should update instance matrix when placing blocks', () => {
    blockManager.placeBlock({ x: 0, y: 0, z: 0 }, MaterialType.OakWood);

    const meshes = blockManager.getAllMeshes();

    // Verify that at least one mesh has an instance matrix
    const hasInstanceMatrix = meshes.some(m => m.instanceMatrix !== undefined);
    expect(hasInstanceMatrix).toBe(true);

    // Verify the block was actually placed
    expect(blockManager.getBlocks()).toHaveLength(1);
  });

  it('should track blocks correctly after multiple operations', () => {
    // Place several blocks
    blockManager.placeBlock({ x: 0, y: 0, z: 0 }, MaterialType.OakWood);
    blockManager.placeBlock({ x: 1, y: 0, z: 0 }, MaterialType.OakWood);
    blockManager.placeBlock({ x: 2, y: 0, z: 0 }, MaterialType.Brick);

    expect(blockManager.getBlocks()).toHaveLength(3);

    // Remove one
    blockManager.removeBlock({ x: 1, y: 0, z: 0 });
    expect(blockManager.getBlocks()).toHaveLength(2);

    // Add another
    blockManager.placeBlock({ x: 3, y: 0, z: 0 }, MaterialType.Gold);
    expect(blockManager.getBlocks()).toHaveLength(3);
  });

  it('should dispose all meshes and remove from scene', () => {
    // Get initial mesh count
    const meshes = blockManager.getAllMeshes();
    const meshCount = meshes.length;
    expect(meshCount).toBeGreaterThan(0);

    // All meshes should be in the scene initially
    const childrenBeforeDispose = scene.children.length;

    blockManager.dispose();

    // Meshes should be removed from scene
    expect(scene.children.length).toBeLessThan(childrenBeforeDispose);
  });
});
