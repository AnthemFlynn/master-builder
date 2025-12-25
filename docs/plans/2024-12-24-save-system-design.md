# Save System Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a complete save/load system with 3 manual slots + auto-save, persisting player state and block modifications.

**Architecture:** IndexedDB storage with modification tracking, single modal UI for save/load operations.

**Tech Stack:** TypeScript, IndexedDB (existing), EventBus integration

---

## 1. Save Slot Architecture

### 4 Save Slots Total
- **Auto-Save** - Automatic every 5 minutes during gameplay (existing, needs enhancement)
- **Slot 1, 2, 3** - Manual saves controlled by player

### Data Stored Per Slot

```typescript
interface SaveSlot {
  id: "autosave" | "slot-1" | "slot-2" | "slot-3"
  name: "Auto-Save" | "Slot 1" | "Slot 2" | "Slot 3"
  timestamp: number           // When saved
  playtime: number            // Total seconds played
  playerPosition: { x: number, y: number, z: number }
  playerMode: "walking" | "flying"
  selectedHotbarSlot: number  // 1-9
  timeOfDay: number           // 0-24 decimal hours
}

interface ModifiedBlock {
  localX: number
  localY: number
  localZ: number
  blockType: number  // 0 = air/removed, >0 = placed block
}
```

### Storage Layout (IndexedDB)
- `save-slots` store: SaveSlot metadata
- `player-data` store: Full player state per slot
- `world-data` store: Block modifications keyed by `[slotId, chunkKey]`

---

## 2. Save/Load UI Modal

### Access Points
- Main Menu: "Load Game" button opens modal
- Pause Menu: Add "Save/Load" button that opens same modal

### Modal Layout
```
┌─────────────────────────────────────────────┐
│           Save / Load Game            [X]   │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │ ★ Auto-Save                         │    │
│  │ Dec 24, 2025 - 2:34 PM              │    │
│  │ Position: 142, 68, -89  │ 1h 23m    │    │
│  │                          [Load]     │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ Slot 1                              │    │
│  │ Dec 24, 2025 - 1:15 PM              │    │
│  │ Position: 12, 70, 12    │ 45m       │    │
│  │                    [Load]  [Save]   │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ Slot 2 - Empty                      │    │
│  │                            [Save]   │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ Slot 3 - Empty                      │    │
│  │                            [Save]   │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│                              [Back]         │
└─────────────────────────────────────────────┘
```

### UI Rules
- Auto-Save: Load only (no Save button), styled with star icon
- Empty slots: Save only (no Load button)
- Filled slots: Both Load and Save buttons
- Save on filled slot: Confirmation dialog "Overwrite Slot X?"

---

## 3. Block Modifications Tracking

### ModificationTracker Service

New service to track block changes during gameplay:

```typescript
class ModificationTracker {
  // Map<chunkKey, Map<localPosKey, blockType>>
  private modifications = new Map<string, Map<string, number>>()

  // Called on BlockPlacedEvent / BlockRemovedEvent
  trackModification(worldX: number, worldY: number, worldZ: number, blockType: number): void

  // Get all modifications for a chunk
  getChunkModifications(chunkKey: string): Map<string, number> | undefined

  // Get all modifications (for saving)
  getAllModifications(): Map<string, Map<string, number>>

  // Load modifications from save
  loadModifications(data: Map<string, Map<string, number>>): void

  // Clear all (for new game)
  clear(): void
}
```

### Integration Points
- Listen to EventBus `world.BlockPlacedEvent` and `world.BlockRemovedEvent`
- Called by WorldService during chunk loading to apply modifications
- Serialized/deserialized during save/load

---

## 4. Save Flow

```
User clicks [Save] on Slot 2
    ↓
If slot has data → Show confirmation "Overwrite Slot 2?"
    ↓
On confirm (or if empty):
    1. Capture player state (position, mode, velocity)
    2. Capture selected hotbar slot from InteractionService
    3. Capture time of day from EnvironmentService
    4. Capture block modifications from ModificationTracker
    5. Write to IndexedDB:
       - save-slots: metadata
       - player-data: full player state
       - world-data: chunk modifications (one record per modified chunk)
    6. Show brief "Game Saved" notification (2 seconds)
    7. Close modal
```

---

## 5. Load Flow

```
User clicks [Load] on Slot 1
    ↓
1. Show "Loading..." indicator
2. Read all data from IndexedDB for slot
3. Clear all loaded chunks from WorldService
4. Load modifications into ModificationTracker
5. Set player position via PlayerService
6. Set player mode (walking/flying)
7. Set selected hotbar slot
8. Set time of day via EnvironmentService
9. Trigger chunk regeneration around player position
   - WorldService checks ModificationTracker during generation
   - Applies modifications before lighting/meshing
10. Close modal, resume gameplay at PLAYING state
```

---

## 6. Modification Application During Chunk Generation

```
ChunkWorker generates chunk data for (x, z)
    ↓
Worker posts CHUNK_GENERATED message to main thread
    ↓
WorldService.onChunkGenerated(coord, blockBuffer)
    ↓
Check ModificationTracker.getChunkModifications(coord.toKey())
    ↓
If modifications exist:
    For each (localPos, blockType) in modifications:
        chunkData.setBlockId(localX, localY, localZ, blockType)
    ↓
Continue normal flow: emit ChunkGeneratedEvent → lighting → meshing
```

---

## 7. Files to Create/Modify

### New Files
- `src/modules/persistence/application/ModificationTracker.ts`
- `src/modules/ui/components/SaveLoadModal.ts`
- `src/modules/ui/components/SaveSlotCard.ts`
- `src/modules/ui/components/ConfirmDialog.ts`

### Modified Files
- `src/modules/persistence/domain/GameSnapshot.ts` - Add hotbarSlot, timeOfDay
- `src/modules/persistence/application/PersistenceService.ts` - Capture/restore full state
- `src/modules/persistence/adapters/IndexedDBAdapter.ts` - Save/load world-data
- `src/modules/game/application/GameOrchestrator.ts` - Wire ModificationTracker
- `src/modules/world/application/WorldService.ts` - Apply modifications on chunk load
- `src/modules/ui/application/MenuManager.ts` - Connect Load Game button
- `src/modules/ui/application/UIService.ts` - Add pause menu Save/Load button
- `index.html` - Add modal HTML structure

---

## 8. Success Criteria

1. Player can save to any of 3 manual slots
2. Player can load from any slot (auto-save or manual)
3. Block modifications persist across save/load
4. Player position, mode, hotbar, time of day all restore correctly
5. Auto-save continues working (now includes block modifications)
6. Empty slots show "Empty", filled slots show metadata
7. Overwrite confirmation appears for non-empty slots
8. "Game Saved" notification appears briefly after save
