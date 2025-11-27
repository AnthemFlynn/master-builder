import React, { useRef, useEffect } from 'react';
import Core from '../game/Core';
import Materials from '../game/Materials';
import BlockManager from '../game/BlockManager';
import Controls from '../game/Controls';
import { MaterialType } from '../game/Materials';

interface BuildingSceneProps {
  selectedMaterial?: MaterialType;
  // TODO: Callback when block is placed (not yet implemented)
  onBlockPlaced?: () => void;
  // TODO: Callback when block is removed (not yet implemented)
  onBlockRemoved?: () => void;
}

/**
 * BuildingScene - React wrapper for the minecraft-inspired game engine.
 *
 * Manages lifecycle for Core, Materials, BlockManager, and Controls classes.
 *
 * @param selectedMaterial - Currently selected building material (defaults to OakWood)
 * @param onBlockPlaced - TODO: Callback when block is placed (not yet implemented)
 * @param onBlockRemoved - TODO: Callback when block is removed (not yet implemented)
 */
const BuildingScene: React.FC<BuildingSceneProps> = ({
  selectedMaterial = MaterialType.OakWood,
  onBlockPlaced,
  onBlockRemoved
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coreRef = useRef<Core | null>(null);
  const materialsRef = useRef<Materials | null>(null);
  const blockManagerRef = useRef<BlockManager | null>(null);
  const controlsRef = useRef<Controls | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create core systems
    const core = new Core(canvasRef.current);
    const materials = new Materials();
    const blockManager = new BlockManager(core.scene, materials);
    const controls = new Controls(core.camera, canvasRef.current, blockManager);

    coreRef.current = core;
    materialsRef.current = materials;
    blockManagerRef.current = blockManager;
    controlsRef.current = controls;

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      core.render();
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      controls.dispose();
      blockManager.dispose();
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
