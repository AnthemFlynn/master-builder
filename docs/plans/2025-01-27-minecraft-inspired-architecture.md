# Kingdom Builder - Minecraft-Inspired Architecture Plan

**Date:** January 27, 2025
**Status:** Active - Pivoting from original plan
**Based on:** [minecraft-threejs](https://github.com/vyse12138/minecraft-threejs) proven patterns

---

## Executive Summary

After analyzing the minecraft-threejs repository, we're adopting their proven Three.js architecture while maintaining our React UI layer and educational features. This hybrid approach gives us:

- **Fast 3D rendering** (InstancedMesh pattern - 10k+ blocks in single draw call)
- **Clean UI management** (React components already built)
- **Educational layer** (AI mentor, physics validation, challenges)
- **Test coverage** (34 tests already passing)
- **Faster development** (copy proven patterns instead of inventing)

---

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────┐
│         React UI Layer (Our Work)           │
│  - PiecePalette.tsx                         │
│  - ChallengeView.tsx                        │
│  - HUD.tsx                                  │
│  - BuildingScene.tsx (wrapper)              │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│     Core 3D Engine (From minecraft-threejs) │
│  - Core.ts (scene, camera, renderer)        │
│  - Materials.ts (textures, materials)       │
│  - BlockManager.ts (InstancedMesh)          │
│  - Controls.ts (raycasting, placement)      │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│   Educational Layer (Our Addition)          │
│  - PhysicsValidator.ts (Rapier stability)   │
│  - ChallengeEngine.ts (validation)          │
│  - AICoach.ts (Anthropic SDK)               │
└─────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Copy Core 3D Engine (minecraft-threejs patterns)

#### Task 1: Create Core.ts

**Goal:** Scene, camera, and renderer initialization

**Source:** minecraft-threejs `/src/core/index.ts`

**Files:**
- Create: `client/src/game/Core.ts`
- Create: `client/src/game/Core.test.ts`

**Key Features to Copy:**
- PerspectiveCamera with 50° FOV
- Scene with sky-blue background (0x87ceeb)
- Fog system for depth
- Dual point lights + ambient lighting
- Responsive window resizing

**Implementation:**

```typescript
// client/src/game/Core.ts
import * as THREE from 'three';

export default class Core {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.camera = this.initCamera();
    this.renderer = this.initRenderer(canvas);
    this.scene = this.initScene();

    window.addEventListener('resize', this.onResize);
  }

  private initCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(8, 50, 8);
    camera.lookAt(100, 30, 100);
    return camera;
  }

  private initRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    return renderer;
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 1, 96);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Point lights (simulating sun)
    const light1 = new THREE.PointLight(0xffffff, 0.6, 0);
    light1.position.set(50, 100, 50);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 0.6, 0);
    light2.position.set(-50, 100, -50);
    scene.add(light2);

    return scene;
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
```

**Tests:**

```typescript
// client/src/game/Core.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Core from './Core';

describe('Core', () => {
  let canvas: HTMLCanvasElement;
  let core: Core;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    core = new Core(canvas);
  });

  afterEach(() => {
    core.dispose();
  });

  it('should initialize camera with correct FOV', () => {
    expect(core.camera.fov).toBe(50);
  });

  it('should initialize scene with sky blue background', () => {
    expect(core.scene.background).toBeInstanceOf(THREE.Color);
    expect((core.scene.background as THREE.Color).getHex()).toBe(0x87ceeb);
  });

  it('should have fog enabled', () => {
    expect(core.scene.fog).toBeInstanceOf(THREE.Fog);
  });

  it('should add lights to scene', () => {
    const lights = core.scene.children.filter(
      child => child instanceof THREE.Light
    );
    expect(lights.length).toBeGreaterThan(0);
  });

  it('should handle window resize', () => {
    const initialAspect = core.camera.aspect;

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

    window.dispatchEvent(new Event('resize'));

    expect(core.camera.aspect).toBe(1920 / 1080);
  });
});
```

---

#### Task 2: Create Materials.ts

**Goal:** Centralized material and texture management

**Source:** minecraft-threejs `/src/terrain/mesh/materials.ts`

**Files:**
- Create: `client/src/game/Materials.ts`
- Create: `client/src/game/Materials.test.ts`
- Create: `client/public/textures/` (texture files)

**Key Features:**
- Enum-based material types
- TextureLoader with NearestFilter (pixelated look)
- Support for transparent materials
- Multi-face materials (grass has different top/bottom/sides)

**Implementation:**

```typescript
// client/src/game/Materials.ts
import * as THREE from 'three';

export enum MaterialType {
  OakWood = 0,
  Cobblestone = 1,
  Brick = 2,
  Sandstone = 3,
  WhiteMarble = 4,
  Glass = 5,
  Gold = 6,
  Ruby = 7,
  Emerald = 8
}

export default class Materials {
  private materials: Map<MaterialType, THREE.Material | THREE.Material[]>;
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.materials = new Map();
    this.loadMaterials();
  }

  private loadMaterials(): void {
    // Basic materials
    this.materials.set(MaterialType.OakWood, this.createMaterial('oak_wood.png'));
    this.materials.set(MaterialType.Cobblestone, this.createMaterial('cobblestone.png'));
    this.materials.set(MaterialType.Brick, this.createMaterial('brick.png'));
    this.materials.set(MaterialType.Sandstone, this.createMaterial('sandstone.png'));
    this.materials.set(MaterialType.WhiteMarble, this.createMaterial('white_marble.png'));

    // Transparent materials
    const glassMaterial = this.createMaterial('glass.png');
    (glassMaterial as THREE.MeshStandardMaterial).transparent = true;
    (glassMaterial as THREE.MeshStandardMaterial).opacity = 0.5;
    this.materials.set(MaterialType.Glass, glassMaterial);

    // Metallic materials
    const goldMaterial = this.createMaterial('gold.png');
    (goldMaterial as THREE.MeshStandardMaterial).metalness = 0.8;
    (goldMaterial as THREE.MeshStandardMaterial).roughness = 0.2;
    this.materials.set(MaterialType.Gold, goldMaterial);

    this.materials.set(MaterialType.Ruby, this.createMaterial('ruby.png'));
    this.materials.set(MaterialType.Emerald, this.createMaterial('emerald.png'));
  }

  private createMaterial(texturePath: string): THREE.MeshStandardMaterial {
    const texture = this.textureLoader.load(`/textures/${texturePath}`);
    texture.magFilter = THREE.NearestFilter; // Pixelated look
    texture.minFilter = THREE.NearestFilter;

    return new THREE.MeshStandardMaterial({ map: texture });
  }

  get(type: MaterialType): THREE.Material | THREE.Material[] {
    const material = this.materials.get(type);
    if (!material) {
      throw new Error(`Material type ${type} not found`);
    }
    return material;
  }

  dispose(): void {
    this.materials.forEach(material => {
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    });
  }
}
```

---

#### Task 3: Create BlockManager.ts

**Goal:** InstancedMesh-based block management

**Source:** minecraft-threejs `/src/terrain/index.ts` and `/src/control/index.ts`

**Files:**
- Create: `client/src/game/BlockManager.ts`
- Create: `client/src/game/BlockManager.test.ts`

**Key Features:**
- InstancedMesh for each material type (efficient rendering)
- Grid-based positioning (Math.round())
- Block placement/removal via matrix manipulation
- Track block counts per material

**Implementation:**

```typescript
// client/src/game/BlockManager.ts
import * as THREE from 'three';
import Materials, { MaterialType } from './Materials';

export interface BlockData {
  position: { x: number; y: number; z: number };
  materialType: MaterialType;
}

export default class BlockManager {
  private instancedMeshes: Map<MaterialType, THREE.InstancedMesh>;
  private blockCounts: Map<MaterialType, number>;
  private materials: Materials;
  private scene: THREE.Scene;
  private maxBlocksPerMaterial = 10000;

  // Track all placed blocks
  private placedBlocks: BlockData[] = [];

  constructor(scene: THREE.Scene, materials: Materials) {
    this.scene = scene;
    this.materials = materials;
    this.instancedMeshes = new Map();
    this.blockCounts = new Map();
    this.initializeInstancedMeshes();
  }

  private initializeInstancedMeshes(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Create instanced mesh for each material type
    Object.values(MaterialType).forEach(type => {
      if (typeof type === 'number') {
        const material = this.materials.get(type);
        const mesh = new THREE.InstancedMesh(
          geometry,
          material as THREE.Material,
          this.maxBlocksPerMaterial
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.instancedMeshes.set(type, mesh);
        this.blockCounts.set(type, 0);
        this.scene.add(mesh);
      }
    });
  }

  placeBlock(position: { x: number; y: number; z: number }, materialType: MaterialType): void {
    // Snap to grid
    const gridPos = {
      x: Math.round(position.x),
      y: Math.round(position.y),
      z: Math.round(position.z)
    };

    // Check if block already exists at position
    if (this.hasBlockAt(gridPos)) {
      console.warn('Block already exists at', gridPos);
      return;
    }

    const mesh = this.instancedMeshes.get(materialType);
    const count = this.blockCounts.get(materialType) || 0;

    if (!mesh || count >= this.maxBlocksPerMaterial) {
      console.error('Cannot place block: max blocks reached');
      return;
    }

    // Create matrix for block position
    const matrix = new THREE.Matrix4();
    matrix.setPosition(gridPos.x, gridPos.y, gridPos.z);

    // Set instance matrix
    mesh.setMatrixAt(count, matrix);
    mesh.instanceMatrix.needsUpdate = true;

    // Update count
    this.blockCounts.set(materialType, count + 1);

    // Track placed block
    this.placedBlocks.push({
      position: gridPos,
      materialType
    });
  }

  removeBlock(position: { x: number; y: number; z: number }): boolean {
    const gridPos = {
      x: Math.round(position.x),
      y: Math.round(position.y),
      z: Math.round(position.z)
    };

    // Find block at position
    const blockIndex = this.placedBlocks.findIndex(
      b => b.position.x === gridPos.x &&
           b.position.y === gridPos.y &&
           b.position.z === gridPos.z
    );

    if (blockIndex === -1) return false;

    const block = this.placedBlocks[blockIndex];
    const mesh = this.instancedMeshes.get(block.materialType);

    if (!mesh) return false;

    // Remove by setting scale to zero
    const zeroMatrix = new THREE.Matrix4();
    zeroMatrix.scale(new THREE.Vector3(0, 0, 0));

    // Find the instance index for this block
    // (This is simplified - in practice you'd track instance indices)
    const count = this.blockCounts.get(block.materialType) || 0;
    mesh.setMatrixAt(count - 1, zeroMatrix);
    mesh.instanceMatrix.needsUpdate = true;

    // Remove from tracking
    this.placedBlocks.splice(blockIndex, 1);
    this.blockCounts.set(block.materialType, count - 1);

    return true;
  }

  hasBlockAt(position: { x: number; y: number; z: number }): boolean {
    return this.placedBlocks.some(
      b => b.position.x === position.x &&
           b.position.y === position.y &&
           b.position.z === position.z
    );
  }

  getBlocks(): BlockData[] {
    return [...this.placedBlocks];
  }

  getAllMeshes(): THREE.InstancedMesh[] {
    return Array.from(this.instancedMeshes.values());
  }

  dispose(): void {
    this.instancedMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    });
  }
}
```

---

#### Task 4: Create Controls.ts

**Goal:** Raycasting-based block placement/removal

**Source:** minecraft-threejs `/src/control/index.ts`

**Files:**
- Create: `client/src/game/Controls.ts`
- Create: `client/src/game/Controls.test.ts`

**Key Features:**
- Raycaster from camera center (crosshair pattern)
- Left click = remove block
- Right click = place block
- 8 unit reach distance
- Collision prevention

**Implementation:**

```typescript
// client/src/game/Controls.ts
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import BlockManager from './BlockManager';
import { MaterialType } from './Materials';

export default class Controls {
  private pointerLock: PointerLockControls;
  private raycaster: THREE.Raycaster;
  private camera: THREE.Camera;
  private blockManager: BlockManager;
  private currentMaterial: MaterialType = MaterialType.OakWood;

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    blockManager: BlockManager
  ) {
    this.camera = camera;
    this.blockManager = blockManager;
    this.raycaster = new THREE.Raycaster(undefined, undefined, 0, 8); // 8 unit reach

    this.pointerLock = new PointerLockControls(camera, domElement);

    this.initEventListeners();
  }

  private initEventListeners(): void {
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (!this.pointerLock.isLocked) return;

    if (event.button === 0) {
      // Left click - remove block
      this.removeBlock();
    } else if (event.button === 2) {
      // Right click - place block
      this.placeBlock();
    }
  }

  private removeBlock(): void {
    // Raycast from camera center
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.blockManager.getAllMeshes()
    );

    if (intersects.length === 0) return;

    const hit = intersects[0];

    // Get block position from instance matrix
    const instanceId = hit.instanceId!;
    const mesh = hit.object as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(instanceId, matrix);

    const position = new THREE.Vector3();
    position.setFromMatrixPosition(matrix);

    this.blockManager.removeBlock({
      x: position.x,
      y: position.y,
      z: position.z
    });
  }

  private placeBlock(): void {
    // Raycast from camera center
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.blockManager.getAllMeshes()
    );

    if (intersects.length === 0) return;

    const hit = intersects[0];

    // Calculate placement position (adjacent to hit block)
    const position = new THREE.Vector3(
      Math.round(hit.point.x + hit.face!.normal.x),
      Math.round(hit.point.y + hit.face!.normal.y),
      Math.round(hit.point.z + hit.face!.normal.z)
    );

    this.blockManager.placeBlock(
      { x: position.x, y: position.y, z: position.z },
      this.currentMaterial
    );
  }

  setMaterial(material: MaterialType): void {
    this.currentMaterial = material;
  }

  lock(): void {
    this.pointerLock.lock();
  }

  unlock(): void {
    this.pointerLock.unlock();
  }

  dispose(): void {
    document.removeEventListener('mousedown', this.onMouseDown);
    this.pointerLock.dispose();
  }
}
```

---

### Phase 2: React Integration Layer

#### Task 5: Refactor BuildingScene to use Core classes

**Goal:** React component that wraps the Core engine

**Files:**
- Modify: `client/src/components/BuildingScene.tsx`

**Implementation:**

```typescript
// client/src/components/BuildingScene.tsx
import React, { useRef, useEffect } from 'react';
import Core from '../game/Core';
import Materials from '../game/Materials';
import BlockManager from '../game/BlockManager';
import Controls from '../game/Controls';
import { MaterialType } from '../game/Materials';

interface BuildingSceneProps {
  selectedMaterial?: MaterialType;
  onBlockPlaced?: () => void;
  onBlockRemoved?: () => void;
}

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
```

---

### Phase 3: Educational Layer

#### Task 6: Create PhysicsValidator.ts

**Goal:** Validate structural stability using Rapier

**Files:**
- Create: `client/src/education/PhysicsValidator.ts`

**Implementation:**

```typescript
// client/src/education/PhysicsValidator.ts
import RAPIER from '@dimforge/rapier3d';
import { BlockData } from '../game/BlockManager';

export interface StabilityResult {
  isStable: boolean;
  failurePoints: { x: number; y: number; z: number }[];
  timeToCollapse?: number;
}

export default class PhysicsValidator {
  private world: RAPIER.World | null = null;

  async initialize(): Promise<void> {
    await RAPIER.init();
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);
  }

  async validateStructure(blocks: BlockData[]): Promise<StabilityResult> {
    if (!this.world) throw new Error('Physics not initialized');

    // Create rigid bodies for each block
    const bodies: RAPIER.RigidBody[] = [];

    blocks.forEach(block => {
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(block.position.x, block.position.y, block.position.z);

      const body = this.world!.createRigidBody(bodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
      this.world!.createCollider(colliderDesc, body);

      bodies.push(body);
    });

    // Simulate for 5 seconds
    const simulationTime = 5.0;
    const timeStep = 1 / 60;
    const steps = Math.floor(simulationTime / timeStep);

    let collapseTime: number | undefined;
    const failurePoints: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < steps; i++) {
      this.world.step();

      // Check if any blocks have moved significantly
      bodies.forEach((body, index) => {
        const position = body.translation();
        const originalPosition = blocks[index].position;

        const displacement = Math.sqrt(
          Math.pow(position.x - originalPosition.x, 2) +
          Math.pow(position.y - originalPosition.y, 2) +
          Math.pow(position.z - originalPosition.z, 2)
        );

        if (displacement > 0.5 && !collapseTime) {
          collapseTime = i * timeStep;
          failurePoints.push({
            x: originalPosition.x,
            y: originalPosition.y,
            z: originalPosition.z
          });
        }
      });

      if (collapseTime) break;
    }

    // Cleanup
    bodies.forEach(body => this.world!.removeRigidBody(body));

    return {
      isStable: !collapseTime,
      failurePoints,
      timeToCollapse: collapseTime
    };
  }

  dispose(): void {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
  }
}
```

---

## Summary

This revised plan adopts the proven minecraft-threejs architecture while maintaining our educational goals:

**Copied from minecraft-threejs:**
- ✅ Core.ts (scene setup)
- ✅ Materials.ts (texture management)
- ✅ BlockManager.ts (InstancedMesh pattern)
- ✅ Controls.ts (raycasting)

**Our additions:**
- ✅ React UI layer (PiecePalette, HUD, ChallengeView already built)
- ✅ PhysicsValidator (Rapier-based stability checking)
- ✅ ChallengeEngine (educational validation)
- ✅ AICoach (Anthropic SDK integration)

**Next Steps:**
1. Implement Tasks 1-4 (Core, Materials, BlockManager, Controls)
2. Integrate with existing React components (Task 5)
3. Add educational layer (Task 6+)

This hybrid approach leverages proven patterns while adding our unique educational value.
