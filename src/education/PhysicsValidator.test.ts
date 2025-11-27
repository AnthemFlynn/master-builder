import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import PhysicsValidator from './PhysicsValidator';
import { BlockData } from '../game/BlockManager';
import { MaterialType } from '../game/Materials';

describe('PhysicsValidator', () => {
  let validator: PhysicsValidator;

  beforeEach(async () => {
    validator = new PhysicsValidator();
    await validator.initialize();
  });

  afterEach(() => {
    validator.dispose();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const newValidator = new PhysicsValidator();
      await expect(newValidator.initialize()).resolves.not.toThrow();
      newValidator.dispose();
    });

    it('should allow multiple initializations', async () => {
      const newValidator = new PhysicsValidator();
      await newValidator.initialize();
      await expect(newValidator.initialize()).resolves.not.toThrow();
      newValidator.dispose();
    });
  });

  describe('validateStructure', () => {
    it('should throw error if physics not initialized', async () => {
      const uninitializedValidator = new PhysicsValidator();
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Stone }
      ];

      await expect(
        uninitializedValidator.validateStructure(blocks)
      ).rejects.toThrow('Physics not initialized');
    });

    it('should validate a single grounded block as stable', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Stone }
      ];

      const result = await validator.validateStructure(blocks);

      expect(result.isStable).toBe(true);
      expect(result.failurePoints).toHaveLength(0);
      expect(result.timeToCollapse).toBeUndefined();
    });

    it('should validate a stable tower structure', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Stone }
      ];

      const result = await validator.validateStructure(blocks);

      expect(result.isStable).toBe(true);
      expect(result.failurePoints).toHaveLength(0);
      expect(result.timeToCollapse).toBeUndefined();
    });

    it('should detect unstable floating block', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 5, z: 0 }, materialType: MaterialType.Stone }
      ];

      const result = await validator.validateStructure(blocks);

      expect(result.isStable).toBe(false);
      expect(result.failurePoints.length).toBeGreaterThan(0);
      expect(result.timeToCollapse).toBeDefined();
      expect(result.timeToCollapse).toBeGreaterThan(0);
      expect(result.failurePoints[0]).toEqual({ x: 0, y: 5, z: 0 });
    });

    it('should detect unstable overhanging structure', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 1, y: 1, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 2, y: 2, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 3, y: 3, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 4, y: 4, z: 0 }, materialType: MaterialType.Stone }
      ];

      const result = await validator.validateStructure(blocks);

      // Diagonal structure without proper support should be unstable
      expect(result.isStable).toBe(false);
      expect(result.failurePoints.length).toBeGreaterThan(0);
      expect(result.timeToCollapse).toBeDefined();
    });

    it('should validate stable pyramid structure', async () => {
      const blocks: BlockData[] = [
        // Base layer
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 0, y: 0, z: 1 }, materialType: MaterialType.Stone },
        { position: { x: 1, y: 0, z: 1 }, materialType: MaterialType.Stone },
        // Top layer
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Stone }
      ];

      const result = await validator.validateStructure(blocks);

      expect(result.isStable).toBe(true);
      expect(result.failurePoints).toHaveLength(0);
      expect(result.timeToCollapse).toBeUndefined();
    });

    it('should handle empty block array', async () => {
      const blocks: BlockData[] = [];

      const result = await validator.validateStructure(blocks);

      expect(result.isStable).toBe(true);
      expect(result.failurePoints).toHaveLength(0);
      expect(result.timeToCollapse).toBeUndefined();
    });

    it('should track multiple failure points in unstable structure', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 5, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 5, y: 5, z: 0 }, materialType: MaterialType.Stone },
        { position: { x: 10, y: 5, z: 0 }, materialType: MaterialType.Stone }
      ];

      const result = await validator.validateStructure(blocks);

      expect(result.isStable).toBe(false);
      expect(result.failurePoints.length).toBeGreaterThan(0);
      expect(result.timeToCollapse).toBeDefined();
    });

    it('should detect collapse time within simulation period', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 10, z: 0 }, materialType: MaterialType.Stone }
      ];

      const result = await validator.validateStructure(blocks);

      expect(result.isStable).toBe(false);
      expect(result.timeToCollapse).toBeDefined();
      // Collapse should happen within 5 seconds
      expect(result.timeToCollapse!).toBeLessThanOrEqual(5.0);
      expect(result.timeToCollapse!).toBeGreaterThan(0);
    });

    it('should not modify original block data', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 5, z: 0 }, materialType: MaterialType.Stone }
      ];

      const originalBlocks = JSON.parse(JSON.stringify(blocks));

      await validator.validateStructure(blocks);

      expect(blocks).toEqual(originalBlocks);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      expect(() => validator.dispose()).not.toThrow();
    });

    it('should allow multiple dispose calls', () => {
      validator.dispose();
      expect(() => validator.dispose()).not.toThrow();
    });

    it('should prevent validation after disposal', async () => {
      validator.dispose();

      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Stone }
      ];

      await expect(
        validator.validateStructure(blocks)
      ).rejects.toThrow('Physics not initialized');
    });
  });

  describe('multiple validations', () => {
    it('should support consecutive validations', async () => {
      const blocks1: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Stone }
      ];

      const blocks2: BlockData[] = [
        { position: { x: 0, y: 5, z: 0 }, materialType: MaterialType.Stone }
      ];

      const result1 = await validator.validateStructure(blocks1);
      const result2 = await validator.validateStructure(blocks2);

      expect(result1.isStable).toBe(true);
      expect(result2.isStable).toBe(false);
    });

    it('should clean up bodies between validations', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Stone }
      ];

      // Run multiple validations to ensure cleanup works
      for (let i = 0; i < 5; i++) {
        const result = await validator.validateStructure(blocks);
        expect(result.isStable).toBe(true);
      }
    });
  });
});
