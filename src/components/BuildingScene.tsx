import React, { useRef, useEffect } from 'react';
import Core from '../game/Core';
import Materials from '../game/Materials';
import BlockManager from '../game/BlockManager';
import Controls from '../game/Controls';
import Player from '../game/Player';
import Terrain from '../game/Terrain';
import Audio from '../game/Audio';
import { MaterialType } from '../game/Materials';

interface BuildingSceneProps {
  selectedMaterial?: MaterialType;
  onBlockPlaced?: () => void;
  onBlockRemoved?: () => void;
  onModeChange?: (mode: string) => void;
}

/**
 * BuildingScene - React wrapper for the minecraft-inspired game engine.
 *
 * Manages lifecycle for Core, Materials, BlockManager, Controls, Player, Terrain, and Audio classes.
 *
 * @param selectedMaterial - Currently selected building material (defaults to OakWood)
 * @param onBlockPlaced - Callback when block is placed
 * @param onBlockRemoved - Callback when block is removed
 * @param onModeChange - Callback when player mode changes (walking/flying)
 */
const BuildingScene: React.FC<BuildingSceneProps> = ({
  selectedMaterial = MaterialType.OakWood,
  onBlockPlaced,
  onBlockRemoved
  // onModeChange - reserved for future use
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coreRef = useRef<Core | null>(null);
  const materialsRef = useRef<Materials | null>(null);
  const blockManagerRef = useRef<BlockManager | null>(null);
  const controlsRef = useRef<Controls | null>(null);
  const playerRef = useRef<Player | null>(null);
  const terrainRef = useRef<Terrain | null>(null);
  const audioRef = useRef<Audio | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create core systems
    const core = new Core(canvasRef.current);
    const materials = new Materials();
    const blockManager = new BlockManager(core.scene, materials, onBlockPlaced, onBlockRemoved);

    // Create new systems
    const player = new Player();
    const terrain = new Terrain(core.scene, materials);
    const audio = new Audio(core.camera);

    // Position camera above terrain at spawn
    const spawnX = 0;
    const spawnZ = 0;
    const terrainHeight = terrain.getHeightAt(spawnX, spawnZ);
    core.camera.position.set(spawnX, terrainHeight + 10, spawnZ + 10);
    core.camera.lookAt(spawnX, terrainHeight, spawnZ);

    // Create controls with all systems
    const controls = new Controls(
      core.camera,
      canvasRef.current,
      blockManager,
      player,
      terrain,
      audio
    );

    // Store refs
    coreRef.current = core;
    materialsRef.current = materials;
    blockManagerRef.current = blockManager;
    playerRef.current = player;
    terrainRef.current = terrain;
    audioRef.current = audio;
    controlsRef.current = controls;

    // Animation loop
    let lastTime = performance.now();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Calculate delta time
      const currentTime = performance.now();
      const delta = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Update controls (player movement, physics)
      controls.update(delta);

      // Render scene
      core.render();
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      controls.dispose();
      blockManager.dispose();
      terrain.dispose();
      audio.dispose();
      materials.dispose();
      core.dispose();
    };
  }, []);

  // Update selected material
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.setMaterial(selectedMaterial);
    }
  }, [selectedMaterial]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
      onClick={() => controlsRef.current?.lock()}
    />
  );
};

export default BuildingScene;
