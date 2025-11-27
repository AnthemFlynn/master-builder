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
