import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Block {
  id: string;
  position: { x: number; y: number; z: number };
  type: string;
}

interface BuildingSceneProps {
  cameraPosition?: [number, number, number];
  showGrid?: boolean;
  blocks?: Block[];
  onBlockPlace?: (block: Block) => void;
}

export const BuildingScene: React.FC<BuildingSceneProps> = ({
  cameraPosition = [0, 10, 20],
  showGrid = true,
  blocks = [],
  onBlockPlace,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const blockMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    sceneRef.current = scene;

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(...cameraPosition);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add grid if enabled
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(50, 50);
      gridHelper.position.y = 0.01;
      scene.add(gridHelper);
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [cameraPosition, showGrid]);

  // Update blocks when they change
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const currentBlockIds = new Set(blocks.map(b => b.id));

    // Remove blocks that are no longer in the list
    blockMeshesRef.current.forEach((mesh, id) => {
      if (!currentBlockIds.has(id)) {
        scene.remove(mesh);
        blockMeshesRef.current.delete(id);
      }
    });

    // Add new blocks
    blocks.forEach(block => {
      if (!blockMeshesRef.current.has(block.id)) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(block.position.x, block.position.y, block.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        blockMeshesRef.current.set(block.id, mesh);
      }
    });
  }, [blocks]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%' }}
      data-testid="building-scene"
    />
  );
};
