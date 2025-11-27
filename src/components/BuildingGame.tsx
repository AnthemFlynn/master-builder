import React, { useState, useCallback } from 'react';
import BuildingScene from './BuildingScene';
import PiecePalette from './PiecePalette';
import HUD from './HUD';
import ChallengeView from './ChallengeView';
import { MaterialType } from '../game/Materials';

// Material data for PiecePalette
interface Material {
  name: string;
  color: number;
  icon: string;
  tier: number;
  opacity?: number;
  glow?: boolean;
  metalness?: number;
}

// Block type data for PiecePalette
interface BlockType {
  name: string;
  type: string;
  size: number[];
  icon: string;
}

// Challenge interface
interface Challenge {
  id: number;
  name: string;
  desc: string;
  reward: number;
  check: (stats: any) => boolean;
  hints?: string[];
}

// Stats interface for challenges
interface Stats {
  blocks: number;
  height: number;
  matCount: number;
  glows: number;
}

// Test result interface
interface TestResult {
  passed: boolean;
  stars: number;
  feedback: string[];
}

// Game state interface
interface GameState {
  score: number;
  gold: number;
  blockCount: number;
  level: number;
  xp: number;
  title: string;
  selectedMaterialIndex: number;
  selectedTypeIndex: number;
  unlockedTiers: number[];
  activeChallengeId: number | null;
  completedChallenges: number[];
  stats: Stats;
}

// Material definitions matching the game engine
const MATERIALS: Material[] = [
  { name: 'Oak Wood', color: 0x8B4513, icon: '🪵', tier: 0 },
  { name: 'Cobblestone', color: 0x808080, icon: '🪨', tier: 0 },
  { name: 'Brick', color: 0xB22222, icon: '🧱', tier: 1 },
  { name: 'Sandstone', color: 0xF4A460, icon: '🏜️', tier: 1 },
  { name: 'White Marble', color: 0xFFFAFA, icon: '⬜', tier: 2 },
  { name: 'Glass', color: 0x87CEEB, icon: '💎', tier: 2, opacity: 0.5 },
  { name: 'Gold', color: 0xFFD700, icon: '⭐', tier: 3, metalness: 0.8 },
  { name: 'Ruby', color: 0xE0115F, icon: '💗', tier: 3, glow: true },
  { name: 'Emerald', color: 0x50C878, icon: '💚', tier: 3, glow: true },
];

// Block types (currently only standard cube)
const BLOCK_TYPES: BlockType[] = [
  { name: 'Standard Block', type: 'cube', size: [1, 1, 1], icon: '🧊' },
];

// Sample challenges for testing
const CHALLENGES: Challenge[] = [
  {
    id: 1,
    name: 'First Steps',
    desc: 'Place your first 5 blocks to get started!',
    reward: 50,
    check: (stats) => stats.blocks >= 5,
    hints: [
      'Click the canvas to lock the cursor',
      'Use WASD to move around',
      'Right-click to place blocks',
    ],
  },
  {
    id: 2,
    name: 'Builder Apprentice',
    desc: 'Place 20 blocks and reach a height of 5',
    reward: 100,
    check: (stats) => stats.blocks >= 20 && stats.height >= 5,
    hints: [
      'Build upwards by looking up and placing blocks',
      'You can jump on placed blocks to go higher',
    ],
  },
  {
    id: 3,
    name: 'Variety Builder',
    desc: 'Use at least 3 different materials in your build',
    reward: 150,
    check: (stats) => stats.matCount >= 3,
    hints: [
      'Select different materials from the palette at the bottom',
      'Try mixing wood, stone, and brick!',
    ],
  },
];

/**
 * BuildingGame - Main game component that integrates all UI elements with the game engine
 *
 * This component manages the overall game state and connects:
 * - BuildingScene: The 3D game engine
 * - PiecePalette: Material and block type selection
 * - HUD: Player stats display
 * - ChallengeView: Challenge system UI
 */
const BuildingGame: React.FC = () => {
  // Game state management
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    gold: 100,
    blockCount: 0,
    level: 1,
    xp: 0,
    title: 'Novice Builder',
    selectedMaterialIndex: 0,
    selectedTypeIndex: 0,
    unlockedTiers: [0], // Start with tier 0 unlocked
    activeChallengeId: 1, // Start with first challenge active
    completedChallenges: [],
    stats: {
      blocks: 0,
      height: 0,
      matCount: 0,
      glows: 0,
    },
  });

  const [challengeResult, setChallengeResult] = useState<TestResult | undefined>();
  const [usedMaterials, setUsedMaterials] = useState<Set<number>>(new Set());

  // Get the currently selected MaterialType for the game engine
  const selectedMaterialType: MaterialType = gameState.selectedMaterialIndex as MaterialType;

  // Get active challenge
  const activeChallenge = CHALLENGES.find(c => c.id === gameState.activeChallengeId);

  // Handle material selection from palette
  const handleMaterialSelect = useCallback((index: number) => {
    setGameState(prev => ({
      ...prev,
      selectedMaterialIndex: index,
    }));

    // Track material usage
    setUsedMaterials(prev => new Set(prev).add(index));
  }, []);

  // Handle block type selection from palette
  const handleTypeSelect = useCallback((index: number) => {
    setGameState(prev => ({
      ...prev,
      selectedTypeIndex: index,
    }));
  }, []);

  // Handle block placement from game engine
  const handleBlockPlaced = useCallback(() => {
    setGameState(prev => {
      const newBlockCount = prev.blockCount + 1;
      const newScore = prev.score + 10;
      const newXP = prev.xp + 5;

      // Simple leveling system
      const nextLevelXP = prev.level * 100;
      let newLevel = prev.level;
      let remainingXP = newXP;
      let newGold = prev.gold;

      if (newXP >= nextLevelXP) {
        newLevel += 1;
        remainingXP = newXP - nextLevelXP;
        newGold += 50; // Bonus gold on level up

        // Unlock new tiers based on level
        const unlockedTiers = [0];
        if (newLevel >= 3) unlockedTiers.push(1);
        if (newLevel >= 5) unlockedTiers.push(2);
        if (newLevel >= 7) unlockedTiers.push(3);

        return {
          ...prev,
          blockCount: newBlockCount,
          score: newScore,
          level: newLevel,
          xp: remainingXP,
          gold: newGold,
          unlockedTiers,
          stats: {
            ...prev.stats,
            blocks: newBlockCount,
            matCount: usedMaterials.size,
          },
        };
      }

      return {
        ...prev,
        blockCount: newBlockCount,
        score: newScore,
        xp: newXP,
        stats: {
          ...prev.stats,
          blocks: newBlockCount,
          matCount: usedMaterials.size,
        },
      };
    });
  }, [usedMaterials]);

  // Handle challenge test
  const handleTestChallenge = useCallback(() => {
    if (!activeChallenge) return;

    const passed = activeChallenge.check(gameState.stats);

    if (passed) {
      // Calculate stars based on performance
      const stars = Math.min(3, Math.floor(gameState.stats.blocks / 10) + 1);

      setChallengeResult({
        passed: true,
        stars,
        feedback: [
          'Congratulations! Challenge completed!',
          `You earned ${activeChallenge.reward} gold!`,
        ],
      });

      // Award gold and mark challenge as complete
      setGameState(prev => ({
        ...prev,
        gold: prev.gold + activeChallenge.reward,
        completedChallenges: [...prev.completedChallenges, activeChallenge.id],
      }));
    } else {
      setChallengeResult({
        passed: false,
        stars: 0,
        feedback: [
          'Not quite there yet!',
          'Keep building and try again.',
        ],
      });
    }
  }, [activeChallenge, gameState.stats]);

  // Handle challenge close
  const handleCloseChallenge = useCallback(() => {
    // If challenge was completed, move to next one
    if (challengeResult?.passed && activeChallenge) {
      const nextChallengeId = activeChallenge.id + 1;
      const nextChallenge = CHALLENGES.find(c => c.id === nextChallengeId);

      setGameState(prev => ({
        ...prev,
        activeChallengeId: nextChallenge ? nextChallengeId : null,
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        activeChallengeId: null,
      }));
    }

    setChallengeResult(undefined);
  }, [challengeResult, activeChallenge]);

  // Update title based on level
  const getTitleColor = () => {
    if (gameState.level >= 7) return 'text-purple-400';
    if (gameState.level >= 5) return 'text-blue-400';
    if (gameState.level >= 3) return 'text-green-400';
    return 'text-gray-400';
  };

  const getTitle = () => {
    if (gameState.level >= 7) return 'Master Builder';
    if (gameState.level >= 5) return 'Expert Builder';
    if (gameState.level >= 3) return 'Skilled Builder';
    return 'Novice Builder';
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Game Engine - Full screen background */}
      <div className="absolute inset-0 z-0">
        <BuildingScene
          selectedMaterial={selectedMaterialType}
          onBlockPlaced={handleBlockPlaced}
        />
      </div>

      {/* HUD - Top left overlay */}
      <div className="absolute top-0 left-0 z-10">
        <HUD
          score={gameState.score}
          gold={gameState.gold}
          blockCount={gameState.blockCount}
          title={getTitle()}
          titleColor={getTitleColor()}
          level={gameState.level}
          xp={gameState.xp}
          nextLevelXP={gameState.level * 100}
        />
      </div>

      {/* Piece Palette - Bottom center overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <PiecePalette
          materials={MATERIALS}
          blockTypes={BLOCK_TYPES}
          selectedMaterialIndex={gameState.selectedMaterialIndex}
          selectedTypeIndex={gameState.selectedTypeIndex}
          unlockedTiers={gameState.unlockedTiers}
          onMaterialSelect={handleMaterialSelect}
          onTypeSelect={handleTypeSelect}
        />
      </div>

      {/* Challenge View - Modal overlay */}
      {activeChallenge && (
        <div className="absolute inset-0 z-20">
          <ChallengeView
            challenge={activeChallenge}
            stats={gameState.stats}
            onTest={handleTestChallenge}
            onClose={handleCloseChallenge}
            result={challengeResult}
          />
        </div>
      )}

      {/* Instructions overlay - Top right */}
      <div className="absolute top-4 right-4 z-10 bg-black/70 text-white p-4 rounded-lg max-w-xs">
        <h3 className="font-bold mb-2">Controls</h3>
        <ul className="text-sm space-y-1">
          <li>🖱️ <strong>Click canvas</strong> to start</li>
          <li>⌨️ <strong>WASD</strong> - Move</li>
          <li>🖱️ <strong>Mouse</strong> - Look around</li>
          <li>🖱️ <strong>Right-click</strong> - Place block</li>
          <li>🖱️ <strong>Left-click</strong> - Remove block</li>
          <li>⌨️ <strong>Space</strong> - Jump</li>
          <li>⌨️ <strong>ESC</strong> - Release cursor</li>
        </ul>
      </div>
    </div>
  );
};

export default BuildingGame;
