import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ChallengeEngine, { ChallengeRequirement, ValidationResult } from './ChallengeEngine';
import PhysicsValidator from './PhysicsValidator';
import { BlockData } from '../game/BlockManager';
import { MaterialType } from '../game/Materials';

describe('ChallengeEngine', () => {
  let engine: ChallengeEngine;
  let physicsValidator: PhysicsValidator;

  beforeEach(async () => {
    physicsValidator = new PhysicsValidator();
    await physicsValidator.initialize();
    engine = new ChallengeEngine(physicsValidator);
  });

  afterEach(() => {
    physicsValidator.dispose();
  });

  describe('validateChallenge', () => {
    it('should pass with no requirements', async () => {
      const blocks: BlockData[] = [];
      const requirements: ChallengeRequirement[] = [];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.feedback).toContain('No requirements');
    });

    it('should calculate score based on passed requirements', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'blockCount', description: 'Use at least 3 blocks', minBlocks: 3 },
        { type: 'height', description: 'Build at least 3 blocks tall', minHeight: 3 },
        { type: 'materials', description: 'Use brick', requiredMaterials: [MaterialType.Brick] }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(67); // 2 out of 3 passed
    });

    it('should pass all requirements for perfect structure', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'stability', description: 'Build a stable structure', minStability: true },
        { type: 'blockCount', description: 'Use at least 3 blocks', minBlocks: 3 },
        { type: 'height', description: 'Build at least 3 blocks tall', minHeight: 3 },
        { type: 'materials', description: 'Use brick', requiredMaterials: [MaterialType.Brick] }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.feedback).toContain('Excellent work');
    });
  });

  describe('validateStability', () => {
    it('should validate stable structure', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'stability', description: 'Must be stable', minStability: true }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.isStable).toBe(true);
    });

    it('should detect unstable structure', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 10, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'stability', description: 'Must be stable', minStability: true }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.details.isStable).toBe(false);
      expect(result.feedback).toContain('unstable');
    });

    it('should handle empty blocks for stability', async () => {
      const blocks: BlockData[] = [];

      const requirements: ChallengeRequirement[] = [
        { type: 'stability', description: 'Must be stable', minStability: true }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.isStable).toBe(true);
    });
  });

  describe('validateSymmetry', () => {
    it('should validate X-axis symmetry', async () => {
      const blocks: BlockData[] = [
        { position: { x: -1, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'symmetry', description: 'Must be symmetric on X axis', symmetryAxis: 'x' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.symmetricX).toBe(true);
    });

    it('should detect lack of X-axis symmetry', async () => {
      const blocks: BlockData[] = [
        { position: { x: -1, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'symmetry', description: 'Must be symmetric on X axis', symmetryAxis: 'x' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('not symmetrical');
    });

    it('should validate Z-axis symmetry', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: -1 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 0, z: 1 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'symmetry', description: 'Must be symmetric on Z axis', symmetryAxis: 'z' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.symmetricZ).toBe(true);
    });

    it('should validate both axes symmetry', async () => {
      const blocks: BlockData[] = [
        // Center
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
        // X-axis symmetric pairs
        { position: { x: -1, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Brick },
        // Z-axis symmetric pairs
        { position: { x: 0, y: 0, z: -1 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 0, z: 1 }, materialType: MaterialType.Brick },
        // Diagonal corners (all 4 for full symmetry)
        { position: { x: -1, y: 0, z: -1 }, materialType: MaterialType.Brick },
        { position: { x: -1, y: 0, z: 1 }, materialType: MaterialType.Brick },
        { position: { x: 1, y: 0, z: -1 }, materialType: MaterialType.Brick },
        { position: { x: 1, y: 0, z: 1 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'symmetry', description: 'Must be symmetric on both axes', symmetryAxis: 'both' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.symmetricX).toBe(true);
      expect(result.details.symmetricZ).toBe(true);
    });
  });

  describe('validateHeight', () => {
    it('should validate minimum height', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'height', description: 'At least 3 blocks tall', minHeight: 3 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.height).toBe(3);
    });

    it('should fail if below minimum height', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'height', description: 'At least 5 blocks tall', minHeight: 5 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.details.height).toBe(2);
    });

    it('should validate maximum height', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'height', description: 'Maximum 3 blocks tall', maxHeight: 3 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
    });

    it('should validate height range', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'height', description: 'Between 2 and 5 blocks tall', minHeight: 2, maxHeight: 5 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.height).toBe(3);
    });
  });

  describe('validateMaterials', () => {
    it('should validate required materials are used', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.OakWood }
      ];

      const requirements: ChallengeRequirement[] = [
        {
          type: 'materials',
          description: 'Use brick and wood',
          requiredMaterials: [MaterialType.Brick, MaterialType.OakWood]
        }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.requiredMaterials).toBe(2);
      expect(result.details.usedMaterials).toBe(2);
    });

    it('should detect missing materials', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        {
          type: 'materials',
          description: 'Use brick and wood',
          requiredMaterials: [MaterialType.Brick, MaterialType.OakWood]
        }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('Oak Wood');
    });

    it('should count blocks per material type', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.OakWood }
      ];

      const requirements: ChallengeRequirement[] = [
        {
          type: 'materials',
          description: 'Use brick',
          requiredMaterials: [MaterialType.Brick]
        }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.Brick).toBe(2);
      expect(result.details['Oak Wood']).toBe(1);
    });
  });

  describe('validateShape - Tower', () => {
    it('should validate a tower structure', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 3, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build a tower', requiredShape: 'tower' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.aspectRatio).toBeGreaterThanOrEqual(2);
    });

    it('should reject structure that is too wide to be a tower', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build a tower', requiredShape: 'tower' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('too wide');
    });
  });

  describe('validateShape - Bridge', () => {
    it('should validate a bridge structure', async () => {
      const blocks: BlockData[] = [
        // Left pillar
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Cobblestone },
        // Deck
        { position: { x: 1, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 2, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 3, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 4, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        // Right pillar
        { position: { x: 5, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 5, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 5, y: 2, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build a bridge', requiredShape: 'bridge' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.hasSupports).toBe(true);
      expect(result.details.span).toBeGreaterThanOrEqual(5);
    });

    it('should reject bridge without supports', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 1, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 2, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 3, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 4, y: 2, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 5, y: 2, z: 0 }, materialType: MaterialType.OakWood }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build a bridge', requiredShape: 'bridge' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('support pillars');
    });
  });

  describe('validateShape - Pyramid', () => {
    it('should validate a pyramid structure', async () => {
      const blocks: BlockData[] = [
        // Base layer (3x3)
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Sandstone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Sandstone },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Sandstone },
        { position: { x: 0, y: 0, z: 1 }, materialType: MaterialType.Sandstone },
        { position: { x: 1, y: 0, z: 1 }, materialType: MaterialType.Sandstone },
        { position: { x: 2, y: 0, z: 1 }, materialType: MaterialType.Sandstone },
        { position: { x: 0, y: 0, z: 2 }, materialType: MaterialType.Sandstone },
        { position: { x: 1, y: 0, z: 2 }, materialType: MaterialType.Sandstone },
        { position: { x: 2, y: 0, z: 2 }, materialType: MaterialType.Sandstone },
        // Middle layer (2x2)
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Sandstone },
        { position: { x: 1, y: 1, z: 0 }, materialType: MaterialType.Sandstone },
        { position: { x: 0, y: 1, z: 1 }, materialType: MaterialType.Sandstone },
        { position: { x: 1, y: 1, z: 1 }, materialType: MaterialType.Sandstone },
        // Top layer (1x1)
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Sandstone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build a pyramid', requiredShape: 'pyramid' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.isTapering).toBe(true);
      expect(result.details.levels).toBeGreaterThanOrEqual(3);
    });

    it('should reject non-tapering structure', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Sandstone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Sandstone },
        { position: { x: 1, y: 1, z: 0 }, materialType: MaterialType.Sandstone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Sandstone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build a pyramid', requiredShape: 'pyramid' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('taper');
    });
  });

  describe('validateShape - House', () => {
    it('should validate a house structure', async () => {
      const blocks: BlockData[] = [
        // Foundation
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 0, z: 1 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 1 }, materialType: MaterialType.Cobblestone },
        // Walls
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 1, y: 1, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 0, y: 1, z: 1 }, materialType: MaterialType.OakWood },
        { position: { x: 1, y: 1, z: 1 }, materialType: MaterialType.OakWood },
        // Roof
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 1, y: 2, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build a house', requiredShape: 'house' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.hasFoundation).toBe(true);
      expect(result.details.hasRoof).toBe(true);
    });

    it('should reject house without foundation', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.OakWood }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build a house', requiredShape: 'house' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('foundation');
    });
  });

  describe('validateShape - Arch', () => {
    it('should validate an arch structure', async () => {
      const blocks: BlockData[] = [
        // Left pillar
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Cobblestone },
        // Right pillar
        { position: { x: 4, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 4, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 4, y: 2, z: 0 }, materialType: MaterialType.Cobblestone },
        // Top (arch curve)
        { position: { x: 1, y: 3, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 2, y: 3, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 3, y: 3, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'shape', description: 'Build an arch', requiredShape: 'arch' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.hasPillars).toBe(true);
      expect(result.details.hasGap).toBe(true);
      expect(result.details.hasTop).toBe(true);
    });
  });

  describe('validateBlockCount', () => {
    it('should validate minimum block count', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'blockCount', description: 'Use at least 3 blocks', minBlocks: 3 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.blockCount).toBe(3);
    });

    it('should validate maximum block count', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'blockCount', description: 'Use maximum 5 blocks', maxBlocks: 5 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.blockCount).toBe(2);
    });

    it('should validate block count range', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'blockCount', description: 'Use between 2 and 5 blocks', minBlocks: 2, maxBlocks: 5 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
    });

    it('should fail if block count is outside range', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'blockCount', description: 'Use between 3 and 5 blocks', minBlocks: 3, maxBlocks: 5 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
    });
  });

  describe('validateFoundation', () => {
    it('should validate structure with good foundation', async () => {
      const blocks: BlockData[] = [
        // Ground level
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        // Upper level
        { position: { x: 1, y: 1, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'foundation', description: 'Must have proper foundation' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.details.hasFoundation).toBe(true);
      expect(result.details.groundSupport).toBe(3);
    });

    it('should fail structure with weak foundation', async () => {
      const blocks: BlockData[] = [
        // Only one ground block
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        // Many upper blocks
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 3, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 4, z: 0 }, materialType: MaterialType.Cobblestone }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'foundation', description: 'Must have proper foundation' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('Weak foundation');
    });

    it('should handle empty blocks for foundation', async () => {
      const blocks: BlockData[] = [];

      const requirements: ChallengeRequirement[] = [
        { type: 'foundation', description: 'Must have proper foundation' }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.details.hasFoundation).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should validate complete challenge with multiple requirements', async () => {
      // Build a symmetric tower with proper foundation
      const blocks: BlockData[] = [
        // Foundation (3x3 base)
        { position: { x: -1, y: 0, z: -1 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 0, z: -1 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: -1 }, materialType: MaterialType.Cobblestone },
        { position: { x: -1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: -1, y: 0, z: 1 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 0, z: 1 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 1 }, materialType: MaterialType.Cobblestone },
        // Tower (center column)
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 3, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 4, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 5, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 6, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'stability', description: 'Structure must be stable', minStability: true },
        { type: 'foundation', description: 'Must have proper foundation' },
        { type: 'height', description: 'At least 6 blocks tall', minHeight: 6 },
        { type: 'materials', description: 'Use cobblestone and brick', requiredMaterials: [MaterialType.Cobblestone, MaterialType.Brick] },
        { type: 'blockCount', description: 'Use 10-20 blocks', minBlocks: 10, maxBlocks: 20 }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.feedback).toContain('Excellent work');
    });

    it('should provide detailed feedback for partially completed challenge', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Brick }
      ];

      const requirements: ChallengeRequirement[] = [
        { type: 'stability', description: 'Must be stable', minStability: true },
        { type: 'height', description: 'At least 5 blocks tall', minHeight: 5 },
        { type: 'materials', description: 'Use brick and wood', requiredMaterials: [MaterialType.Brick, MaterialType.OakWood] }
      ];

      const result = await engine.validateChallenge(blocks, requirements);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(33); // Only stability passes
      expect(result.feedback).toContain('1/3 requirements met');
      expect(result.feedback).toContain('✓');
      expect(result.feedback).toContain('✗');
    });
  });
});
