import * as THREE from 'three'

export interface IInteractionHandler {
  placeBlock(camera: THREE.Camera, blockType: number): void
  removeBlock(camera: THREE.Camera): void
  getSelectedBlock(): number
  setSelectedBlock(blockType: number): void
}
