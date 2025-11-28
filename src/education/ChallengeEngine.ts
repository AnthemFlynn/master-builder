import PhysicsValidator from './PhysicsValidator';
import { BlockData } from '../game/BlockManager';
import { MaterialType } from '../game/Materials';

export interface ChallengeRequirement {
  type: 'stability' | 'symmetry' | 'height' | 'materials' | 'shape' | 'blockCount' | 'foundation';
  description: string;
  // Type-specific parameters
  minHeight?: number;
  maxHeight?: number;
  minBlocks?: number;
  maxBlocks?: number;
  requiredMaterials?: MaterialType[];
  symmetryAxis?: 'x' | 'z' | 'both';
  requiredShape?: 'tower' | 'bridge' | 'arch' | 'pyramid' | 'house';
  minStability?: boolean; // true = must be stable
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  feedback: string;
  details: {
    [key: string]: boolean | number | string;
  };
}

interface RequirementResult {
  passed: boolean;
  feedback: string;
  details?: { [key: string]: boolean | number | string };
}

export default class ChallengeEngine {
  constructor(private physicsValidator: PhysicsValidator) {}

  async validateChallenge(
    blocks: BlockData[],
    requirements: ChallengeRequirement[]
  ): Promise<ValidationResult> {
    if (requirements.length === 0) {
      return {
        passed: true,
        score: 100,
        feedback: 'No requirements to validate.',
        details: {}
      };
    }

    const results: RequirementResult[] = [];
    const allDetails: { [key: string]: boolean | number | string } = {};

    for (const req of requirements) {
      let result: RequirementResult;

      switch (req.type) {
        case 'stability':
          result = await this.validateStability(blocks, req.minStability);
          break;
        case 'symmetry':
          result = this.validateSymmetry(blocks, req.symmetryAxis || 'both');
          break;
        case 'height':
          result = this.validateHeight(blocks, req.minHeight, req.maxHeight);
          break;
        case 'materials':
          result = this.validateMaterials(blocks, req.requiredMaterials || []);
          break;
        case 'shape':
          result = this.validateShape(blocks, req.requiredShape || 'tower');
          break;
        case 'blockCount':
          result = this.validateBlockCount(blocks, req.minBlocks, req.maxBlocks);
          break;
        case 'foundation':
          result = this.validateFoundation(blocks);
          break;
        default:
          result = { passed: false, feedback: `Unknown requirement type: ${req.type}` };
      }

      results.push(result);

      // Merge details
      if (result.details) {
        Object.assign(allDetails, result.details);
      }
    }

    const passedCount = results.filter(r => r.passed).length;
    const score = Math.round((passedCount / requirements.length) * 100);
    const passed = passedCount === requirements.length;

    const feedbackMessages = results.map((r, i) => {
      const status = r.passed ? '✓' : '✗';
      return `${status} ${requirements[i].description}: ${r.feedback}`;
    });

    const feedback = passed
      ? `Excellent work! All ${requirements.length} requirements met!\n${feedbackMessages.join('\n')}`
      : `${passedCount}/${requirements.length} requirements met.\n${feedbackMessages.join('\n')}`;

    return {
      passed,
      score,
      feedback,
      details: allDetails
    };
  }

  private async validateStability(
    blocks: BlockData[],
    minStability?: boolean
  ): Promise<RequirementResult> {
    if (blocks.length === 0) {
      return {
        passed: true,
        feedback: 'No blocks to validate.',
        details: { isStable: true }
      };
    }

    const result = await this.physicsValidator.validateStructure(blocks);

    if (minStability === undefined || minStability === true) {
      return {
        passed: result.isStable,
        feedback: result.isStable
          ? 'Structure is stable and well-supported!'
          : `Structure is unstable. ${result.failurePoints.length} blocks will collapse.`,
        details: {
          isStable: result.isStable,
          failurePoints: result.failurePoints.length,
          timeToCollapse: result.timeToCollapse || 0
        }
      };
    }

    return {
      passed: true,
      feedback: 'Stability check passed.',
      details: { isStable: result.isStable }
    };
  }

  private validateSymmetry(
    blocks: BlockData[],
    axis: 'x' | 'z' | 'both'
  ): RequirementResult {
    if (blocks.length === 0) {
      return {
        passed: true,
        feedback: 'No blocks to validate.',
        details: { symmetrical: true }
      };
    }

    // Calculate center point
    const centerX = blocks.reduce((sum, b) => sum + b.position.x, 0) / blocks.length;
    const centerZ = blocks.reduce((sum, b) => sum + b.position.z, 0) / blocks.length;

    const checkSymmetry = (centerAxis: number, getCoord: (b: BlockData) => number, axisName: 'x' | 'z'): boolean => {
      const blockSet = new Set(
        blocks.map(b => `${b.position.x},${b.position.y},${b.position.z},${b.materialType}`)
      );

      for (const block of blocks) {
        const coord = getCoord(block);
        const mirroredCoord = Math.round(2 * centerAxis - coord);

        // Create mirrored block signature
        const mirroredSignature = axisName === 'x'
          ? `${mirroredCoord},${block.position.y},${block.position.z},${block.materialType}`
          : `${block.position.x},${block.position.y},${mirroredCoord},${block.materialType}`;

        if (!blockSet.has(mirroredSignature)) {
          return false;
        }
      }

      return true;
    };

    let isSymmetricX = true;
    let isSymmetricZ = true;

    if (axis === 'x' || axis === 'both') {
      isSymmetricX = checkSymmetry(centerX, b => b.position.x, 'x');
    }

    if (axis === 'z' || axis === 'both') {
      isSymmetricZ = checkSymmetry(centerZ, b => b.position.z, 'z');
    }

    const passed = axis === 'both' ? (isSymmetricX && isSymmetricZ) :
                   axis === 'x' ? isSymmetricX : isSymmetricZ;

    const feedback = passed
      ? `Perfect symmetry along ${axis} axis!`
      : `Structure is not symmetrical along ${axis} axis. Try mirroring your blocks.`;

    return {
      passed,
      feedback,
      details: {
        symmetricX: isSymmetricX,
        symmetricZ: isSymmetricZ,
        centerX: Math.round(centerX * 100) / 100,
        centerZ: Math.round(centerZ * 100) / 100
      }
    };
  }

  private validateHeight(
    blocks: BlockData[],
    min?: number,
    max?: number
  ): RequirementResult {
    if (blocks.length === 0) {
      const passed = min === undefined || min === 0;
      return {
        passed,
        feedback: passed ? 'No blocks present.' : `Minimum height of ${min} blocks required.`,
        details: { height: 0 }
      };
    }

    const minY = Math.min(...blocks.map(b => b.position.y));
    const maxY = Math.max(...blocks.map(b => b.position.y));
    const height = maxY - minY + 1; // +1 because blocks have size

    let passed = true;
    const issues: string[] = [];

    if (min !== undefined && height < min) {
      passed = false;
      issues.push(`minimum ${min} blocks high`);
    }

    if (max !== undefined && height > max) {
      passed = false;
      issues.push(`maximum ${max} blocks high`);
    }

    const feedback = passed
      ? `Height of ${height} blocks meets requirements!`
      : `Structure is ${height} blocks high, but must be ${issues.join(' and ')}.`;

    return {
      passed,
      feedback,
      details: { height, minY, maxY }
    };
  }

  private validateMaterials(
    blocks: BlockData[],
    required: MaterialType[]
  ): RequirementResult {
    if (required.length === 0) {
      return {
        passed: true,
        feedback: 'No material requirements.',
        details: {}
      };
    }

    const usedMaterials = new Set(blocks.map(b => b.materialType));
    const missingMaterials = required.filter(m => !usedMaterials.has(m));

    const passed = missingMaterials.length === 0;

    const materialNames: { [key: number]: string } = {
      [MaterialType.OakWood]: 'Oak Wood',
      [MaterialType.Cobblestone]: 'Cobblestone',
      [MaterialType.Brick]: 'Brick',
      [MaterialType.Sandstone]: 'Sandstone',
      [MaterialType.WhiteMarble]: 'White Marble',
      [MaterialType.Glass]: 'Glass',
      [MaterialType.Gold]: 'Gold',
      [MaterialType.Ruby]: 'Ruby',
      [MaterialType.Emerald]: 'Emerald'
    };

    const feedback = passed
      ? `All required materials used: ${required.map(m => materialNames[m]).join(', ')}`
      : `Missing materials: ${missingMaterials.map(m => materialNames[m]).join(', ')}`;

    // Count blocks per material
    const materialCounts: { [key: string]: number } = {};
    blocks.forEach(b => {
      const name = materialNames[b.materialType] || `Material${b.materialType}`;
      materialCounts[name] = (materialCounts[name] || 0) + 1;
    });

    return {
      passed,
      feedback,
      details: {
        requiredMaterials: required.length,
        usedMaterials: usedMaterials.size,
        ...materialCounts
      }
    };
  }

  private validateShape(
    blocks: BlockData[],
    shape: string
  ): RequirementResult {
    if (blocks.length === 0) {
      return {
        passed: false,
        feedback: 'No blocks to form a shape.',
        details: { detectedShape: 'none' }
      };
    }

    switch (shape) {
      case 'tower':
        return this.validateTower(blocks);
      case 'bridge':
        return this.validateBridge(blocks);
      case 'arch':
        return this.validateArch(blocks);
      case 'pyramid':
        return this.validatePyramid(blocks);
      case 'house':
        return this.validateHouse(blocks);
      default:
        return {
          passed: false,
          feedback: `Unknown shape: ${shape}`,
          details: {}
        };
    }
  }

  private validateTower(blocks: BlockData[]): RequirementResult {
    // Tower: high aspect ratio (height >> width)
    const minY = Math.min(...blocks.map(b => b.position.y));
    const maxY = Math.max(...blocks.map(b => b.position.y));
    const height = maxY - minY + 1;

    const minX = Math.min(...blocks.map(b => b.position.x));
    const maxX = Math.max(...blocks.map(b => b.position.x));
    const width = maxX - minX + 1;

    const minZ = Math.min(...blocks.map(b => b.position.z));
    const maxZ = Math.max(...blocks.map(b => b.position.z));
    const depth = maxZ - minZ + 1;

    const maxHorizontal = Math.max(width, depth);
    const aspectRatio = height / maxHorizontal;

    // Tower should be at least 2x taller than it is wide
    const passed = aspectRatio >= 2;

    const feedback = passed
      ? `Great tower! Height-to-width ratio of ${aspectRatio.toFixed(1)}:1`
      : `Structure is too wide. Towers should be at least 2x taller than wide. Current ratio: ${aspectRatio.toFixed(1)}:1`;

    return {
      passed,
      feedback,
      details: { height, width, depth, aspectRatio: Math.round(aspectRatio * 10) / 10 }
    };
  }

  private validateBridge(blocks: BlockData[]): RequirementResult {
    // Bridge: horizontal span with support pillars
    // Check for horizontal span
    const minX = Math.min(...blocks.map(b => b.position.x));
    const maxX = Math.max(...blocks.map(b => b.position.x));
    const minZ = Math.min(...blocks.map(b => b.position.z));
    const maxZ = Math.max(...blocks.map(b => b.position.z));

    const spanX = maxX - minX + 1;
    const spanZ = maxZ - minZ + 1;

    // Determine primary span direction
    const isXSpan = spanX > spanZ;
    const span = Math.max(spanX, spanZ);
    const width = Math.min(spanX, spanZ);

    // Find the deck level (highest continuous horizontal layer)
    const yLevels = [...new Set(blocks.map(b => b.position.y))].sort((a, b) => b - a);
    let deckLevel = yLevels[0];

    // Check for support pillars (vertical structures at edges)
    const leftSupport = blocks.filter(b =>
      (isXSpan ? b.position.x === minX : b.position.z === minZ) && b.position.y < deckLevel
    );
    const rightSupport = blocks.filter(b =>
      (isXSpan ? b.position.x === maxX : b.position.z === maxZ) && b.position.y < deckLevel
    );

    const hasSupports = leftSupport.length > 0 && rightSupport.length > 0;
    const hasSpan = span >= 5; // Minimum span of 5 blocks

    const passed = hasSpan && hasSupports;

    const feedback = passed
      ? `Excellent bridge with ${span} block span and support pillars!`
      : !hasSpan
        ? `Bridge needs a span of at least 5 blocks. Current span: ${span}`
        : `Bridge needs support pillars on both ends.`;

    return {
      passed,
      feedback,
      details: { span, width, hasSupports, deckLevel }
    };
  }

  private validateArch(blocks: BlockData[]): RequirementResult {
    // Arch: curved top structure
    // Simple heuristic: check for blocks that form an inverted U shape
    const minY = Math.min(...blocks.map(b => b.position.y));
    const maxY = Math.max(...blocks.map(b => b.position.y));

    const minX = Math.min(...blocks.map(b => b.position.x));
    const maxX = Math.max(...blocks.map(b => b.position.x));
    const minZ = Math.min(...blocks.map(b => b.position.z));
    const maxZ = Math.max(...blocks.map(b => b.position.z));

    const spanX = maxX - minX + 1;
    const spanZ = maxZ - minZ + 1;
    const isXSpan = spanX > spanZ;

    // Check for vertical pillars on sides
    const leftPillar = blocks.filter(b =>
      (isXSpan ? b.position.x === minX : b.position.z === minZ) && b.position.y === minY
    );
    const rightPillar = blocks.filter(b =>
      (isXSpan ? b.position.x === maxX : b.position.z === maxZ) && b.position.y === minY
    );

    // Check for top blocks (arch curve)
    const topBlocks = blocks.filter(b => b.position.y === maxY);

    // Check for gap underneath (arch opening)
    const middleCoord = isXSpan ? Math.round((minX + maxX) / 2) : Math.round((minZ + maxZ) / 2);
    const hasGap = !blocks.some(b =>
      (isXSpan ? b.position.x === middleCoord : b.position.z === middleCoord) &&
      b.position.y === minY
    );

    const hasPillars = leftPillar.length > 0 && rightPillar.length > 0;
    const hasTop = topBlocks.length > 0;
    const passed = hasPillars && hasTop && hasGap;

    const feedback = passed
      ? 'Beautiful arch structure with opening and support!'
      : !hasPillars
        ? 'Arch needs vertical pillars on both sides.'
        : !hasGap
          ? 'Arch needs an opening underneath.'
          : 'Arch needs blocks at the top to complete the curve.';

    return {
      passed,
      feedback,
      details: { hasPillars, hasTop, hasGap, span: Math.max(spanX, spanZ) }
    };
  }

  private validatePyramid(blocks: BlockData[]): RequirementResult {
    // Pyramid: tapers from wide base to narrow top
    const yLevels = [...new Set(blocks.map(b => b.position.y))].sort((a, b) => a - b);

    if (yLevels.length < 2) {
      return {
        passed: false,
        feedback: 'Pyramid needs multiple levels.',
        details: { levels: yLevels.length }
      };
    }

    // Check if each level is smaller than the one below
    let isTapering = true;
    let previousSize = Infinity;

    for (const y of yLevels) {
      const levelBlocks = blocks.filter(b => b.position.y === y);
      const size = levelBlocks.length;

      if (size >= previousSize) {
        isTapering = false;
        break;
      }
      previousSize = size;
    }

    // Check for base layer on ground
    const minY = yLevels[0];
    const baseBlocks = blocks.filter(b => b.position.y === minY);

    // Base should be relatively square
    const baseXCoords = baseBlocks.map(b => b.position.x);
    const baseZCoords = baseBlocks.map(b => b.position.z);
    const baseWidth = Math.max(...baseXCoords) - Math.min(...baseXCoords) + 1;
    const baseDepth = Math.max(...baseZCoords) - Math.min(...baseZCoords) + 1;
    const isSquareBase = Math.abs(baseWidth - baseDepth) <= 1;

    const passed = isTapering && isSquareBase && yLevels.length >= 3;

    const feedback = passed
      ? `Perfect pyramid with ${yLevels.length} levels tapering to the top!`
      : !isTapering
        ? 'Pyramid must taper with each level smaller than the one below.'
        : !isSquareBase
          ? 'Pyramid base should be roughly square.'
          : `Pyramid needs at least 3 levels. Current: ${yLevels.length}`;

    return {
      passed,
      feedback,
      details: { levels: yLevels.length, isTapering, isSquareBase, baseWidth, baseDepth }
    };
  }

  private validateHouse(blocks: BlockData[]): RequirementResult {
    // House: enclosed structure with foundation
    const minY = Math.min(...blocks.map(b => b.position.y));
    const maxY = Math.max(...blocks.map(b => b.position.y));
    const height = maxY - minY + 1;

    // Check for foundation (blocks at ground level)
    const foundation = blocks.filter(b => b.position.y === minY);
    const hasFoundation = foundation.length >= 4;

    // Check for walls (blocks on multiple sides)
    const minX = Math.min(...blocks.map(b => b.position.x));
    const maxX = Math.max(...blocks.map(b => b.position.x));
    const minZ = Math.min(...blocks.map(b => b.position.z));
    const maxZ = Math.max(...blocks.map(b => b.position.z));

    const hasWallX1 = blocks.some(b => b.position.x === minX && b.position.y > minY);
    const hasWallX2 = blocks.some(b => b.position.x === maxX && b.position.y > minY);
    const hasWallZ1 = blocks.some(b => b.position.z === minZ && b.position.y > minY);
    const hasWallZ2 = blocks.some(b => b.position.z === maxZ && b.position.y > minY);

    const wallCount = [hasWallX1, hasWallX2, hasWallZ1, hasWallZ2].filter(Boolean).length;
    const hasWalls = wallCount >= 3; // At least 3 walls

    // Check for roof (blocks at top level)
    const roof = blocks.filter(b => b.position.y === maxY);
    const hasRoof = roof.length >= 2 && height >= 3;

    const passed = hasFoundation && hasWalls && hasRoof;

    const feedback = passed
      ? `Cozy house with foundation, walls, and roof!`
      : !hasFoundation
        ? 'House needs a foundation (at least 4 blocks at ground level).'
        : !hasWalls
          ? `House needs walls on at least 3 sides. Current: ${wallCount}`
          : 'House needs a roof and should be at least 3 blocks tall.';

    return {
      passed,
      feedback,
      details: {
        hasFoundation,
        wallCount,
        hasRoof,
        height,
        foundationSize: foundation.length
      }
    };
  }

  private validateBlockCount(
    blocks: BlockData[],
    min?: number,
    max?: number
  ): RequirementResult {
    const count = blocks.length;

    let passed = true;
    const issues: string[] = [];

    if (min !== undefined && count < min) {
      passed = false;
      issues.push(`minimum ${min} blocks`);
    }

    if (max !== undefined && count > max) {
      passed = false;
      issues.push(`maximum ${max} blocks`);
    }

    const feedback = passed
      ? `Block count of ${count} is within requirements!`
      : `Used ${count} blocks, but need ${issues.join(' and ')}.`;

    return {
      passed,
      feedback,
      details: { blockCount: count, min: min || 0, max: max || Infinity }
    };
  }

  private validateFoundation(blocks: BlockData[]): RequirementResult {
    if (blocks.length === 0) {
      return {
        passed: false,
        feedback: 'No blocks to check for foundation.',
        details: { hasFoundation: false, groundSupport: 0 }
      };
    }

    const minY = Math.min(...blocks.map(b => b.position.y));
    const groundBlocks = blocks.filter(b => b.position.y === minY);
    const groundSupport = groundBlocks.length;

    // At least 25% of blocks should be on the ground for good foundation
    const supportRatio = groundSupport / blocks.length;
    const passed = supportRatio >= 0.25;

    const feedback = passed
      ? `Solid foundation with ${groundSupport} blocks at ground level!`
      : `Weak foundation. Only ${groundSupport} of ${blocks.length} blocks are at ground level. Add more support.`;

    return {
      passed,
      feedback,
      details: {
        hasFoundation: passed,
        groundSupport,
        totalBlocks: blocks.length,
        supportRatio: Math.round(supportRatio * 100)
      }
    };
  }
}
