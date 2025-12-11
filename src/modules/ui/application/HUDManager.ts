import { UIState } from '../domain/UIState'
import { blockRegistry } from '../../blocks'
import { InventoryBank } from '../../inventory/domain/InventoryState'

export class HUDManager {
  private crosshair: HTMLDivElement
  private fpsDisplay: HTMLDivElement
  private bagDisplay: HTMLDivElement
  private slots: HTMLDivElement[] = []

  constructor() {
    // Create crosshair
    this.crosshair = document.createElement('div')
    this.crosshair.className = 'cross-hair hidden'
    this.crosshair.innerHTML = '+'
    document.body.appendChild(this.crosshair)

    // FPS display (created by FPS class in main.ts usually, but here we look for it)
    this.fpsDisplay = document.querySelector('.fps') as HTMLDivElement

    // Bag display
    this.bagDisplay = document.querySelector('.bag') as HTMLDivElement
    if (!this.bagDisplay) {
        // Create bag if missing (it should be in index.html usually)
        this.bagDisplay = document.createElement('div')
        this.bagDisplay.className = 'bag'
        document.body.appendChild(this.bagDisplay)
    }
    
    // Initialize slots
    this.bagDisplay.innerHTML = ''
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div')
        slot.className = 'item'
        this.bagDisplay.appendChild(slot)
        this.slots.push(slot)
    }
  }

  show(): void {
    this.crosshair.classList.remove('hidden')
    this.fpsDisplay?.classList.remove('hidden')
    // this.bagDisplay?.classList.remove('hidden') // User requested to hide hotbar
  }

  hide(): void {
    this.crosshair.classList.add('hidden')
    this.fpsDisplay?.classList.add('hidden')
    this.bagDisplay?.classList.add('hidden')
  }

  updateState(state: UIState): void {
    if (state === UIState.PLAYING) {
      this.show()
    } else {
      this.hide()
    }
  }

  setSelectedSlot(index: number): void {
    this.slots.forEach((slot, i) => {
      if (i === index) {
        slot.classList.add('selected')
      } else {
        slot.classList.remove('selected')
      }
    })
  }

  updateHotbar(bank: InventoryBank): void {
    // Only show first 9 slots in hotbar (0-8)
    for (let i = 0; i < 9; i++) {
        const slot = this.slots[i]
        const blockId = bank.slots[i]
        
        slot.innerHTML = '' // Clear existing
        
        if (blockId > 0) {
            const block = blockRegistry.get(blockId)
            if (block && block.icon) {
                const img = document.createElement('img')
                img.src = block.icon
                img.className = 'icon'
                img.style.imageRendering = 'pixelated'
                slot.appendChild(img)
            }
        }
    }
  }

  updateFPS(): void {
      // FPS update logic handled by external Stats.js usually
  }
}
