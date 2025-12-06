import { CommandBus } from '../../game/infrastructure/CommandBus'
import { EventBus } from '../../game/infrastructure/EventBus'
import { PlaceBlockCommand } from '../../game/domain/commands/PlaceBlockCommand'
import { BlockPicker } from './BlockPicker'
import { IInteractionHandler } from '../ports/IInteractionHandler'
import * as THREE from 'three'

export class InteractionService implements IInteractionHandler {
  private blockPicker: BlockPicker
  private selectedBlock = 0 // Default: grass

  constructor(
    private commandBus: CommandBus,
    private eventBus: EventBus,
    private scene: THREE.Scene
  ) {
    this.blockPicker = new BlockPicker()
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for mouse clicks from input module
    this.eventBus.on('input', 'InputActionEvent', (event: any) => {
      if (event.action === 'place_block' && event.eventType === 'pressed') {
        // Would call placeBlock with current camera
      }
      if (event.action === 'remove_block' && event.eventType === 'pressed') {
        // Would call removeBlock with current camera
      }
    })
  }

  placeBlock(camera: THREE.Camera, blockType: number): void {
    const result = this.blockPicker.pickBlock(camera, this.scene)

    if (result.hit && result.position && result.normal) {
      // Calculate new block position (adjacent to hit block)
      const newPosition = result.position.clone().add(result.normal)

      // Send command
      this.commandBus.send(
        new PlaceBlockCommand(
          Math.floor(newPosition.x),
          Math.floor(newPosition.y),
          Math.floor(newPosition.z),
          blockType
        )
      )
    }
  }

  removeBlock(camera: THREE.Camera): void {
    const result = this.blockPicker.pickBlock(camera, this.scene)

    if (result.hit && result.position) {
      // Send RemoveBlockCommand
      // this.commandBus.send(new RemoveBlockCommand(...))

      console.log('Block removal:', result.position)
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
}
