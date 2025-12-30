import { CommandBus } from '../../../shared/infrastructure/CommandBus'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { PlaceBlockCommand } from '../../game/domain/commands/PlaceBlockCommand'
import { RemoveBlockCommand } from '../../game/domain/commands/RemoveBlockCommand'
import { BlockPicker } from './BlockPicker'
import { IInteractionHandler } from '../ports/IInteractionHandler'
import * as THREE from 'three'

export class InteractionService implements IInteractionHandler {
  private blockPicker: BlockPicker
  private selectedBlock = 14 // Default: Grass Block
  private highlightMesh: THREE.Mesh
  private highlightGeometry: THREE.PlaneGeometry
  private highlightMaterial: THREE.MeshBasicMaterial

  // Pre-allocated objects for updateHighlight (avoid GC pressure)
  private readonly highlightPosition = new THREE.Vector3()
  private readonly highlightDefaultNormal = new THREE.Vector3(0, 0, 1)
  private readonly highlightTargetNormal = new THREE.Vector3()
  private readonly highlightQuaternion = new THREE.Quaternion()

  constructor(
    private commandBus: CommandBus,
    private eventBus: EventBus,
    private scene: THREE.Scene,
    private worldService: import('../../world/application/WorldService').WorldService
  ) {
    this.blockPicker = new BlockPicker(this.worldService)
    this.highlightMesh = this.createHighlightMesh()
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Event handling moved to GameOrchestrator since it has camera access
  }

  private createHighlightMesh(): THREE.Mesh {
    this.highlightGeometry = new THREE.PlaneGeometry(1.02, 1.02)
    this.highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true
    })
    const mesh = new THREE.Mesh(this.highlightGeometry, this.highlightMaterial)
    mesh.visible = false
    // Render after transparent blocks (water=1) to prevent z-fighting
    mesh.renderOrder = 10
    this.scene.add(mesh)
    return mesh
  }

  /**
   * Dispose of Three.js resources. Call when destroying the service.
   */
  dispose(): void {
    // Remove from scene
    this.scene.remove(this.highlightMesh)

    // Dispose geometry and material
    this.highlightGeometry.dispose()
    this.highlightMaterial.dispose()
  }

  placeBlock(camera: THREE.Camera, blockType: number): void {
    const result = this.blockPicker.pickBlock(camera, this.scene)

    if (result.hit && result.adjacentBlock) {
      const { x, y, z } = result.adjacentBlock
      this.commandBus.send(
        new PlaceBlockCommand(
          Math.floor(x),
          Math.floor(y),
          Math.floor(z),
          blockType
        )
      )
    }
  }

  removeBlock(camera: THREE.Camera): void {
    const result = this.blockPicker.pickBlock(camera, this.scene)

    if (result.hit && result.hitBlock) {
      const { x, y, z } = result.hitBlock
      this.commandBus.send(new RemoveBlockCommand(x, y, z))
    }
  }

  getSelectedBlock(): number {
    return this.selectedBlock
  }

  setSelectedBlock(blockType: number): void {
    this.selectedBlock = blockType

    // Emit event
    this.eventBus.emit('interaction', {
      type: 'BlockSelectionChangedEvent',
      timestamp: Date.now(),
      blockType
    })
  }

  updateHighlight(camera: THREE.Camera): void {
    const result = this.blockPicker.pickBlock(camera, this.scene)
    if (!result.hit || !result.hitBlock || !result.normal) {
      this.highlightMesh.visible = false
      return
    }

    this.highlightMesh.visible = true

    // Reuse pre-allocated position vector
    this.highlightPosition.copy(result.hitBlock).addScalar(0.5)
    this.highlightPosition.addScaledVector(result.normal, 0.51)

    // Plane geometry faces +Z by default; rotate to match the hit normal
    // Reuse pre-allocated vectors and quaternion
    this.highlightTargetNormal.copy(result.normal).normalize()
    this.highlightQuaternion.setFromUnitVectors(this.highlightDefaultNormal, this.highlightTargetNormal)
    this.highlightMesh.quaternion.copy(this.highlightQuaternion)
    this.highlightMesh.position.copy(this.highlightPosition)
  }
}
