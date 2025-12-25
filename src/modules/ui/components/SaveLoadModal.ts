// src/modules/ui/components/SaveLoadModal.ts
import { SaveSlot } from '../../persistence/domain/SaveSlot'

export interface SaveLoadModalCallbacks {
  onSave: (slotId: string) => Promise<void>
  onLoad: (slotId: string) => Promise<void>
  onClose: () => void
  listSlots: () => Promise<SaveSlot[]>
}

export class SaveLoadModal {
  private element: HTMLElement | null = null
  private isOpen = false

  constructor(private callbacks: SaveLoadModalCallbacks) {}

  async open(): Promise<void> {
    if (this.isOpen) return
    this.isOpen = true

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

  private render(slots: SaveSlot[]): void {
    // Create modal container
    this.element = document.createElement('div')
    this.element.className = 'save-load-modal'
    this.element.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Save / Load Game</h2>
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

    document.body.appendChild(this.element)
  }

  private renderSlots(slots: SaveSlot[]): string {
    const slotConfigs = [
      { id: 'autosave', name: 'Auto-Save', isAuto: true },
      { id: 'slot-1', name: 'Slot 1', isAuto: false },
      { id: 'slot-2', name: 'Slot 2', isAuto: false },
      { id: 'slot-3', name: 'Slot 3', isAuto: false }
    ]

    return slotConfigs.map(config => {
      const slot = slots.find(s => s.id === config.id)
      return this.renderSlotCard(config, slot)
    }).join('')
  }

  private renderSlotCard(config: { id: string, name: string, isAuto: boolean }, slot?: SaveSlot): string {
    const isEmpty = !slot
    const icon = config.isAuto ? '* ' : ''

    let details = ''
    let buttons = ''

    if (isEmpty) {
      details = '<div class="slot-empty">Empty</div>'
      buttons = config.isAuto ? '' : `<button class="save-btn" data-slot="${config.id}">Save</button>`
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
      buttons = `
        <button class="load-btn" data-slot="${config.id}">Load</button>
        ${config.isAuto ? '' : `<button class="save-btn" data-slot="${config.id}">Save</button>`}
      `
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
      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
      }
      .modal-content {
        position: relative;
        background: #2a2a2a;
        border-radius: 8px;
        width: 450px;
        max-height: 80vh;
        overflow-y: auto;
        color: white;
        font-family: sans-serif;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #444;
      }
      .modal-header h2 {
        margin: 0;
        font-size: 18px;
      }
      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      .modal-body {
        padding: 16px;
      }
      .modal-footer {
        padding: 12px 16px;
        border-top: 1px solid #444;
        text-align: right;
      }
      .slot-card {
        background: #3a3a3a;
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 12px;
      }
      .slot-card.auto-save {
        border-left: 3px solid #ffd700;
      }
      .slot-card.empty {
        opacity: 0.7;
      }
      .slot-header {
        font-weight: bold;
        margin-bottom: 8px;
      }
      .slot-date {
        font-size: 13px;
        color: #aaa;
      }
      .slot-info {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #888;
        margin-top: 4px;
      }
      .slot-empty {
        color: #666;
        font-style: italic;
      }
      .slot-buttons {
        margin-top: 10px;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .slot-buttons button {
        padding: 6px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      .load-btn {
        background: #4a7c4e;
        color: white;
      }
      .load-btn:hover {
        background: #5a9c5e;
      }
      .save-btn {
        background: #4a6a9c;
        color: white;
      }
      .save-btn:hover {
        background: #5a7abc;
      }
      .back-btn {
        padding: 8px 20px;
        background: #555;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
      }
      .back-btn:hover {
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
