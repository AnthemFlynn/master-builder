// src/modules/ui/components/SaveLoadModal.ts
import { SaveSlot, SAVE_SLOT_IDS } from '../../persistence/domain/SaveSlot'

export interface SaveLoadModalCallbacks {
  onSave: (slotId: string) => Promise<void>
  onLoad: (slotId: string) => Promise<void>
  onDelete: (slotId: string) => Promise<void>
  onClose: () => void
  listSlots: () => Promise<SaveSlot[]>
}

export type SaveLoadMode = 'save' | 'load' | 'both'

export class SaveLoadModal {
  private element: HTMLElement | null = null
  private isOpen = false
  private mode: SaveLoadMode = 'both'

  constructor(private callbacks: SaveLoadModalCallbacks) {}

  async open(mode: SaveLoadMode = 'both'): Promise<void> {
    if (this.isOpen) return
    this.isOpen = true
    this.mode = mode

    const slots = await this.callbacks.listSlots()
    this.render(slots)
  }

  close(): void {
    if (!this.isOpen) return
    this.isOpen = false

    if (this.element) {
      this.element.remove()
      this.element = null
    }
    this.callbacks.onClose()
  }

  private getTitle(): string {
    switch (this.mode) {
      case 'save': return 'Save Game'
      case 'load': return 'Load Game'
      default: return 'Save / Load Game'
    }
  }

  private render(slots: SaveSlot[]): void {
    // Create modal container
    this.element = document.createElement('div')
    this.element.className = 'save-load-modal'
    this.element.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${this.getTitle()}</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          ${this.renderSlots(slots)}
        </div>
        <div class="modal-footer">
          <button class="back-btn">Back</button>
        </div>
      </div>
    `

    // Add styles
    this.addStyles()

    // Add event listeners
    this.element.querySelector('.close-btn')?.addEventListener('click', () => this.close())
    this.element.querySelector('.back-btn')?.addEventListener('click', () => this.close())
    this.element.querySelector('.modal-backdrop')?.addEventListener('click', () => this.close())

    // Slot button listeners
    this.element.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotId = (e.target as HTMLElement).dataset.slot!
        this.handleSave(slotId, slots)
      })
    })

    this.element.querySelectorAll('.load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotId = (e.target as HTMLElement).dataset.slot!
        this.handleLoad(slotId)
      })
    })

    this.element.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotId = (e.target as HTMLElement).dataset.slot!
        this.handleDelete(slotId)
      })
    })

    document.body.appendChild(this.element)
  }

  private renderSlots(slots: SaveSlot[]): string {
    // Build slot configs from SAVE_SLOT_IDS (1 autosave + 9 manual = 10 total)
    const slotConfigs = SAVE_SLOT_IDS.map(id => ({
      id,
      name: id === 'autosave' ? 'Auto-Save' : `Slot ${id.replace('slot-', '')}`,
      isAuto: id === 'autosave'
    }))

    return slotConfigs.map(config => {
      const slot = slots.find(s => s.id === config.id)
      return this.renderSlotCard(config, slot)
    }).join('')
  }

  private renderSlotCard(config: { id: string, name: string, isAuto: boolean }, slot?: SaveSlot): string {
    const isEmpty = !slot
    const icon = config.isAuto ? '* ' : ''
    const showSave = this.mode === 'save' || this.mode === 'both'
    const showLoad = this.mode === 'load' || this.mode === 'both'

    let details = ''
    let buttons = ''

    if (isEmpty) {
      details = '<div class="slot-empty">Empty</div>'
      // Can only save to empty non-auto slots
      if (showSave && !config.isAuto) {
        buttons = `<button class="save-btn" data-slot="${config.id}">Save</button>`
      }
    } else {
      const date = new Date(slot.timestamp).toLocaleString()
      const playtime = this.formatPlaytime(slot.playTime)
      const pos = slot.playerPosition
      details = `
        <div class="slot-date">${date}</div>
        <div class="slot-info">
          <span>Position: ${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}</span>
          <span>${playtime}</span>
        </div>
      `
      const loadBtn = showLoad ? `<button class="load-btn" data-slot="${config.id}">Load</button>` : ''
      const saveBtn = showSave && !config.isAuto ? `<button class="save-btn" data-slot="${config.id}">Overwrite</button>` : ''
      // Delete button for non-autosave slots only
      const deleteBtn = !config.isAuto ? `<button class="delete-btn" data-slot="${config.id}">Delete</button>` : ''
      buttons = `${loadBtn}${saveBtn}${deleteBtn}`
    }

    return `
      <div class="slot-card ${config.isAuto ? 'auto-save' : ''} ${isEmpty ? 'empty' : ''}">
        <div class="slot-header">${icon}${config.name}</div>
        ${details}
        <div class="slot-buttons">${buttons}</div>
      </div>
    `
  }

  private formatPlaytime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  private async handleSave(slotId: string, slots: SaveSlot[]): Promise<void> {
    const existingSlot = slots.find(s => s.id === slotId)

    if (existingSlot) {
      const slotName = slotId === 'slot-1' ? 'Slot 1' : slotId === 'slot-2' ? 'Slot 2' : 'Slot 3'
      const confirmed = confirm(`Overwrite ${slotName}? This cannot be undone.`)
      if (!confirmed) return
    }

    await this.callbacks.onSave(slotId)
    this.showNotification('Game Saved!')

    // Refresh slots display
    const newSlots = await this.callbacks.listSlots()
    if (this.element) {
      const body = this.element.querySelector('.modal-body')
      if (body) body.innerHTML = this.renderSlots(newSlots)
      this.reattachListeners(newSlots)
    }
  }

  private async handleLoad(slotId: string): Promise<void> {
    await this.callbacks.onLoad(slotId)
    this.close()
  }

  private async handleDelete(slotId: string): Promise<void> {
    const slotName = slotId.replace('slot-', 'Slot ')
    const confirmed = confirm(`Delete ${slotName}? This cannot be undone.`)
    if (!confirmed) return

    await this.callbacks.onDelete(slotId)
    this.showNotification('Save Deleted')

    // Refresh slots display
    const newSlots = await this.callbacks.listSlots()
    if (this.element) {
      const body = this.element.querySelector('.modal-body')
      if (body) body.innerHTML = this.renderSlots(newSlots)
      this.reattachListeners(newSlots)
    }
  }

  private reattachListeners(slots: SaveSlot[]): void {
    this.element?.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotId = (e.target as HTMLElement).dataset.slot!
        this.handleSave(slotId, slots)
      })
    })

    this.element?.querySelectorAll('.load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotId = (e.target as HTMLElement).dataset.slot!
        this.handleLoad(slotId)
      })
    })

    this.element?.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotId = (e.target as HTMLElement).dataset.slot!
        this.handleDelete(slotId)
      })
    })
  }

  private showNotification(message: string): void {
    const notification = document.createElement('div')
    notification.className = 'save-notification'
    notification.textContent = message
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 2000)
  }

  private addStyles(): void {
    if (document.getElementById('save-load-modal-styles')) return

    const style = document.createElement('style')
    style.id = 'save-load-modal-styles'
    style.textContent = `
      .save-load-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .save-load-modal .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
      }
      .save-load-modal .modal-content {
        position: relative;
        background: #2a2a2a;
        border-radius: 8px;
        width: 450px;
        max-height: 80vh;
        overflow-y: auto;
        color: white;
        font-family: sans-serif;
      }
      .save-load-modal .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #444;
      }
      .save-load-modal .modal-header h2 {
        margin: 0;
        font-size: 18px;
      }
      .save-load-modal .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      .save-load-modal .modal-body {
        padding: 16px;
      }
      .save-load-modal .modal-footer {
        padding: 12px 16px;
        border-top: 1px solid #444;
        text-align: right;
      }
      .save-load-modal .slot-card {
        background: #3a3a3a;
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 12px;
      }
      .save-load-modal .slot-card.auto-save {
        border-left: 3px solid #ffd700;
      }
      .save-load-modal .slot-card.empty {
        opacity: 0.7;
      }
      .save-load-modal .slot-header {
        font-weight: bold;
        margin-bottom: 8px;
      }
      .save-load-modal .slot-date {
        font-size: 13px;
        color: #aaa;
      }
      .save-load-modal .slot-info {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #888;
        margin-top: 4px;
      }
      .save-load-modal .slot-empty {
        color: #666;
        font-style: italic;
      }
      .save-load-modal .slot-buttons {
        margin-top: 10px;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .save-load-modal .slot-buttons button {
        padding: 6px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      .save-load-modal .load-btn {
        background: #4a7c4e;
        color: white;
      }
      .save-load-modal .load-btn:hover {
        background: #5a9c5e;
      }
      .save-load-modal .save-btn {
        background: #4a6a9c;
        color: white;
      }
      .save-load-modal .save-btn:hover {
        background: #5a7abc;
      }
      .save-load-modal .delete-btn {
        background: #8c4a4a;
        color: white;
      }
      .save-load-modal .delete-btn:hover {
        background: #a55a5a;
      }
      .save-load-modal .back-btn {
        padding: 8px 20px;
        background: #555;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
      }
      .save-load-modal .back-btn:hover {
        background: #666;
      }
      .save-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4a7c4e;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        font-family: sans-serif;
        z-index: 1001;
        animation: fadeInOut 2s ease-in-out;
      }
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }
    `
    document.head.appendChild(style)
  }
}
