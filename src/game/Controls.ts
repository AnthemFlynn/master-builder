import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import BlockManager from './BlockManager';
import { MaterialType } from './Materials';
import Player, { Mode } from './Player';
import Terrain from './Terrain';
import Audio from './Audio';

export default class Controls {
  // Existing properties
  private pointerLock: PointerLockControls;
  private raycaster: THREE.Raycaster;
  private camera: THREE.Camera;
  private blockManager: BlockManager;
  private currentMaterial: MaterialType = MaterialType.OakWood;

  // Player movement properties
  private player: Player;
  private terrain: Terrain;
  private audio: Audio;
  private velocity = new THREE.Vector3(0, 0, 0);
  private isJumping = false;
  private downCollide = true;
  private keysDown = { w: false, s: false, a: false, d: false };

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    blockManager: BlockManager,
    player: Player,
    terrain: Terrain,
    audio: Audio
  ) {
    this.camera = camera;
    this.blockManager = blockManager;
    this.player = player;
    this.terrain = terrain;
    this.audio = audio;
    this.raycaster = new THREE.Raycaster(undefined, undefined, 0, 8); // 8 unit reach

    this.pointerLock = new PointerLockControls(camera, domElement);

    this.initEventListeners();
  }

  private initEventListeners(): void {
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Attach/detach keyboard listeners with pointer lock
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) {
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
      } else {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        this.velocity.set(0, 0, 0);
        this.keysDown = { w: false, s: false, a: false, d: false };
      }
    });
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;

    switch (event.key.toLowerCase()) {
      case 'w':
        this.keysDown.w = true;
        this.velocity.z = -this.player.speed;
        break;
      case 's':
        this.keysDown.s = true;
        this.velocity.z = this.player.speed;
        break;
      case 'a':
        this.keysDown.a = true;
        this.velocity.x = -this.player.speed;
        break;
      case 'd':
        this.keysDown.d = true;
        this.velocity.x = this.player.speed;
        break;
      case ' ':
        this.jump();
        break;
      case 'q':
        this.toggleMode();
        break;
    }
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.repeat) return;

    switch (event.key.toLowerCase()) {
      case 'w':
        this.keysDown.w = false;
        if (!this.keysDown.s) this.velocity.z = 0;
        break;
      case 's':
        this.keysDown.s = false;
        if (!this.keysDown.w) this.velocity.z = 0;
        break;
      case 'a':
        this.keysDown.a = false;
        if (!this.keysDown.d) this.velocity.x = 0;
        break;
      case 'd':
        this.keysDown.d = false;
        if (!this.keysDown.a) this.velocity.x = 0;
        break;
      case ' ':
        if (this.player.mode === Mode.flying) {
          this.velocity.y = 0;
        }
        break;
    }
  }

  private jump(): void {
    if (this.player.mode === Mode.walking && !this.isJumping && this.downCollide) {
      this.velocity.y = 8; // Jump impulse
      this.isJumping = true;
    } else if (this.player.mode === Mode.flying) {
      this.velocity.y = this.player.speed;
    }
  }

  private toggleMode(): void {
    if (this.player.mode === Mode.walking) {
      this.player.setMode(Mode.flying);
      this.velocity.y = 0;
    } else {
      this.player.setMode(Mode.walking);
      this.velocity.y = 0;
    }
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
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

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

    // Play sound effect
    this.audio.playSound(this.currentMaterial);
  }

  private placeBlock(): void {
    // Raycast from camera center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

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

    // Play sound effect
    this.audio.playSound(this.currentMaterial);
  }

  setMaterial(material: MaterialType): void {
    this.currentMaterial = material;
  }

  update(delta: number): void {
    if (this.player.mode === Mode.flying) {
      // Flying mode - no gravity
      this.pointerLock.moveForward(this.velocity.z * delta);
      this.pointerLock.moveRight(this.velocity.x * delta);
      this.camera.position.y += this.velocity.y * delta;
    } else {
      // Walking mode - gravity + terrain collision
      // Apply gravity
      if (!this.downCollide) {
        this.velocity.y -= 25 * delta; // Gravity acceleration
      }

      // Check terrain collision
      const terrainHeight = this.terrain.getHeightAt(
        this.camera.position.x,
        this.camera.position.z
      );
      const playerBottomY = this.camera.position.y - this.player.body.height;

      if (playerBottomY <= terrainHeight) {
        // On ground
        this.camera.position.y = terrainHeight + this.player.body.height;
        this.velocity.y = 0;
        this.downCollide = true;
        this.isJumping = false;
      } else {
        // In air
        this.downCollide = false;
      }

      // Apply movement
      this.pointerLock.moveForward(this.velocity.z * delta);
      this.pointerLock.moveRight(this.velocity.x * delta);
      this.camera.position.y += this.velocity.y * delta;
    }
  }

  lock(): void {
    this.pointerLock.lock();
  }

  unlock(): void {
    this.pointerLock.unlock();
  }

  dispose(): void {
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    this.pointerLock.dispose();
  }
}
