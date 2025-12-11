import { InventoryService } from '../../../inventory/application/InventoryService'
import { blockRegistry } from '../../../blocks'

export class CreativeModalManager {
  private container: HTMLDivElement
  private paletteGrid: HTMLDivElement
  private bankGrid: HTMLDivElement
  private tabsContainer: HTMLDivElement
  
  private activeTab = 'all'

  constructor(private inventory: InventoryService, private onClose: () => void) {
    this.container = document.createElement('div')
    this.container.className = 'creative-modal hidden'
    this.container.innerHTML = `
      <div class="modal-content">
        <button class="close-btn">&times;</button>
        <div class="sidebar">
          <h3>Categories</h3>
          <div class="tabs"></div>
          <h3>Banks</h3>
          <div class="bank-tabs"></div>
        </div>
        <div class="main-panel">
          <div class="palette-area">
            <h3>Block Library</h3>
            <div class="palette-grid"></div>
          </div>
          <div class="bank-area">
            <h3>Active Bank: <span id="bank-name">Bank 0</span></h3>
            <div class="bank-grid"></div>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(this.container)
    
    this.container.querySelector('.close-btn')!.addEventListener('click', () => {
        this.onClose()
    })
    
    this.paletteGrid = this.container.querySelector('.palette-grid')!
    this.bankGrid = this.container.querySelector('.bank-grid')!
    this.tabsContainer = this.container.querySelector('.tabs')!
    this.bankTabsContainer = this.container.querySelector('.bank-tabs')!
    
    this.setupStyles()
    this.renderTabs()
    this.renderBankButtons()
    this.renderPalette()
    this.renderBank()
  }

  show(): void {
    this.container.classList.remove('hidden')
    this.renderBank() // Refresh in case changed
    this.renderBankButtons() // Refresh active state
  }

  hide(): void {
    this.container.classList.add('hidden')
  }

  private bankTabsContainer: HTMLDivElement

  private renderBankButtons(): void {
      this.bankTabsContainer.innerHTML = ''
      const activeBank = this.inventory.getActiveBank()
      
      for (let i = 0; i < 10; i++) {
          const btn = document.createElement('button')
          btn.innerText = `Bank ${i}`
          if (activeBank.id === i) {
              btn.style.backgroundColor = '#218306' // Active highlight
          }
          btn.onclick = () => {
              this.inventory.selectBank(i)
              this.renderBank()
              this.renderBankButtons()
          }
          this.bankTabsContainer.appendChild(btn)
      }
  }

  private renderTabs(): void {
    const categories = ['all', 'ground', 'stone', 'wood', 'illumination', 'metal']
    this.tabsContainer.innerHTML = ''
    
    categories.forEach(cat => {
      const btn = document.createElement('button')
      btn.innerText = cat.charAt(0).toUpperCase() + cat.slice(1)
      btn.onclick = () => {
        this.activeTab = cat
        this.renderPalette()
      }
      this.tabsContainer.appendChild(btn)
    })
  }

  private renderPalette(): void {
    this.paletteGrid.innerHTML = ''
    
    const blocks = this.activeTab === 'all' 
      ? blockRegistry.getAllBlocks() 
      : blockRegistry.getByCategory(this.activeTab as any)
      
    blocks.forEach(block => {
      if (block.id === 0) return // Skip Air
      
      const item = document.createElement('div')
      item.className = 'inventory-slot'
      item.title = `${block.name} (ID: ${block.id})`
      
      if (block.icon) {
          const img = document.createElement('img')
          img.src = block.icon
          img.style.width = '100%'
          img.style.height = '100%'
          img.style.imageRendering = 'pixelated'
          item.appendChild(img)
      } else {
          item.innerText = block.name
      }

      item.onclick = () => {
        // Prepare to assign this block
        // For simplicity: Click Palette -> Click Bank Slot to assign
        this.startAssignment(block.id)
      }
      this.paletteGrid.appendChild(item)
    })
  }

  private selectedBlockId: number | null = null

  private startAssignment(blockId: number) {
    this.selectedBlockId = blockId
    // Visual feedback? Cursor change?
    document.body.style.cursor = 'copy'
  }

  private renderBank(): void {
    this.bankGrid.innerHTML = ''
    const bank = this.inventory.getActiveBank()
    
    // Update header
    const header = this.container.querySelector('#bank-name')
    if (header) header.textContent = bank.name
    
    bank.slots.forEach((blockId, index) => {
      const slot = document.createElement('div')
      slot.className = 'inventory-slot'
      slot.style.position = 'relative' // For number overlay
      
      // Number Label (1-9, 0)
      const label = document.createElement('span')
      label.innerText = index === 9 ? '0' : String(index + 1)
      label.className = 'slot-number'
      slot.appendChild(label)
      
      if (blockId > 0) {
          const block = blockRegistry.get(blockId)
          if (block) {
              slot.title = block.name
              if (block.icon) {
                  const img = document.createElement('img')
                  img.src = block.icon
                  img.style.width = '100%'
                  img.style.height = '100%'
                  img.style.imageRendering = 'pixelated'
                  slot.appendChild(img)
              } else {
                  slot.innerText = block.name
              }
          } else {
              slot.innerText = '???'
          }
      } else {
          slot.innerText = 'Empty'
          slot.classList.add('empty')
      }
      
      slot.onclick = () => {
        if (this.selectedBlockId !== null) {
          this.inventory.setSlot(bank.id, index, this.selectedBlockId)
          this.selectedBlockId = null
          document.body.style.cursor = 'default'
          this.renderBank()
        }
      }
      
      this.bankGrid.appendChild(slot)
    })
  }

  private setupStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      .creative-modal {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 2000;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
      }
      .creative-modal.hidden { display: none; }
      
      .modal-content {
        width: 1000px;
        max-width: 95vw;
        height: 600px;
        background: #333;
        display: flex;
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      }
      
      .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: transparent;
        border: none;
        color: #999;
        font-size: 24px;
        cursor: pointer;
        z-index: 10;
        line-height: 1;
      }
      .close-btn:hover { color: white; }
      
      .sidebar {
        width: 150px;
        background: #222;
        padding: 10px;
        border-right: 1px solid #444;
      }
      
      .sidebar button {
        display: block;
        width: 100%;
        padding: 8px;
        margin-bottom: 5px;
        background: #444;
        border: none;
        color: white;
        cursor: pointer;
      }
      
      .sidebar button:hover { background: #555; }
      
      .main-panel {
        flex: 1;
        padding: 20px;
        display: flex;
        flex-direction: column;
      }
      
      .palette-area {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 20px;
      }
      
      .palette-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
        gap: 8px;
      }
      
      .bank-area {
        height: 150px;
        background: #2a2a2a;
        padding: 10px;
        border-top: 1px solid #555;
      }
      
      .bank-grid {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 8px;
      }
      
      .inventory-slot {
        aspect-ratio: 1;
        background: #444;
        border: 2px solid #555;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        text-align: center;
        cursor: pointer;
        word-break: break-word;
        padding: 2px;
        position: relative;
      }
      
      .slot-number {
        position: absolute;
        top: 2px;
        left: 4px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 0 #000;
        pointer-events: none;
      }
      
      .inventory-slot:hover {
        border-color: white;
        background: #555;
      }
      
      .inventory-slot.empty {
        color: #777;
        font-style: italic;
      }
    `
    document.head.appendChild(style)
  }
}
