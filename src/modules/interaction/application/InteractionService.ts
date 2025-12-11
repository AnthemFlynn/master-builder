import { CommandBus } from '../../game/infrastructure/CommandBus'
import { EventBus } from '../../game/infrastructure/EventBus'
import { PlaceBlockCommand } from '../../game/domain/commands/PlaceBlockCommand'
import { RemoveBlockCommand } from '../../game/domain/commands/RemoveBlockCommand'
import { BlockPicker } from './BlockPicker'
import { IInteractionHandler } from '../ports/IInteractionHandler'
import * as THREE from 'three'

export class InteractionService implements IInteractionHandler {
  private blockPicker: BlockPicker
  private selectedBlock = 14 // Default: Grass Block
  private highlightMesh: THREE.Mesh

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
    const geometry = new THREE.PlaneGeometry(1.02, 1.02)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.visible = false
    this.scene.add(mesh)
    return mesh
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
    const position = result.hitBlock.clone().addScalar(0.5)
    position.addScaledVector(result.normal, 0.51)

    // Plane geometry faces +Z by default; rotate to match the hit normal
    const defaultNormal = new THREE.Vector3(0, 0, 1)
    const targetNormal = result.normal.clone().normalize()
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultNormal, targetNormal)
    this.highlightMesh.quaternion.copy(quaternion)
    this.highlightMesh.position.set(position.x, position.y, position.z)
  }
}
