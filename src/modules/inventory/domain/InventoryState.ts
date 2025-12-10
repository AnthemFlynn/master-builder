export interface InventoryBank {
  id: number
  name: string
  slots: number[] // Block IDs (0-9)
}

export class InventoryState {
  banks: InventoryBank[]
  activeBankId: number
  selectedSlot: number // 0-9

  constructor() {
    this.banks = []
    this.activeBankId = 0
    this.selectedSlot = 0

    // Initialize 10 banks with empty slots (or default items)
    for (let i = 0; i < 10; i++) {
      this.banks.push({
        id: i,
        name: `Bank ${i + 1}`,
        slots: new Array(10).fill(0) // 0 = Air/Empty or default block
      })
    }
  }

  getBank(id: number): InventoryBank | undefined {
    return this.banks.find(b => b.id === id)
  }

  getActiveBank(): InventoryBank {
    return this.getBank(this.activeBankId)!
  }

  getSelectedBlockId(): number {
    return this.getActiveBank().slots[this.selectedSlot]
  }
}
