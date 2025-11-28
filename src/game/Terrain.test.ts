import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import Terrain from './Terrain';
import Materials, { MaterialType } from './Materials';

describe('Terrain', () => {
  let scene: THREE.Scene;
  let materials: Materials;
  let terrain: Terrain;

  beforeEach(() => {
    scene = new THREE.Scene();
    materials = new Materials();
    terrain = new Terrain(scene, materials);
  });

  afterEach(() => {
    terrain.dispose();
    materials.dispose();
  });

  describe('initialization', () => {
    it('should create terrain with correct size', () => {
      expect(terrain.getTerrainSize()).toBe(128);
    });

    it('should create terrain with correct base height', () => {
      expect(terrain.getBaseHeight()).toBe(30);
    });

    it('should create instanced mesh', () => {
      const mesh = terrain.getMesh();
      expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
    });

    it('should add terrain mesh to scene', () => {
      const mesh = terrain.getMesh();
      expect(scene.children).toContain(mesh);
    });

    it('should create mesh with correct instance count', () => {
      const mesh = terrain.getMesh();
      const expectedCount = 128 * 128;
      expect(mesh.count).toBe(expectedCount);
    });

    it('should enable shadow casting on mesh', () => {
      const mesh = terrain.getMesh();
      expect(mesh.castShadow).toBe(true);
    });

    it('should enable shadow receiving on mesh', () => {
      const mesh = terrain.getMesh();
      expect(mesh.receiveShadow).toBe(true);
    });

    it('should use Cobblestone material', () => {
      const mesh = terrain.getMesh();
      const expectedMaterial = materials.get(MaterialType.Cobblestone);
      expect(mesh.material).toBe(expectedMaterial);
    });

    it('should generate height map entries', () => {
      // Test a few positions to verify height map is populated
      const height1 = terrain.getHeightAt(0, 0);
      const height2 = terrain.getHeightAt(10, 10);

      expect(typeof height1).toBe('number');
      expect(typeof height2).toBe('number');
    });
  });

  describe('getHeightAt', () => {
    it('should return valid height for center position', () => {
      const height = terrain.getHeightAt(0, 0);
      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThanOrEqual(0);
    });

    it('should return valid height for positive coordinates', () => {
      const height = terrain.getHeightAt(20, 30);
      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThanOrEqual(0);
    });

    it('should return valid height for negative coordinates', () => {
      const height = terrain.getHeightAt(-20, -30);
      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThanOrEqual(0);
    });

    it('should round coordinates to nearest integer', () => {
      const height1 = terrain.getHeightAt(10.4, 20.3);
      const height2 = terrain.getHeightAt(10.6, 20.7);

      // Both should return height at (10, 20) and (11, 21) respectively
      expect(height1).toBe(terrain.getHeightAt(10, 20));
      expect(height2).toBe(terrain.getHeightAt(11, 21));
    });

    it('should return base height for out-of-bounds coordinates', () => {
      const height = terrain.getHeightAt(1000, 1000);
      expect(height).toBe(terrain.getBaseHeight());
    });

    it('should be deterministic for same coordinates', () => {
      const x = 15;
      const z = 25;
      const height1 = terrain.getHeightAt(x, z);
      const height2 = terrain.getHeightAt(x, z);
      const height3 = terrain.getHeightAt(x, z);

      expect(height1).toBe(height2);
      expect(height2).toBe(height3);
    });

    it('should generate varied heights across terrain', () => {
      const heights = new Set<number>();

      for (let x = -30; x < 30; x += 10) {
        for (let z = -30; z < 30; z += 10) {
          heights.add(terrain.getHeightAt(x, z));
        }
      }

      // Should have some variation in terrain heights
      expect(heights.size).toBeGreaterThan(1);
    });

    it('should generate heights within reasonable range', () => {
      const baseHeight = terrain.getBaseHeight();
      const heights: number[] = [];

      for (let x = -50; x < 50; x += 10) {
        for (let z = -50; z < 50; z += 10) {
          heights.push(terrain.getHeightAt(x, z));
        }
      }

      // All heights should be within base +/- amplitude range
      heights.forEach(height => {
        expect(height).toBeGreaterThanOrEqual(baseHeight - 10);
        expect(height).toBeLessThanOrEqual(baseHeight + 10);
      });
    });
  });

  describe('isWithinBounds', () => {
    it('should return true for center position', () => {
      expect(terrain.isWithinBounds(0, 0)).toBe(true);
    });

    it('should return true for positions within bounds', () => {
      expect(terrain.isWithinBounds(10, 10)).toBe(true);
      expect(terrain.isWithinBounds(-10, -10)).toBe(true);
      expect(terrain.isWithinBounds(30, 30)).toBe(true);
      expect(terrain.isWithinBounds(-30, -30)).toBe(true);
    });

    it('should return true for edge positions (just inside)', () => {
      const halfSize = terrain.getTerrainSize() / 2;
      expect(terrain.isWithinBounds(halfSize - 1, 0)).toBe(true);
      expect(terrain.isWithinBounds(-halfSize + 1, 0)).toBe(true);
      expect(terrain.isWithinBounds(0, halfSize - 1)).toBe(true);
      expect(terrain.isWithinBounds(0, -halfSize + 1)).toBe(true);
    });

    it('should return false for positions outside bounds', () => {
      const halfSize = terrain.getTerrainSize() / 2;
      expect(terrain.isWithinBounds(halfSize + 10, 0)).toBe(false);
      expect(terrain.isWithinBounds(-halfSize - 10, 0)).toBe(false);
      expect(terrain.isWithinBounds(0, halfSize + 10)).toBe(false);
      expect(terrain.isWithinBounds(0, -halfSize - 10)).toBe(false);
    });

    it('should return false for far out-of-bounds positions', () => {
      expect(terrain.isWithinBounds(1000, 1000)).toBe(false);
      expect(terrain.isWithinBounds(-1000, -1000)).toBe(false);
    });

    it('should handle fractional coordinates', () => {
      expect(terrain.isWithinBounds(10.5, 20.7)).toBe(true);
      expect(terrain.isWithinBounds(-10.3, -20.9)).toBe(true);
    });

    it('should return false if either coordinate is out of bounds', () => {
      const halfSize = terrain.getTerrainSize() / 2;
      expect(terrain.isWithinBounds(halfSize + 1, 0)).toBe(false);
      expect(terrain.isWithinBounds(0, halfSize + 1)).toBe(false);
    });
  });

  describe('terrain generation', () => {
    it('should generate terrain blocks for entire area', () => {
      const mesh = terrain.getMesh();
      const terrainSize = terrain.getTerrainSize();
      const totalBlocks = terrainSize * terrainSize;

      expect(mesh.count).toBe(totalBlocks);
    });

    it('should position blocks according to noise-based heights', () => {
      const mesh = terrain.getMesh();
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();

      // Sample a few blocks to verify they're positioned correctly
      const sampleIndices = [0, 100, 1000, 5000];

      sampleIndices.forEach(index => {
        mesh.getMatrixAt(index, matrix);
        position.setFromMatrixPosition(matrix);

        const height = terrain.getHeightAt(position.x, position.z);
        expect(position.y).toBe(height);
      });
    });

    it('should create centered terrain grid', () => {
      const mesh = terrain.getMesh();
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const halfSize = terrain.getTerrainSize() / 2;

      // Check first block (should be at -halfSize, -halfSize)
      mesh.getMatrixAt(0, matrix);
      position.setFromMatrixPosition(matrix);

      expect(Math.abs(position.x)).toBeLessThanOrEqual(halfSize);
      expect(Math.abs(position.z)).toBeLessThanOrEqual(halfSize);
    });

    it('should have varied heights across terrain', () => {
      const mesh = terrain.getMesh();
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const heights = new Set<number>();

      // Sample heights across the terrain
      for (let i = 0; i < mesh.count; i += 1000) {
        mesh.getMatrixAt(i, matrix);
        position.setFromMatrixPosition(matrix);
        heights.add(position.y);
      }

      // Should have varied heights
      expect(heights.size).toBeGreaterThan(1);
    });
  });

  describe('integration with Noise', () => {
    it('should use Noise class for height generation', () => {
      // Create multiple terrain instances and verify they use noise
      const terrain1 = new Terrain(scene, materials);
      const terrain2 = new Terrain(scene, materials);

      // Heights should vary (due to different noise seeds)
      const height1 = terrain1.getHeightAt(10, 10);
      const height2 = terrain2.getHeightAt(10, 10);

      // Both should be valid heights
      expect(typeof height1).toBe('number');
      expect(typeof height2).toBe('number');

      terrain1.dispose();
      terrain2.dispose();
    });

    it('should generate smooth terrain transitions', () => {
      const heights: number[] = [];

      // Sample heights along a line
      for (let x = 0; x < 20; x++) {
        heights.push(terrain.getHeightAt(x, 0));
      }

      // Check that adjacent heights don't vary too wildly
      for (let i = 0; i < heights.length - 1; i++) {
        const diff = Math.abs(heights[i + 1] - heights[i]);
        // Adjacent blocks should typically differ by less than the full amplitude
        expect(diff).toBeLessThanOrEqual(8);
      }
    });
  });

  describe('dispose', () => {
    it('should remove mesh from scene', () => {
      const mesh = terrain.getMesh();
      expect(scene.children).toContain(mesh);

      terrain.dispose();

      expect(scene.children).not.toContain(mesh);
    });

    it('should dispose geometry', () => {
      const mesh = terrain.getMesh();
      const geometry = mesh.geometry;

      const disposeSpy = { called: false };
      const originalDispose = geometry.dispose.bind(geometry);
      geometry.dispose = () => {
        disposeSpy.called = true;
        originalDispose();
      };

      terrain.dispose();

      expect(disposeSpy.called).toBe(true);
    });

    it('should clear height map', () => {
      // Verify height map has data
      expect(terrain.getHeightAt(0, 0)).toBeGreaterThanOrEqual(0);

      terrain.dispose();

      // After disposal, out-of-bounds should return base height
      expect(terrain.getHeightAt(0, 0)).toBe(terrain.getBaseHeight());
    });
  });

  describe('memory and performance', () => {
    it('should create single instanced mesh for entire terrain', () => {
      // Should only be one mesh in the scene for terrain
      const terrainMeshes = scene.children.filter(
        child => child instanceof THREE.InstancedMesh
      );

      expect(terrainMeshes.length).toBe(1);
    });

    it('should generate terrain quickly', () => {
      const start = performance.now();

      const testTerrain = new Terrain(scene, materials);

      const end = performance.now();
      const duration = end - start;

      // Terrain generation should be reasonably fast (< 500ms for 128x128)
      expect(duration).toBeLessThan(500);

      testTerrain.dispose();
    });

    it('should handle height queries efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        const x = Math.floor(Math.random() * 128) - 64;
        const z = Math.floor(Math.random() * 128) - 64;
        terrain.getHeightAt(x, z);
      }

      const end = performance.now();
      const duration = end - start;

      // 10000 height queries should be very fast (< 50ms)
      expect(duration).toBeLessThan(50);
    });

    it('should handle bounds checks efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        const x = Math.floor(Math.random() * 200) - 100;
        const z = Math.floor(Math.random() * 200) - 100;
        terrain.isWithinBounds(x, z);
      }

      const end = performance.now();
      const duration = end - start;

      // 10000 bounds checks should be very fast (< 20ms)
      expect(duration).toBeLessThan(20);
    });
  });

  describe('edge cases', () => {
    it('should handle exact boundary positions', () => {
      const halfSize = terrain.getTerrainSize() / 2;

      // Just inside bounds
      expect(terrain.isWithinBounds(halfSize - 1, halfSize - 1)).toBe(true);

      // At exact boundary (should be outside)
      expect(terrain.isWithinBounds(halfSize, halfSize)).toBe(false);
    });

    it('should handle negative zero coordinates', () => {
      const height1 = terrain.getHeightAt(0, 0);
      const height2 = terrain.getHeightAt(-0, -0);

      expect(height1).toBe(height2);
    });

    it('should handle very large out-of-bounds coordinates', () => {
      expect(terrain.getHeightAt(Number.MAX_SAFE_INTEGER, 0)).toBe(terrain.getBaseHeight());
      expect(terrain.isWithinBounds(Number.MAX_SAFE_INTEGER, 0)).toBe(false);
    });

    it('should handle negative coordinates symmetrically', () => {
      const posHeight = terrain.getHeightAt(10, 10);
      const negHeight = terrain.getHeightAt(-10, -10);

      // Both should be valid heights (though likely different)
      expect(typeof posHeight).toBe('number');
      expect(typeof negHeight).toBe('number');
    });
  });

  describe('building support', () => {
    it('should provide height information for block placement', () => {
      const x = 10;
      const z = 15;
      const height = terrain.getHeightAt(x, z);

      // Height should be valid for placing blocks on top
      expect(height).toBeGreaterThan(0);
      expect(Number.isInteger(height)).toBe(true);
    });

    it('should validate building locations with bounds checking', () => {
      // Valid building location
      expect(terrain.isWithinBounds(0, 0)).toBe(true);

      // Invalid building location
      expect(terrain.isWithinBounds(1000, 1000)).toBe(false);
    });

    it('should provide consistent height for repeated queries', () => {
      const x = 25;
      const z = 35;

      const heights = Array.from({ length: 10 }, () => terrain.getHeightAt(x, z));

      // All heights should be identical
      const allSame = heights.every(h => h === heights[0]);
      expect(allSame).toBe(true);
    });
  });
});
