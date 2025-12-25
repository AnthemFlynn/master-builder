# Save System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete save/load with 3 manual slots + auto-save, persisting player state and block modifications.

**Architecture:** ModificationTracker listens to block events and stores changes. PersistenceService captures full game state. SaveLoadModal provides UI. On load, chunks regenerate and modifications are applied.

**Tech Stack:** TypeScript, IndexedDB, Three.js, EventBus

---

### Task 1: Create ModificationTracker Service

**Files:**
- Create: `src/modules/persistence/application/ModificationTracker.ts`

**Step 1: Create the ModificationTracker class**

```typescript
// src/modules/persistence/application/ModificationTracker.ts
import { EventBus } from '../../game/infrastructure/EventBus'

/**
 * Tracks block modifications (placements/removals) for save/load persistence.
 * Stores only changes from generated terrain, not full chunk data.
 */
export class ModificationTracker {
  // Map<chunkKey, Map<localPosKey, blockType>>
  // blockType: 0 = air (removed), >0 = placed block
  private modifications = new Map<string, Map<string, number>>()

  constructor(private eventBus: EventBus) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.eventBus.on('world', 'BlockPlacedEvent', (e: any) => {
      this.trackModification(e.position.x, e.position.y, e.position.z, e.blockType)
    })

    this.eventBus.on('world', 'BlockRemovedEvent', (e: any) => {
      this.trackModification(e.position.x, e.position.y, e.position.z, 0) // 0 = air
    })
  }

  /**
   * Track a block modification at world coordinates
   */
  trackModification(worldX: number, worldY: number, worldZ: number, blockType: number): void {
    const chunkX = Math.floor(worldX / 24)
    const chunkZ = Math.floor(worldZ / 24)
    const chunkKey = `${chunkX},${chunkZ}`

    const localX = ((worldX % 24) + 24) % 24
    const localZ = ((worldZ % 24) + 24) % 24
    const localKey = `${localX},${worldY},${localZ}`

    if (!this.modifications.has(chunkKey)) {
      this.modifications.set(chunkKey, new Map())
    }

    this.modifications.get(chunkKey)!.set(localKey, blockType)
  }

  /**
   * Get modifications for a specific chunk
   */
  getChunkModifications(chunkKey: string): Map<string, number> | undefined {
    return this.modifications.get(chunkKey)
  }

  /**
   * Get all modifications (for saving)
   */
  getAllModifications(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {}
    for (const [chunkKey, mods] of this.modifications) {
      result[chunkKey] = Object.fromEntries(mods)
    }
    return result
  }

  /**
   * Load modifications from save data
   */
  loadModifications(data: Record<string, Record<string, number>>): void {
    this.modifications.clear()
    for (const chunkKey in data) {
      this.modifications.set(chunkKey, new Map(Object.entries(data[chunkKey]).map(
        ([k, v]) => [k, Number(v)]
      )))
    }
  }

  /**
   * Check if any modifications exist
   */
  hasModifications(): boolean {
    return this.modifications.size > 0
  }

  /**
   * Get count of modified chunks
   */
  getModifiedChunkCount(): number {
    return this.modifications.size
  }

  /**
   * Clear all modifications (for new game)
   */
  clear(): void {
    this.modifications.clear()
  }
}
```

**Step 2: Build and verify no errors**

Run: `bun run build`
Expected: `✅ Build Complete!`

**Step 3: Commit**

```bash
git add src/modules/persistence/application/ModificationTracker.ts
git commit -m "feat(persistence): add ModificationTracker for block changes"
```

---

### Task 2: Update GameSnapshot Domain Model

**Files:**
- Modify: `src/modules/persistence/domain/GameSnapshot.ts`

**Step 1: Update GameSnapshot interface**

```typescript
// src/modules/persistence/domain/GameSnapshot.ts

export interface PlayerSnapshot {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  mode: string // 'walking' | 'flying'
  speed: number
  falling: boolean
  jumpVelocity: number
}

export interface GameSnapshot {
  version: string
  player: PlayerSnapshot
  // NEW FIELDS
  selectedHotbarSlot: number
  timeOfDay: number | null  // null = use real time
  blockModifications: Record<string, Record<string, number>>
  metadata: {
    savedAt: number
    playTime: number
  }
}
```

**Step 2: Build and verify**

Run: `bun run build`
Expected: Build may fail due to missing fields - that's expected, we'll fix in next task.

**Step 3: Commit**

```bash
git add src/modules/persistence/domain/GameSnapshot.ts
git commit -m "feat(persistence): extend GameSnapshot with hotbar, time, modifications"
```

---

### Task 3: Update PersistenceService to Capture Full State

**Files:**
- Modify: `src/modules/persistence/application/PersistenceService.ts`

**Step 1: Read current file and update captureGameSnapshot**

The service needs references to:
- PlayerService (existing)
- InteractionService (for hotbar)
- EnvironmentService (for time)
- ModificationTracker (for block changes)

Update the capture method to include all new fields:

```typescript
// In PersistenceService.ts - update captureGameSnapshot method

captureGameSnapshot(
  playerService: any,
  interactionService: any,
  environmentService: any,
  modificationTracker: ModificationTracker
): GameSnapshot {
  const position = playerService.getPosition()
  const velocity = playerService.getVelocity()

  return {
    version: '1.0.0',
    player: {
      position: { x: position.x, y: position.y, z: position.z },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      mode: playerService.getMode(),
      speed: playerService.getSpeed(),
      falling: playerService.isFalling(),
      jumpVelocity: playerService.getJumpVelocity()
    },
    selectedHotbarSlot: interactionService.getSelectedBlock(),
    timeOfDay: environmentService.getTimeOfDay?.() ?? null,
    blockModifications: modificationTracker.getAllModifications(),
    metadata: {
      savedAt: Date.now(),
      playTime: 0 // TODO: Track actual play time
    }
  }
}
```

**Step 2: Update restoreGameSnapshot method**

```typescript
restoreGameSnapshot(
  snapshot: GameSnapshot,
  playerService: any,
  interactionService: any,
  environmentService: any,
  modificationTracker: ModificationTracker
): void {
  // Restore player state
  playerService.setPosition(
    snapshot.player.position.x,
    snapshot.player.position.y,
    snapshot.player.position.z
  )
  playerService.setVelocity(
    snapshot.player.velocity.x,
    snapshot.player.velocity.y,
    snapshot.player.velocity.z
  )
  playerService.setMode(snapshot.player.mode)

  // Restore hotbar selection
  interactionService.setSelectedBlock(snapshot.selectedHotbarSlot)

  // Restore time of day
  if (snapshot.timeOfDay !== null) {
    environmentService.setHour(snapshot.timeOfDay)
  }

  // Load block modifications
  modificationTracker.loadModifications(snapshot.blockModifications)
}
```

**Step 3: Build and verify**

Run: `bun run build`
Expected: May have errors from callers - we'll fix those next.

**Step 4: Commit**

```bash
git add src/modules/persistence/application/PersistenceService.ts
git commit -m "feat(persistence): capture/restore full game state including modifications"
```

---

### Task 4: Update IndexedDBAdapter for World Data

**Files:**
- Modify: `src/modules/persistence/adapters/IndexedDBAdapter.ts`

**Step 1: Add methods for world-data storage**

Add these methods to IndexedDBAdapter:

```typescript
/**
 * Save block modifications for a slot
 */
async saveWorldData(slotId: string, modifications: Record<string, Record<string, number>>): Promise<void> {
  if (!this.db) throw new Error('[IndexedDBAdapter] Database not initialized')

  const transaction = this.db.transaction(['world-data'], 'readwrite')
  const store = transaction.objectStore('world-data')

  // Clear existing world data for this slot
  const index = store.index('slotId')
  const clearRequest = index.openCursor(IDBKeyRange.only(slotId))

  await new Promise<void>((resolve, reject) => {
    clearRequest.onsuccess = () => {
      const cursor = clearRequest.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    clearRequest.onerror = () => reject(clearRequest.error)
  })

  // Save new world data
  for (const chunkKey in modifications) {
    store.put({
      slotId,
      chunkKey,
      modifications: modifications[chunkKey]
    })
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * Load block modifications for a slot
 */
async loadWorldData(slotId: string): Promise<Record<string, Record<string, number>>> {
  if (!this.db) throw new Error('[IndexedDBAdapter] Database not initialized')

  const transaction = this.db.transaction(['world-data'], 'readonly')
  const store = transaction.objectStore('world-data')
  const index = store.index('slotId')

  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only(slotId))
    const result: Record<string, Record<string, number>> = {}

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        result[cursor.value.chunkKey] = cursor.value.modifications
        cursor.continue()
      } else {
        resolve(result)
      }
    }
    request.onerror = () => reject(request.error)
  })
}
```

**Step 2: Update saveGame to include world data**

Modify the existing `saveGame` method to also save world data:

```typescript
async saveGame(slotId: string, snapshot: GameSnapshot): Promise<SaveSlot> {
  if (!this.db) throw new Error('[IndexedDBAdapter] Database not initialized')

  // Save world data first
  await this.saveWorldData(slotId, snapshot.blockModifications)

  // ... rest of existing saveGame code
}
```

**Step 3: Update loadGame to include world data**

Modify `loadGame` to load world data:

```typescript
async loadGame(slotId: string): Promise<GameSnapshot> {
  if (!this.db) throw new Error('[IndexedDBAdapter] Database not initialized')

  // Load world data
  const blockModifications = await this.loadWorldData(slotId)

  // ... existing player data loading ...

  // Add to snapshot
  const snapshot: GameSnapshot = {
    version: '1.0.0',
    player: { /* existing */ },
    selectedHotbarSlot: playerData.selectedHotbarSlot ?? 1,
    timeOfDay: playerData.timeOfDay ?? null,
    blockModifications,
    metadata: { /* existing */ }
  }

  return snapshot
}
```

**Step 4: Build and verify**

Run: `bun run build`
Expected: `✅ Build Complete!`

**Step 5: Commit**

```bash
git add src/modules/persistence/adapters/IndexedDBAdapter.ts
git commit -m "feat(persistence): add world-data save/load to IndexedDBAdapter"
```

---

### Task 5: Wire ModificationTracker to GameOrchestrator

**Files:**
- Modify: `src/modules/game/application/GameOrchestrator.ts`

**Step 1: Create and wire ModificationTracker**

In GameOrchestrator constructor, after creating eventBus:

```typescript
import { ModificationTracker } from '../../persistence/application/ModificationTracker'

// In constructor, after eventBus creation:
this.modificationTracker = new ModificationTracker(this.eventBus)
```

Add class property:

```typescript
private modificationTracker: ModificationTracker
```

**Step 2: Update command handler registrations**

Update SaveGameHandler and LoadGameHandler to receive new dependencies.

**Step 3: Build and verify**

Run: `bun run build`
Expected: `✅ Build Complete!`

**Step 4: Commit**

```bash
git add src/modules/game/application/GameOrchestrator.ts
git commit -m "feat(game): wire ModificationTracker to GameOrchestrator"
```

---

### Task 6: Apply Modifications During Chunk Loading

**Files:**
- Modify: `src/modules/world/application/WorldService.ts`

**Step 1: Add ModificationTracker reference**

```typescript
private modificationTracker?: ModificationTracker

setModificationTracker(tracker: ModificationTracker): void {
  this.modificationTracker = tracker
}
```

**Step 2: Apply modifications after chunk generation**

In the `generateChunkAsync` method, after creating the ChunkData:

```typescript
// After: const newChunk = new ChunkData(chunkCoord, blockBuffer, metadata)
// Add:
if (this.modificationTracker) {
  const mods = this.modificationTracker.getChunkModifications(key)
  if (mods) {
    for (const [localKey, blockType] of mods) {
      const [lx, ly, lz] = localKey.split(',').map(Number)
      newChunk.setBlockId(lx, ly, lz, blockType)
    }
    console.log(`📝 Applied ${mods.size} modifications to chunk (${x}, ${z})`)
  }
}
```

**Step 3: Build and verify**

Run: `bun run build`
Expected: `✅ Build Complete!`

**Step 4: Commit**

```bash
git add src/modules/world/application/WorldService.ts
git commit -m "feat(world): apply saved modifications during chunk generation"
```

---

### Task 7: Create SaveLoadModal UI Component

**Files:**
- Create: `src/modules/ui/components/SaveLoadModal.ts`

**Step 1: Create SaveLoadModal class**

```typescript
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
    const icon = config.isAuto ? '★ ' : ''

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
      const confirmed = confirm(`Overwrite ${slotId === 'slot-1' ? 'Slot 1' : slotId === 'slot-2' ? 'Slot 2' : 'Slot 3'}? This cannot be undone.`)
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
```

**Step 2: Build and verify**

Run: `bun run build`
Expected: `✅ Build Complete!`

**Step 3: Commit**

```bash
git add src/modules/ui/components/SaveLoadModal.ts
git commit -m "feat(ui): create SaveLoadModal component with full UI"
```

---

### Task 8: Connect UI to Save/Load System

**Files:**
- Modify: `src/modules/ui/application/UIService.ts`
- Modify: `src/modules/ui/application/MenuManager.ts`

**Step 1: Add SaveLoadModal to UIService**

Import and instantiate SaveLoadModal in UIService, wiring it to the command bus:

```typescript
import { SaveLoadModal } from '../components/SaveLoadModal'

// In UIService constructor or init:
this.saveLoadModal = new SaveLoadModal({
  onSave: async (slotId) => {
    this.commandBus.send(new SaveGameCommand(slotId, slotId, false))
  },
  onLoad: async (slotId) => {
    this.commandBus.send(new LoadGameCommand(slotId))
  },
  onClose: () => {
    // Return to previous state
  },
  listSlots: () => this.persistenceAdapter.listSaveSlots()
})
```

**Step 2: Connect "Load Game" button in MenuManager**

```typescript
// In MenuManager.setupMenuButtons:
document.getElementById('save')?.addEventListener('click', () => {
  this.uiService.openSaveLoadModal()
})
```

**Step 3: Add "Save/Load" button to pause menu**

In the pause menu HTML or creation code, add a Save/Load button.

**Step 4: Build and verify**

Run: `bun run build`
Expected: `✅ Build Complete!`

**Step 5: Commit**

```bash
git add src/modules/ui/application/UIService.ts src/modules/ui/application/MenuManager.ts
git commit -m "feat(ui): connect SaveLoadModal to menu buttons"
```

---

### Task 9: Update Save/Load Handlers for Full State

**Files:**
- Modify: `src/modules/persistence/application/handlers/SaveGameHandler.ts`
- Modify: `src/modules/persistence/application/handlers/LoadGameHandler.ts`

**Step 1: Update SaveGameHandler to capture full state**

Pass all required services to captureGameSnapshot.

**Step 2: Update LoadGameHandler to restore full state**

- Call restoreGameSnapshot with all services
- Clear and regenerate chunks around player
- Trigger mesh rebuilds

**Step 3: Build and verify**

Run: `bun run build`
Expected: `✅ Build Complete!`

**Step 4: Commit**

```bash
git add src/modules/persistence/application/handlers/SaveGameHandler.ts
git add src/modules/persistence/application/handlers/LoadGameHandler.ts
git commit -m "feat(persistence): update handlers to save/load full game state"
```

---

### Task 10: Integration Testing and Polish

**Step 1: Manual testing checklist**

1. Start game, place/remove some blocks
2. Open Save/Load modal from main menu
3. Save to Slot 1
4. Place more blocks
5. Load from Slot 1 - verify original blocks restored
6. Verify player position restored
7. Verify time of day restored
8. Verify hotbar selection restored
9. Save to Slot 2, verify Slot 1 unchanged
10. Test overwrite confirmation on Slot 1
11. Wait for auto-save, verify it works
12. Load auto-save, verify it works

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat(persistence): complete save/load system implementation"
```

---

## Success Criteria

- [ ] Player can save to 3 manual slots
- [ ] Player can load from any slot (auto-save or manual)
- [ ] Block modifications persist across save/load
- [ ] Player position, mode, hotbar, time of day all restore
- [ ] Auto-save includes block modifications
- [ ] UI shows slot info (timestamp, position, playtime)
- [ ] Overwrite confirmation for non-empty slots
- [ ] "Game Saved" notification appears
