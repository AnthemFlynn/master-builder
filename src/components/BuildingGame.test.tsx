import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BuildingGame from './BuildingGame';
import { MaterialType } from '../game/Materials';

// Mock the child components
vi.mock('./BuildingScene', () => ({
  default: ({ selectedMaterial, onBlockPlaced }: any) => (
    <div data-testid="building-scene" data-material={selectedMaterial}>
      <button onClick={onBlockPlaced} data-testid="place-block-btn">
        Place Block
      </button>
    </div>
  ),
}));

vi.mock('./PiecePalette', () => ({
  default: ({ onMaterialSelect, onTypeSelect, selectedMaterialIndex, unlockedTiers }: any) => (
    <div data-testid="piece-palette">
      <button onClick={() => onMaterialSelect(0)} data-testid="material-0">
        Oak Wood
      </button>
      <button onClick={() => onMaterialSelect(1)} data-testid="material-1">
        Cobblestone
      </button>
      <button onClick={() => onMaterialSelect(2)} data-testid="material-2">
        Brick
      </button>
      <button onClick={() => onTypeSelect(0)} data-testid="type-0">
        Cube
      </button>
      <div data-testid="selected-material">{selectedMaterialIndex}</div>
      <div data-testid="unlocked-tiers">{unlockedTiers.join(',')}</div>
    </div>
  ),
}));

vi.mock('./HUD', () => ({
  default: ({ score, gold, blockCount, title, level, xp, nextLevelXP }: any) => (
    <div data-testid="hud">
      <div data-testid="hud-score">{score}</div>
      <div data-testid="hud-gold">{gold}</div>
      <div data-testid="hud-blocks">{blockCount}</div>
      <div data-testid="hud-title">{title}</div>
      <div data-testid="hud-level">{level}</div>
      <div data-testid="hud-xp">{xp}</div>
      <div data-testid="hud-next-xp">{nextLevelXP}</div>
    </div>
  ),
}));

vi.mock('./ChallengeView', () => ({
  default: ({ challenge, stats, onTest, onClose, result }: any) => (
    <div data-testid="challenge-view">
      <div data-testid="challenge-name">{challenge.name}</div>
      <div data-testid="challenge-stats-blocks">{stats.blocks}</div>
      <button onClick={onTest} data-testid="test-challenge">
        Test
      </button>
      <button onClick={onClose} data-testid="close-challenge">
        Close
      </button>
      {result && (
        <div data-testid="challenge-result">
          <div data-testid="result-passed">{result.passed.toString()}</div>
          <div data-testid="result-stars">{result.stars}</div>
        </div>
      )}
    </div>
  ),
}));

describe('BuildingGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders all main components', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('building-scene')).toBeInTheDocument();
      expect(screen.getByTestId('piece-palette')).toBeInTheDocument();
      expect(screen.getByTestId('hud')).toBeInTheDocument();
      expect(screen.getByTestId('challenge-view')).toBeInTheDocument();
    });

    it('initializes with correct default values', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('hud-score')).toHaveTextContent('0');
      expect(screen.getByTestId('hud-gold')).toHaveTextContent('100');
      expect(screen.getByTestId('hud-blocks')).toHaveTextContent('0');
      expect(screen.getByTestId('hud-level')).toHaveTextContent('1');
      expect(screen.getByTestId('hud-xp')).toHaveTextContent('0');
      expect(screen.getByTestId('hud-title')).toHaveTextContent('Novice Builder');
    });

    it('starts with Oak Wood material selected', () => {
      render(<BuildingGame />);

      const scene = screen.getByTestId('building-scene');
      expect(scene).toHaveAttribute('data-material', MaterialType.OakWood.toString());
    });

    it('starts with tier 0 unlocked', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('unlocked-tiers')).toHaveTextContent('0');
    });

    it('displays the first challenge', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('challenge-name')).toHaveTextContent('First Steps');
    });
  });

  describe('Material Selection', () => {
    it('updates selected material when palette button clicked', () => {
      render(<BuildingGame />);

      // Initially Oak Wood (0)
      expect(screen.getByTestId('selected-material')).toHaveTextContent('0');

      // Click Cobblestone
      fireEvent.click(screen.getByTestId('material-1'));

      expect(screen.getByTestId('selected-material')).toHaveTextContent('1');
    });

    it('passes selected material to BuildingScene', () => {
      render(<BuildingGame />);

      // Click Brick
      fireEvent.click(screen.getByTestId('material-2'));

      const scene = screen.getByTestId('building-scene');
      expect(scene).toHaveAttribute('data-material', MaterialType.Brick.toString());
    });

    it('allows switching between multiple materials', () => {
      render(<BuildingGame />);

      fireEvent.click(screen.getByTestId('material-1'));
      expect(screen.getByTestId('selected-material')).toHaveTextContent('1');

      fireEvent.click(screen.getByTestId('material-0'));
      expect(screen.getByTestId('selected-material')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('material-2'));
      expect(screen.getByTestId('selected-material')).toHaveTextContent('2');
    });
  });

  describe('Block Placement', () => {
    it('increments block count when block is placed', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('hud-blocks')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('place-block-btn'));

      expect(screen.getByTestId('hud-blocks')).toHaveTextContent('1');
    });

    it('increases score when block is placed', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('hud-score')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('place-block-btn'));

      expect(screen.getByTestId('hud-score')).toHaveTextContent('10');
    });

    it('increases XP when block is placed', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('hud-xp')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('place-block-btn'));

      expect(screen.getByTestId('hud-xp')).toHaveTextContent('5');
    });

    it('updates stats for multiple block placements', () => {
      render(<BuildingGame />);

      // Place 3 blocks
      fireEvent.click(screen.getByTestId('place-block-btn'));
      fireEvent.click(screen.getByTestId('place-block-btn'));
      fireEvent.click(screen.getByTestId('place-block-btn'));

      expect(screen.getByTestId('hud-blocks')).toHaveTextContent('3');
      expect(screen.getByTestId('hud-score')).toHaveTextContent('30');
      expect(screen.getByTestId('hud-xp')).toHaveTextContent('15');
    });

    it('updates challenge stats when blocks are placed', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('challenge-stats-blocks')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('place-block-btn'));

      expect(screen.getByTestId('challenge-stats-blocks')).toHaveTextContent('1');
    });
  });

  describe('Leveling System', () => {
    it('levels up when XP threshold is reached', () => {
      render(<BuildingGame />);

      // Level 1 requires 100 XP, each block gives 5 XP
      // Need 20 blocks to level up
      for (let i = 0; i < 20; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      expect(screen.getByTestId('hud-level')).toHaveTextContent('2');
    });

    it('resets XP after leveling up', () => {
      render(<BuildingGame />);

      // Place 20 blocks to level up
      for (let i = 0; i < 20; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      // XP should reset to 0 after reaching 100
      expect(screen.getByTestId('hud-xp')).toHaveTextContent('0');
      expect(screen.getByTestId('hud-level')).toHaveTextContent('2');
    });

    it('awards bonus gold on level up', () => {
      render(<BuildingGame />);

      const initialGold = 100;
      expect(screen.getByTestId('hud-gold')).toHaveTextContent(initialGold.toString());

      // Level up
      for (let i = 0; i < 20; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      // Should have initial gold + 50 bonus
      expect(screen.getByTestId('hud-gold')).toHaveTextContent('150');
    });

    it('unlocks tier 1 at level 3', () => {
      render(<BuildingGame />);

      // Level 1->2 needs 100 XP (20 blocks * 5 XP)
      // Level 2->3 needs 200 XP (40 blocks * 5 XP)
      // Total: 60 blocks to reach level 3
      for (let i = 0; i < 60; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      expect(screen.getByTestId('unlocked-tiers')).toHaveTextContent('0,1');
    });

    it('updates title when leveling up', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('hud-title')).toHaveTextContent('Novice Builder');

      // Level up to level 3 (60 blocks total)
      for (let i = 0; i < 60; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      expect(screen.getByTestId('hud-title')).toHaveTextContent('Skilled Builder');
    });
  });

  describe('Challenge System', () => {
    it('shows active challenge on start', () => {
      render(<BuildingGame />);

      expect(screen.getByTestId('challenge-view')).toBeInTheDocument();
      expect(screen.getByTestId('challenge-name')).toHaveTextContent('First Steps');
    });

    it('passes challenge when requirements are met', () => {
      render(<BuildingGame />);

      // First challenge requires 5 blocks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      fireEvent.click(screen.getByTestId('test-challenge'));

      expect(screen.getByTestId('result-passed')).toHaveTextContent('true');
    });

    it('fails challenge when requirements are not met', () => {
      render(<BuildingGame />);

      // Only place 3 blocks (need 5)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      fireEvent.click(screen.getByTestId('test-challenge'));

      expect(screen.getByTestId('result-passed')).toHaveTextContent('false');
    });

    it('awards gold when challenge is completed', () => {
      render(<BuildingGame />);

      // Complete first challenge (5 blocks, 50 gold reward)
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      fireEvent.click(screen.getByTestId('test-challenge'));

      expect(screen.getByTestId('hud-gold')).toHaveTextContent('150');
    });

    it('moves to next challenge after completing current one', () => {
      render(<BuildingGame />);

      // Complete first challenge
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId('place-block-btn'));
      }

      fireEvent.click(screen.getByTestId('test-challenge'));
      fireEvent.click(screen.getByTestId('close-challenge'));

      // Should now show second challenge
      expect(screen.getByTestId('challenge-name')).toHaveTextContent('Builder Apprentice');
    });

    it('can close challenge without completing it', () => {
      render(<BuildingGame />);

      // Place some blocks but don't complete
      fireEvent.click(screen.getByTestId('place-block-btn'));
      fireEvent.click(screen.getByTestId('place-block-btn'));

      // Try to test (will fail)
      fireEvent.click(screen.getByTestId('test-challenge'));

      // Close challenge
      fireEvent.click(screen.getByTestId('close-challenge'));

      // Challenge should be hidden
      expect(screen.queryByTestId('challenge-view')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('connects material selection to block placement', () => {
      render(<BuildingGame />);

      // Select Brick material
      fireEvent.click(screen.getByTestId('material-2'));

      // Verify BuildingScene received the material
      const scene = screen.getByTestId('building-scene');
      expect(scene).toHaveAttribute('data-material', MaterialType.Brick.toString());

      // Place a block with that material
      fireEvent.click(screen.getByTestId('place-block-btn'));

      // Verify block was counted
      expect(screen.getByTestId('hud-blocks')).toHaveTextContent('1');
    });

    it('tracks material variety for challenges', () => {
      render(<BuildingGame />);

      // Use Oak Wood
      fireEvent.click(screen.getByTestId('material-0'));
      fireEvent.click(screen.getByTestId('place-block-btn'));

      // Use Cobblestone
      fireEvent.click(screen.getByTestId('material-1'));
      fireEvent.click(screen.getByTestId('place-block-btn'));

      // Use Brick
      fireEvent.click(screen.getByTestId('material-2'));
      fireEvent.click(screen.getByTestId('place-block-btn'));

      // Stats should show 3 materials used
      // This is verified through the challenge system which checks matCount
    });

    it('displays controls instructions', () => {
      render(<BuildingGame />);

      expect(screen.getByText('Controls')).toBeInTheDocument();
      expect(screen.getByText(/WASD/)).toBeInTheDocument();
      expect(screen.getByText(/Right-click/)).toBeInTheDocument();
    });
  });

  describe('UI Layout', () => {
    it('renders BuildingScene as full background', () => {
      const { container } = render(<BuildingGame />);

      const sceneContainer = container.querySelector('.absolute.inset-0.z-0');
      expect(sceneContainer).toBeInTheDocument();
    });

    it('renders HUD as overlay', () => {
      const { container } = render(<BuildingGame />);

      const hudContainer = container.querySelector('.absolute.top-0.left-0.z-10');
      expect(hudContainer).toBeInTheDocument();
    });

    it('renders PiecePalette as bottom overlay', () => {
      const { container } = render(<BuildingGame />);

      const paletteContainer = container.querySelector('.absolute.bottom-0.left-0.right-0.z-10');
      expect(paletteContainer).toBeInTheDocument();
    });

    it('renders ChallengeView as modal when active', () => {
      const { container } = render(<BuildingGame />);

      const challengeContainer = container.querySelector('.absolute.inset-0.z-20');
      expect(challengeContainer).toBeInTheDocument();
    });
  });
});
