import { InventoryState } from '../domain/InventoryState'
import { EventBus } from '../../game/infrastructure/EventBus'
import { blockRegistry } from '../../blocks'

export class InventoryService {
  private state: InventoryState

  constructor(private eventBus: EventBus) {
    this.state = new InventoryState()
    this.initializeDefaultLoadout()
  }

  private initializeDefaultLoadout() {
    // Bank 0: Basic Building (Stone, Dirt, Grass, Wood)
    const bank0 = this.state.getBank(0)!
    bank0.name = "Building"
    bank0.slots[0] = 1 // Stone
    bank0.slots[1] = 2 // Dirt
    bank0.slots[2] = 3 // Grass
    bank0.slots[3] = 4 // Wood
    bank0.slots[4] = 5 // Leaves
    bank0.slots[5] = 6 // Sand
    bank0.slots[6] = 20 // Glass
    bank0.slots[7] = 8 // Plank
    bank0.slots[8] = 9 // Brick

    // Bank 1: Lighting & Ores
    const bank1 = this.state.getBank(1)!
    bank1.name = "Light & Ores"
    bank1.slots[0] = 50 // Torch/Glowstone
    bank1.slots[1] = 51 // Lamp
    // ... fill with ores
  }

  selectSlot(slotIndex: number): void {
    if (slotIndex < 0 || slotIndex > 9) return
    this.state.selectedSlot = slotIndex
    this.emitChange()
  }

  selectBank(bankId: number): void {
    if (bankId < 0 || bankId > 9) return
    this.state.activeBankId = bankId
    this.emitChange()
  }

  setSlot(bankId: number, slotIndex: number, blockId: number): void {
    const bank = this.state.getBank(bankId)
    if (bank && slotIndex >= 0 && slotIndex <= 9) {
      bank.slots[slotIndex] = blockId
      this.emitChange()
    }
  }

  getSelectedBlock(): number {
    return this.state.getSelectedBlockId()
  }

  getActiveBank() {
    return this.state.getActiveBank()
  }
  
  getAllBanks() {
    return this.state.banks
  }

  private emitChange() {
    this.eventBus.emit('inventory', {
      type: 'InventoryChangedEvent',
      timestamp: Date.now(),
      activeBank: this.state.activeBankId,
      selectedSlot: this.state.selectedSlot,
      selectedBlock: this.getSelectedBlock()
    })
  }
}
