# Hexagonal Voxel Architecture Refactor - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor voxel terrain system into enterprise-grade modular hexagonal architecture with CQRS-lite, fixing black block rendering bug by separating world data from lighting data.

**Architecture:** Five feature modules (world, lighting, meshing, rendering, terrain) each with hexagonal structure (domain/application/ports/adapters). Event-driven coordination via CQRS-lite. Strangler pattern migration preserving existing functionality.

**Tech Stack:** TypeScript 5.7, Three.js 0.181, Hexagonal Architecture, CQRS-lite, Event-Driven Design

---

## Phase 1: Foundation - CQRS Infrastructure

### Task 1: Create Event Bus (Categorized Events)

**Goal:** Event system for module communication.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/application/EventBus.ts`
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/domain/events/DomainEvent.ts`

**Step 1: Create DomainEvent base**

```typescript
// src/modules/terrain/domain/events/DomainEvent.ts
export interface DomainEvent {
  readonly type: string
  readonly timestamp: number
}
```

**Step 2: Create EventBus**

```typescript
// src/modules/terrain/application/EventBus.ts
import { DomainEvent } from '../domain/events/DomainEvent'

export type EventCategory = 'world' | 'lighting' | 'meshing' | 'rendering' | 'time'

type EventHandler = (event: DomainEvent) => void

export class EventBus {
  private listeners = new Map<string, EventHandler[]>()
  private trace: boolean = false

  emit(category: EventCategory, event: DomainEvent): void {
    if (this.trace) {
      console.log(`📢 [${category}] ${event.type}`, event)
    }

    const key = `${category}:${event.type}`
    const handlers = this.listeners.get(key) || []

    for (const handler of handlers) {
      handler(event)
    }
  }

  on(
    category: EventCategory,
    eventType: string,
    handler: EventHandler
  ): void {
    const key = `${category}:${eventType}`
    const handlers = this.listeners.get(key) || []
    handlers.push(handler)
    this.listeners.set(key, handlers)
  }

  enableTracing(): void {
    this.trace = true
  }

  disableTracing(): void {
    this.trace = false
  }
}
```

**Step 3: Commit**

```bash
git add src/modules/terrain/application/EventBus.ts src/modules/terrain/domain/events/DomainEvent.ts
git commit -m "feat: add EventBus with categorized events"
```

---

### Task 2: Create Command Bus (CQRS Core)

**Goal:** Command routing with replay capability.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/domain/commands/Command.ts`
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/application/CommandBus.ts`

**Step 1: Create Command interface**

```typescript
// src/modules/terrain/domain/commands/Command.ts
export interface Command {
  readonly type: string
  readonly timestamp: number
}

export interface CommandHandler<T extends Command> {
  execute(command: T): void
}
```

**Step 2: Create CommandBus**

```typescript
// src/modules/terrain/application/CommandBus.ts
import { Command, CommandHandler } from '../domain/commands/Command'

export class CommandBus {
  private handlers = new Map<string, CommandHandler<any>>()
  private log: Command[] = []

  register<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler)
  }

  send<T extends Command>(command: T): void {
    this.log.push(command)

    const handler = this.handlers.get(command.type)

    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`)
    }

    handler.execute(command)
  }

  replay(fromIndex: number = 0): void {
    console.log(`🔄 Replaying ${this.log.length - fromIndex} commands from index ${fromIndex}`)

    for (let i = fromIndex; i < this.log.length; i++) {
      const handler = this.handlers.get(this.log[i].type)
      if (handler) {
        handler.execute(this.log[i])
      }
    }
  }

  getLog(): readonly Command[] {
    return this.log
  }
}
```

**Step 3: Commit**

```bash
git add src/modules/terrain/domain/commands/Command.ts src/modules/terrain/application/CommandBus.ts
git commit -m "feat: add CommandBus with replay capability"
```

---

## Phase 2: World Module (Pure Voxel Data)

### Task 3: Create ChunkCoordinate Value Object

**Goal:** Type-safe chunk coordinates.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/world/domain/ChunkCoordinate.ts`

**Step 1: Implement ChunkCoordinate**

```typescript
// src/modules/world/domain/ChunkCoordinate.ts
export class ChunkCoordinate {
  constructor(
    public readonly x: number,
    public readonly z: number
  ) {}

  equals(other: ChunkCoordinate): boolean {
    return this.x === other.x && this.z === other.z
  }

  toKey(): string {
    return `${this.x},${this.z}`
  }

  static fromKey(key: string): ChunkCoordinate {
    const [x, z] = key.split(',').map(Number)
    return new ChunkCoordinate(x, z)
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/world/domain/ChunkCoordinate.ts
git commit -m "feat: add ChunkCoordinate value object"
```

---

### Task 4: Create VoxelChunk (Pure Data)

**Goal:** Voxel storage WITHOUT lighting data.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/world/domain/VoxelChunk.ts`
- Reference: `src/terrain/Chunk.ts` (for blockTypes storage pattern)

**Step 1: Implement VoxelChunk**

```typescript
// src/modules/world/domain/VoxelChunk.ts
import { ChunkCoordinate } from './ChunkCoordinate'

export class VoxelChunk {
  readonly coord: ChunkCoordinate
  private blockTypes: Int8Array
  readonly size: number = 24
  readonly height: number = 256

  constructor(coord: ChunkCoordinate) {
    this.coord = coord
    const arraySize = this.size * this.height * this.size
    this.blockTypes = new Int8Array(arraySize).fill(-1)  // Air initially
  }

  getBlockType(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return -1  // Air
    }

    const index = x + y * this.size + z * this.size * this.height
    return this.blockTypes[index]
  }

  setBlockType(x: number, y: number, z: number, blockType: number): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return
    }

    const index = x + y * this.size + z * this.size * this.height
    this.blockTypes[index] = blockType
  }

  getMemoryUsage(): number {
    return this.size * this.height * this.size  // 1 byte per voxel
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/world/domain/VoxelChunk.ts
git commit -m "feat: add VoxelChunk (pure voxel data, no lighting)"
```

---

### Task 5: Create IVoxelQuery Port

**Goal:** Interface for querying voxel data (used by lighting, meshing).

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/world/ports/IVoxelQuery.ts`

**Step 1: Define interface**

```typescript
// src/modules/world/ports/IVoxelQuery.ts
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { VoxelChunk } from '../domain/VoxelChunk'

/**
 * Port for querying voxel data
 * Implemented by WorldService
 * Used by: Lighting, Meshing modules
 */
export interface IVoxelQuery {
  /**
   * Get block type at world coordinates
   * Returns -1 for air or out of bounds
   */
  getBlockType(worldX: number, worldY: number, worldZ: number): number

  /**
   * Check if block at world coordinates is solid
   */
  isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean

  /**
   * Get chunk by coordinate (may return null if not generated)
   */
  getChunk(coord: ChunkCoordinate): VoxelChunk | null
}
```

**Step 2: Commit**

```bash
git add src/modules/world/ports/IVoxelQuery.ts
git commit -m "feat: add IVoxelQuery port interface"
```

---

### Task 6: Create WorldService

**Goal:** Public API for world module, implements IVoxelQuery.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/world/application/WorldService.ts`

**Step 1: Implement WorldService**

```typescript
// src/modules/world/application/WorldService.ts
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { VoxelChunk } from '../domain/VoxelChunk'
import { IVoxelQuery } from '../ports/IVoxelQuery'

export class WorldService implements IVoxelQuery {
  private chunks = new Map<string, VoxelChunk>()

  getChunk(coord: ChunkCoordinate): VoxelChunk | null {
    return this.chunks.get(coord.toKey()) || null
  }

  getOrCreateChunk(coord: ChunkCoordinate): VoxelChunk {
    const existing = this.chunks.get(coord.toKey())
    if (existing) return existing

    const chunk = new VoxelChunk(coord)
    this.chunks.set(coord.toKey(), chunk)
    console.log(`📦 Created VoxelChunk at (${coord.x}, ${coord.z})`)
    return chunk
  }

  getBlockType(worldX: number, worldY: number, worldZ: number): number {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const chunk = this.getChunk(coord)

    if (!chunk) return -1

    const local = this.worldToLocal(worldX, worldY, worldZ)
    return chunk.getBlockType(local.x, local.y, local.z)
  }

  isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
    const blockType = this.getBlockType(worldX, worldY, worldZ)
    return blockType !== -1  // Any non-air block is solid (can refine later)
  }

  setBlock(worldX: number, worldY: number, worldZ: number, blockType: number): void {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const chunk = this.getOrCreateChunk(coord)
    const local = this.worldToLocal(worldX, worldY, worldZ)
    chunk.setBlockType(local.x, local.y, local.z, blockType)
  }

  getAllChunks(): VoxelChunk[] {
    return Array.from(this.chunks.values())
  }

  private worldToChunkCoord(worldX: number, worldZ: number): ChunkCoordinate {
    return new ChunkCoordinate(
      Math.floor(worldX / 24),
      Math.floor(worldZ / 24)
    )
  }

  private worldToLocal(worldX: number, worldY: number, worldZ: number): { x: number, y: number, z: number } {
    return {
      x: ((worldX % 24) + 24) % 24,
      y: worldY,
      z: ((worldZ % 24) + 24) % 24
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/world/application/WorldService.ts
git commit -m "feat: add WorldService implementing IVoxelQuery"
```

---

### Task 7: Create World Module Public API

**Goal:** Strict exports for world module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/world/index.ts`

**Step 1: Export public API only**

```typescript
// src/modules/world/index.ts
export { ChunkCoordinate } from './domain/ChunkCoordinate'
export { VoxelChunk } from './domain/VoxelChunk'
export { IVoxelQuery } from './ports/IVoxelQuery'
export { WorldService } from './application/WorldService'

// Domain classes NOT exported (private to module):
// - Internal helpers
// - Private utilities
```

**Step 2: Commit**

```bash
git add src/modules/world/index.ts
git commit -m "feat: add world module public API exports"
```

---

## Phase 3: Lighting Module (Separated Storage)

### Task 8: Create LightValue Type

**Goal:** Type-safe light data structure.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/domain/LightValue.ts`

**Step 1: Define LightValue**

```typescript
// src/modules/lighting/domain/LightValue.ts
export interface RGB {
  r: number  // 0-15
  g: number  // 0-15
  b: number  // 0-15
}

export interface LightValue {
  sky: RGB
  block: RGB
}

export function combineLightChannels(light: LightValue): RGB {
  return {
    r: Math.max(light.sky.r, light.block.r),
    g: Math.max(light.sky.g, light.block.g),
    b: Math.max(light.sky.b, light.block.b)
  }
}

export function normalizeLightToColor(rgb: RGB): { r: number, g: number, b: number } {
  return {
    r: rgb.r / 15,
    g: rgb.g / 15,
    b: rgb.b / 15
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/lighting/domain/LightValue.ts
git commit -m "feat: add LightValue type with utility functions"
```

---

### Task 9: Create LightData (Separated Storage!)

**Goal:** Lighting storage separated from VoxelChunk.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/domain/LightData.ts`
- Reference: `src/terrain/Chunk.ts` (for array storage pattern)

**Step 1: Implement LightData**

```typescript
// src/modules/lighting/domain/LightData.ts
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { LightValue } from './LightValue'

export class LightData {
  readonly coord: ChunkCoordinate
  private skyLightR: Uint8Array
  private skyLightG: Uint8Array
  private skyLightB: Uint8Array
  private blockLightR: Uint8Array
  private blockLightG: Uint8Array
  private blockLightB: Uint8Array

  readonly size: number = 24
  readonly height: number = 256

  constructor(coord: ChunkCoordinate) {
    this.coord = coord
    const arraySize = this.size * this.height * this.size

    // Initialize to 0 (will be calculated by lighting pipeline)
    this.skyLightR = new Uint8Array(arraySize)
    this.skyLightG = new Uint8Array(arraySize)
    this.skyLightB = new Uint8Array(arraySize)
    this.blockLightR = new Uint8Array(arraySize)
    this.blockLightG = new Uint8Array(arraySize)
    this.blockLightB = new Uint8Array(arraySize)
  }

  getLight(x: number, y: number, z: number): LightValue {
    const index = this.getIndex(x, y, z)

    return {
      sky: {
        r: this.skyLightR[index],
        g: this.skyLightG[index],
        b: this.skyLightB[index]
      },
      block: {
        r: this.blockLightR[index],
        g: this.blockLightG[index],
        b: this.blockLightB[index]
      }
    }
  }

  setLight(x: number, y: number, z: number, value: LightValue): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return
    }

    const index = this.getIndex(x, y, z)

    this.skyLightR[index] = Math.max(0, Math.min(15, value.sky.r))
    this.skyLightG[index] = Math.max(0, Math.min(15, value.sky.g))
    this.skyLightB[index] = Math.max(0, Math.min(15, value.sky.b))
    this.blockLightR[index] = Math.max(0, Math.min(15, value.block.r))
    this.blockLightG[index] = Math.max(0, Math.min(15, value.block.g))
    this.blockLightB[index] = Math.max(0, Math.min(15, value.block.b))
  }

  private getIndex(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
      return 0
    }
    return x + y * this.size + z * this.size * this.height
  }

  getMemoryUsage(): number {
    return (this.size * this.height * this.size) * 6  // 6 bytes per voxel
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/lighting/domain/LightData.ts
git commit -m "feat: add LightData (lighting storage separated from voxels)"
```

---

### Task 10: Create ILightingPass Interface

**Goal:** Interface for lighting pipeline passes.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/application/passes/ILightingPass.ts`

**Step 1: Define interface**

```typescript
// src/modules/lighting/application/passes/ILightingPass.ts
import { LightData } from '../../domain/LightData'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../world/ports/IVoxelQuery'

export interface ILightingPass {
  /**
   * Execute this pass on a chunk's lighting data
   */
  execute(
    lightData: LightData,
    voxels: IVoxelQuery,
    coord: ChunkCoordinate
  ): void
}
```

**Step 2: Commit**

```bash
git add src/modules/lighting/application/passes/ILightingPass.ts
git commit -m "feat: add ILightingPass interface"
```

---

### Task 11: Create SkyLightPass (Phase 1 - Vertical Shadows)

**Goal:** Calculate sky shadows (vertical pass).

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/application/passes/SkyLightPass.ts`

**Step 1: Implement SkyLightPass**

```typescript
// src/modules/lighting/application/passes/SkyLightPass.ts
import { ILightingPass } from './ILightingPass'
import { LightData } from '../../domain/LightData'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../world/ports/IVoxelQuery'

export class SkyLightPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoordinate): void {
    const worldX = coord.x * 24
    const worldZ = coord.z * 24

    // Vertical shadow pass: trace from top to bottom
    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        let skyLight = 15  // Start at full brightness

        // Scan from top to bottom
        for (let localY = 255; localY >= 0; localY--) {
          const blockType = voxels.getBlockType(
            worldX + localX,
            localY,
            worldZ + localZ
          )

          if (blockType !== -1) {
            // Hit solid block - shadow below this point
            skyLight = 0
          }

          // Set sky light (block light still 0, comes from PropagationPass)
          lightData.setLight(localX, localY, localZ, {
            sky: { r: skyLight, g: skyLight, b: skyLight },
            block: { r: 0, g: 0, b: 0 }
          })
        }
      }
    }

    console.log(`☀️ SkyLightPass complete for chunk (${coord.x}, ${coord.z})`)
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/lighting/application/passes/SkyLightPass.ts
git commit -m "feat: add SkyLightPass (vertical shadow calculation)"
```

---

### Task 12: Create PropagationPass Stub (Phase 2 - Flood-Fill)

**Goal:** Placeholder for horizontal light propagation (will extract from existing LightingEngine later).

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/application/passes/PropagationPass.ts`

**Step 1: Create stub**

```typescript
// src/modules/lighting/application/passes/PropagationPass.ts
import { ILightingPass } from './ILightingPass'
import { LightData } from '../../domain/LightData'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../../world/ports/IVoxelQuery'

export class PropagationPass implements ILightingPass {
  execute(lightData: LightData, voxels: IVoxelQuery, coord: ChunkCoordinate): void {
    // TODO: Extract flood-fill logic from src/lighting/LightingEngine.ts
    // For now, stub that does nothing (SkyLightPass provides basic lighting)
    console.log(`💡 PropagationPass stub for chunk (${coord.x}, ${coord.z})`)
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/lighting/application/passes/PropagationPass.ts
git commit -m "feat: add PropagationPass stub (flood-fill pending)"
```

---

### Task 13: Create LightingPipeline (Orchestrates Passes)

**Goal:** Run lighting passes in explicit sequence.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/application/LightingPipeline.ts`

**Step 1: Implement pipeline**

```typescript
// src/modules/lighting/application/LightingPipeline.ts
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { LightData } from '../domain/LightData'
import { ILightingPass } from './passes/ILightingPass'
import { SkyLightPass } from './passes/SkyLightPass'
import { PropagationPass } from './passes/PropagationPass'

export class LightingPipeline {
  private passes: ILightingPass[] = [
    new SkyLightPass(),      // Phase 1: Vertical shadows
    new PropagationPass(),   // Phase 2: Horizontal flood-fill
  ]

  constructor(private voxelQuery: IVoxelQuery) {}

  /**
   * Execute full lighting pipeline for a chunk
   * Returns fully calculated LightData
   */
  execute(coord: ChunkCoordinate): LightData {
    const startTime = performance.now()
    const lightData = new LightData(coord)

    // Run all passes in sequence (EXPLICIT ORDER)
    for (const pass of this.passes) {
      pass.execute(lightData, this.voxelQuery, coord)
    }

    const duration = performance.now() - startTime
    console.log(`💡 Lighting pipeline complete for chunk (${coord.x}, ${coord.z}) in ${duration.toFixed(2)}ms`)

    return lightData
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/lighting/application/LightingPipeline.ts
git commit -m "feat: add LightingPipeline (explicit pass sequencing)"
```

---

### Task 14: Create ILightingQuery Port

**Goal:** Interface for querying lighting data (used by meshing).

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/ports/ILightingQuery.ts`

**Step 1: Define interface**

```typescript
// src/modules/lighting/ports/ILightingQuery.ts
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { LightValue } from '../domain/LightValue'

/**
 * Port for querying lighting data
 * Implemented by LightingService
 * Used by: Meshing module
 */
export interface ILightingQuery {
  /**
   * Get light value at world coordinates
   */
  getLight(worldX: number, worldY: number, worldZ: number): LightValue

  /**
   * Check if lighting has been calculated for chunk
   */
  isLightingReady(coord: ChunkCoordinate): boolean
}
```

**Step 2: Commit**

```bash
git add src/modules/lighting/ports/ILightingQuery.ts
git commit -m "feat: add ILightingQuery port interface"
```

---

### Task 15: Create LightingService

**Goal:** Public API for lighting module, implements ILightingQuery.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/application/LightingService.ts`

**Step 1: Implement LightingService**

```typescript
// src/modules/lighting/application/LightingService.ts
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { LightData } from '../domain/LightData'
import { LightValue } from '../domain/LightValue'
import { ILightingQuery } from '../ports/ILightingQuery'
import { LightingPipeline } from './LightingPipeline'
import { EventBus } from '../../terrain/application/EventBus'

export class LightingService implements ILightingQuery {
  private lightDataMap = new Map<string, LightData>()
  private pipeline: LightingPipeline

  constructor(
    private voxelQuery: IVoxelQuery,
    private eventBus: EventBus
  ) {
    this.pipeline = new LightingPipeline(voxelQuery)
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for chunk generation
    this.eventBus.on('world', 'ChunkGeneratedEvent', (e: any) => {
      this.calculateForChunk(e.chunkCoord, e.renderDistance)
    })
  }

  calculateForChunk(coord: ChunkCoordinate, renderDistance: number): void {
    // Check visibility (eager vs progressive)
    const playerChunk = this.getPlayerChunk()  // TODO: Get from player service
    const distance = Math.max(
      Math.abs(coord.x - playerChunk.x),
      Math.abs(coord.z - playerChunk.z)
    )

    if (distance <= renderDistance) {
      // EAGER: In render distance, calculate immediately
      this.executeImmediately(coord)
    } else {
      // PROGRESSIVE: Defer until needed
      console.log(`⏳ Deferring lighting for distant chunk (${coord.x}, ${coord.z})`)
    }
  }

  private executeImmediately(coord: ChunkCoordinate): void {
    const lightData = this.pipeline.execute(coord)
    this.lightDataMap.set(coord.toKey(), lightData)

    // Emit completion event
    this.eventBus.emit('lighting', {
      type: 'LightingCalculatedEvent',
      timestamp: Date.now(),
      chunkCoord: coord
    })
  }

  getLight(worldX: number, worldY: number, worldZ: number): LightValue {
    const coord = this.worldToChunkCoord(worldX, worldZ)
    const lightData = this.lightDataMap.get(coord.toKey())

    if (!lightData) {
      // Chunk not lit yet - return default (should not happen if pipeline works)
      return {
        sky: { r: 15, g: 15, b: 15 },
        block: { r: 0, g: 0, b: 0 }
      }
    }

    const local = this.worldToLocal(worldX, worldY, worldZ)
    return lightData.getLight(local.x, local.y, local.z)
  }

  isLightingReady(coord: ChunkCoordinate): boolean {
    return this.lightDataMap.has(coord.toKey())
  }

  private worldToChunkCoord(worldX: number, worldZ: number): ChunkCoordinate {
    return new ChunkCoordinate(
      Math.floor(worldX / 24),
      Math.floor(worldZ / 24)
    )
  }

  private worldToLocal(worldX: number, worldY: number, worldZ: number): { x: number, y: number, z: number } {
    return {
      x: ((worldX % 24) + 24) % 24,
      y: worldY,
      z: ((worldZ % 24) + 24) % 24
    }
  }

  private getPlayerChunk(): ChunkCoordinate {
    // TODO: Get from player service (for now assume origin)
    return new ChunkCoordinate(0, 0)
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/lighting/application/LightingService.ts
git commit -m "feat: add LightingService with visibility-aware calculation"
```

---

### Task 16: Create Lighting Module Public API

**Goal:** Strict exports for lighting module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/lighting/index.ts`

**Step 1: Export public API**

```typescript
// src/modules/lighting/index.ts
export { LightValue, RGB, combineLightChannels, normalizeLightToColor } from './domain/LightValue'
export { LightData } from './domain/LightData'
export { ILightingQuery } from './ports/ILightingQuery'
export { LightingService } from './application/LightingService'

// Private to module (not exported):
// - LightingPipeline (internal implementation)
// - Individual passes (internal implementation)
```

**Step 2: Commit**

```bash
git add src/modules/lighting/index.ts
git commit -m "feat: add lighting module public API exports"
```

---

## Phase 4: Meshing Module (Decoupled Geometry)

### Task 17: Update VertexBuilder to Use Ports

**Goal:** Decouple VertexBuilder from Chunk, use IVoxelQuery + ILightingQuery.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/mesh/FaceBuilder.ts`
- Create: `.worktrees/vertex-color-lighting/src/modules/meshing/application/VertexBuilder.ts`

**Step 1: Copy and refactor FaceBuilder → VertexBuilder**

```typescript
// src/modules/meshing/application/VertexBuilder.ts
import * as THREE from 'three'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ILightingQuery } from '../../lighting/ports/ILightingQuery'
import { normalizeLightToColor, combineLightChannels } from '../../lighting/domain/LightValue'

export class VertexBuilder {
  private positions: number[] = []
  private colors: number[] = []
  private uvs: number[] = []
  private indices: number[] = []
  private vertexCount = 0

  constructor(
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery
  ) {}

  addQuad(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1,
    blockType: number
  ): void {
    const vertices = this.getQuadVertices(x, y, z, width, height, axis, direction)
    const normal = this.getFaceNormal(axis, direction)

    for (let i = 0; i < 4; i++) {
      const v = vertices[i]

      // Position
      this.positions.push(v.x, v.y, v.z)

      // Read lighting from lighting module (NO calculation!)
      const lightValue = this.lighting.getLight(
        Math.floor(v.x),
        Math.floor(v.y),
        Math.floor(v.z)
      )
      const combined = combineLightChannels(lightValue)
      const light = normalizeLightToColor(combined)

      // Calculate AO (geometry-based, no lighting dependency)
      const ao = this.getVertexAO(v.x, v.y, v.z, normal) / 3.0

      // Apply lighting * AO
      this.colors.push(
        light.r * ao,
        light.g * ao,
        light.b * ao
      )

      // UVs
      this.uvs.push(v.u, v.v)
    }

    // Indices for quad (2 triangles)
    const i = this.vertexCount
    this.indices.push(
      i, i + 1, i + 2,
      i, i + 2, i + 3
    )

    this.vertexCount += 4
  }

  buildGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()

    if (this.positions.length === 0) {
      return geometry
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2))
    geometry.setIndex(this.indices)

    return geometry
  }

  private getQuadVertices(
    x: number, y: number, z: number,
    width: number, height: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): Array<{ x: number, y: number, z: number, u: number, v: number }> {
    const vertices: Array<{ x: number, y: number, z: number, u: number, v: number }> = []
    const offset = direction === 1 ? 1 : 0

    if (axis === 1) {
      // Top/Bottom face (Y axis)
      vertices.push(
        { x: x, y: y + offset, z: z, u: 0, v: 0 },
        { x: x + width, y: y + offset, z: z, u: width, v: 0 },
        { x: x + width, y: y + offset, z: z + height, u: width, v: height },
        { x: x, y: y + offset, z: z + height, u: 0, v: height }
      )
    } else if (axis === 0) {
      // Side face (X axis)
      vertices.push(
        { x: x + offset, y: y, z: z, u: 0, v: 0 },
        { x: x + offset, y: y, z: z + width, u: width, v: 0 },
        { x: x + offset, y: y + height, z: z + width, u: width, v: height },
        { x: x + offset, y: y + height, z: z, u: 0, v: height }
      )
    } else {
      // Side face (Z axis)
      vertices.push(
        { x: x, y: y, z: z + offset, u: 0, v: 0 },
        { x: x + width, y: y, z: z + offset, u: width, v: 0 },
        { x: x + width, y: y + height, z: z + offset, u: width, v: height },
        { x: x, y: y + height, z: z + offset, u: 0, v: height }
      )
    }

    return vertices
  }

  private getFaceNormal(axis: 0 | 1 | 2, direction: -1 | 1): { x: number, y: number, z: number } {
    if (axis === 0) return { x: direction, y: 0, z: 0 }
    if (axis === 1) return { x: 0, y: direction, z: 0 }
    return { x: 0, y: 0, z: direction }
  }

  private getVertexAO(
    x: number, y: number, z: number,
    normal: { x: number, y: number, z: number }
  ): number {
    // AO calculation using voxels port
    let side1 = false, side2 = false, corner = false

    const blockX = Math.floor(x)
    const blockY = Math.floor(y)
    const blockZ = Math.floor(z)

    if (normal.y === 1) {
      // Top face
      side1 = this.voxels.isBlockSolid(blockX + 1, blockY + 1, blockZ)
      side2 = this.voxels.isBlockSolid(blockX, blockY + 1, blockZ + 1)
      corner = this.voxels.isBlockSolid(blockX + 1, blockY + 1, blockZ + 1)
    } else if (normal.y === -1) {
      // Bottom face
      side1 = this.voxels.isBlockSolid(blockX + 1, blockY - 1, blockZ)
      side2 = this.voxels.isBlockSolid(blockX, blockY - 1, blockZ + 1)
      corner = this.voxels.isBlockSolid(blockX + 1, blockY - 1, blockZ + 1)
    } else if (normal.x !== 0) {
      // Side face (X axis)
      const offset = normal.x
      side1 = this.voxels.isBlockSolid(blockX + offset, blockY + 1, blockZ)
      side2 = this.voxels.isBlockSolid(blockX + offset, blockY, blockZ + 1)
      corner = this.voxels.isBlockSolid(blockX + offset, blockY + 1, blockZ + 1)
    } else {
      // Side face (Z axis)
      const offset = normal.z
      side1 = this.voxels.isBlockSolid(blockX + 1, blockY, blockZ + offset)
      side2 = this.voxels.isBlockSolid(blockX, blockY + 1, blockZ + offset)
      corner = this.voxels.isBlockSolid(blockX + 1, blockY + 1, blockZ + offset)
    }

    if (side1 && side2) {
      return 0  // Fully occluded
    }

    return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0)
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/meshing/application/VertexBuilder.ts
git commit -m "feat: add VertexBuilder using ports (decoupled from Chunk)"
```

---

### Task 18: Update GreedyMesher to Use Ports

**Goal:** Decouple GreedyMesher from Chunk.

**Files:**
- Copy: `.worktrees/vertex-color-lighting/src/terrain/mesh/GreedyMesher.ts` → `.worktrees/vertex-color-lighting/src/modules/meshing/application/GreedyMesher.ts`
- Modify: New GreedyMesher to use IVoxelQuery

**Step 1: Refactor GreedyMesher**

```typescript
// src/modules/meshing/application/GreedyMesher.ts
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ILightingQuery } from '../../lighting/ports/ILightingQuery'
import { VertexBuilder } from './VertexBuilder'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'

export class GreedyMesher {
  constructor(
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery,
    private chunkCoord: ChunkCoordinate
  ) {}

  buildMesh(vertexBuilder: VertexBuilder): void {
    // Process each axis
    for (const axis of [0, 1, 2] as const) {
      for (const direction of [-1, 1] as const) {
        this.processAxis(vertexBuilder, axis, direction)
      }
    }
  }

  private processAxis(
    vertexBuilder: VertexBuilder,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): void {
    // Use same greedy meshing algorithm from original
    // But query via this.voxels.getBlockType() and this.lighting.getLight()

    const [u, v] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1]
    const uSize = [24, 256, 24][u]
    const vSize = [24, 256, 24][v]
    const axisSize = [24, 256, 24][axis]

    const worldOffsetX = this.chunkCoord.x * 24
    const worldOffsetZ = this.chunkCoord.z * 24

    for (let d = 0; d < axisSize; d++) {
      const mask: (number | null)[][] = []
      for (let i = 0; i < uSize; i++) {
        mask[i] = []
        for (let j = 0; j < vSize; j++) {
          let localX = 0, localY = 0, localZ = 0
          if (axis === 0) { localX = d; localY = i; localZ = j }
          else if (axis === 1) { localX = i; localY = d; localZ = j }
          else { localX = i; localY = j; localZ = d }

          mask[i][j] = this.isFaceVisible(localX, localY, localZ, axis, direction)
        }
      }

      // Greedy merge (same as original)
      for (let i = 0; i < uSize; i++) {
        for (let j = 0; j < vSize; j++) {
          const blockType = mask[i][j]
          if (blockType === null) continue

          let baseX = 0, baseY = 0, baseZ = 0
          if (axis === 0) { baseX = d; baseY = i; baseZ = j }
          else if (axis === 1) { baseX = i; baseY = d; baseZ = j }
          else { baseX = i; baseY = j; baseZ = d }

          // Expand width
          let width = 1
          while (j + width < vSize) {
            if (mask[i][j + width] !== blockType) break

            let checkX = baseX, checkY = baseY, checkZ = baseZ
            if (axis === 0) checkZ += width
            else if (axis === 1) checkZ += width
            else checkY += width

            if (!this.lightMatches(baseX, baseY, baseZ, checkX, checkY, checkZ)) break

            width++
          }

          // Expand height
          let height = 1
          while (i + height < uSize) {
            let canExpand = true

            for (let k = 0; k < width; k++) {
              if (mask[i + height][j + k] !== blockType) {
                canExpand = false
                break
              }

              let checkX = baseX, checkY = baseY, checkZ = baseZ
              if (axis === 0) { checkY += height; checkZ += k }
              else if (axis === 1) { checkX += height; checkZ += k }
              else { checkX += height; checkY += k }

              if (!this.lightMatches(baseX, baseY, baseZ, checkX, checkY, checkZ)) {
                canExpand = false
                break
              }
            }

            if (!canExpand) break
            height++
          }

          vertexBuilder.addQuad(baseX, baseY, baseZ, width, height, axis, direction, blockType)

          for (let di = 0; di < height; di++) {
            for (let dj = 0; dj < width; dj++) {
              mask[i + di][j + dj] = null
            }
          }
        }
      }
    }
  }

  private isFaceVisible(
    localX: number, localY: number, localZ: number,
    axis: 0 | 1 | 2,
    direction: -1 | 1
  ): number | null {
    const worldX = this.chunkCoord.x * 24 + localX
    const worldZ = this.chunkCoord.z * 24 + localZ

    // Bounds check
    if (localX < 0 || localX >= 24 || localY < 0 || localY >= 256 || localZ < 0 || localZ >= 24) {
      return null
    }

    const currentBlock = this.voxels.getBlockType(worldX, localY, worldZ)

    if (currentBlock === -1) {
      return null  // Air has no faces
    }

    // Check neighbor
    let nx = worldX, ny = localY, nz = worldZ

    if (axis === 0) nx += direction
    else if (axis === 1) ny += direction
    else nz += direction

    const neighborBlock = this.voxels.getBlockType(nx, ny, nz)

    if (neighborBlock === -1 || neighborBlock !== currentBlock) {
      return currentBlock  // Face visible
    }

    return null  // Hidden
  }

  private lightMatches(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number
  ): boolean {
    const worldX1 = this.chunkCoord.x * 24 + x1
    const worldZ1 = this.chunkCoord.z * 24 + z1
    const worldX2 = this.chunkCoord.x * 24 + x2
    const worldZ2 = this.chunkCoord.z * 24 + z2

    const l1 = this.lighting.getLight(worldX1, y1, worldZ1)
    const l2 = this.lighting.getLight(worldX2, y2, worldZ2)

    return (
      l1.sky.r === l2.sky.r && l1.sky.g === l2.sky.g && l1.sky.b === l2.sky.b &&
      l1.block.r === l2.block.r && l1.block.g === l2.block.g && l1.block.b === l2.block.b
    )
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/meshing/application/GreedyMesher.ts
git commit -m "feat: add GreedyMesher using ports (decoupled)"
```

---

### Task 19: Create MeshingService

**Goal:** Public API for meshing module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/meshing/application/MeshingService.ts`

**Step 1: Implement MeshingService**

```typescript
// src/modules/meshing/application/MeshingService.ts
import * as THREE from 'three'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { IVoxelQuery } from '../../world/ports/IVoxelQuery'
import { ILightingQuery } from '../../lighting/ports/ILightingQuery'
import { EventBus } from '../../terrain/application/EventBus'
import { GreedyMesher } from './GreedyMesher'
import { VertexBuilder } from './VertexBuilder'

export class MeshingService {
  private dirtyQueue = new Map<string, 'block' | 'light' | 'global'>()
  private rebuildBudgetMs = 3

  constructor(
    private voxels: IVoxelQuery,
    private lighting: ILightingQuery,
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for lighting ready
    this.eventBus.on('lighting', 'LightingCalculatedEvent', (e: any) => {
      this.buildMesh(e.chunkCoord)
    })

    // Listen for lighting changes (rebuilds)
    this.eventBus.on('lighting', 'LightingInvalidatedEvent', (e: any) => {
      this.markDirty(e.chunkCoord, 'light')
    })
  }

  buildMesh(coord: ChunkCoordinate): void {
    // Check if lighting is ready
    if (!this.lighting.isLightingReady(coord)) {
      console.warn(`⚠️ Attempted to build mesh before lighting ready: (${coord.x}, ${coord.z})`)
      return
    }

    const startTime = performance.now()

    // Build geometry
    const vertexBuilder = new VertexBuilder(this.voxels, this.lighting)
    const mesher = new GreedyMesher(this.voxels, this.lighting, coord)

    mesher.buildMesh(vertexBuilder)
    const geometry = vertexBuilder.buildGeometry()

    const duration = performance.now() - startTime

    // Emit event with geometry
    this.eventBus.emit('meshing', {
      type: 'ChunkMeshBuiltEvent',
      timestamp: Date.now(),
      chunkCoord: coord,
      geometry: geometry
    })

    console.log(`🔨 Built mesh for chunk (${coord.x}, ${coord.z}) in ${duration.toFixed(2)}ms`)
  }

  markDirty(coord: ChunkCoordinate, reason: 'block' | 'light' | 'global'): void {
    const key = coord.toKey()
    const current = this.dirtyQueue.get(key)

    // Priority: block > light > global
    if (current === 'block') return

    this.dirtyQueue.set(key, reason)
  }

  processDirtyQueue(): void {
    if (this.dirtyQueue.size === 0) return

    const startTime = performance.now()
    const entries = Array.from(this.dirtyQueue.entries())

    // Sort by priority
    const priority = { block: 0, light: 1, global: 2 }
    entries.sort((a, b) => priority[a[1]] - priority[b[1]])

    let rebuilt = 0

    for (const [key, reason] of entries) {
      if (performance.now() - startTime > this.rebuildBudgetMs) {
        break
      }

      const coord = ChunkCoordinate.fromKey(key)
      this.buildMesh(coord)
      this.dirtyQueue.delete(key)
      rebuilt++
    }

    if (rebuilt > 0) {
      console.log(`🔨 Rebuilt ${rebuilt} dirty chunks (${this.dirtyQueue.size} remaining)`)
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/meshing/application/MeshingService.ts
git commit -m "feat: add MeshingService with event-driven mesh building"
```

---

### Task 20: Create Meshing Module Public API

**Goal:** Strict exports for meshing module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/meshing/index.ts`

**Step 1: Export public API**

```typescript
// src/modules/meshing/index.ts
export { MeshingService } from './application/MeshingService'

// Private to module (not exported):
// - GreedyMesher
// - VertexBuilder
// - Internal helpers
```

**Step 2: Commit**

```bash
git add src/modules/meshing/index.ts
git commit -m "feat: add meshing module public API exports"
```

---

## Phase 5: Event Definitions

### Task 21: Create WorldEvents

**Goal:** Event definitions for world module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/domain/events/WorldEvents.ts`

**Step 1: Define events**

```typescript
// src/modules/terrain/domain/events/WorldEvents.ts
import { DomainEvent } from './DomainEvent'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'
import * as THREE from 'three'

export interface ChunkGeneratedEvent extends DomainEvent {
  type: 'ChunkGeneratedEvent'
  chunkCoord: ChunkCoordinate
  renderDistance: number
}

export interface BlockPlacedEvent extends DomainEvent {
  type: 'BlockPlacedEvent'
  position: THREE.Vector3
  blockType: number
  chunkCoord: ChunkCoordinate
}

export interface BlockRemovedEvent extends DomainEvent {
  type: 'BlockRemovedEvent'
  position: THREE.Vector3
  chunkCoord: ChunkCoordinate
}
```

**Step 2: Commit**

```bash
git add src/modules/terrain/domain/events/WorldEvents.ts
git commit -m "feat: add WorldEvents definitions"
```

---

### Task 22: Create LightingEvents

**Goal:** Event definitions for lighting module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/domain/events/LightingEvents.ts`

**Step 1: Define events**

```typescript
// src/modules/terrain/domain/events/LightingEvents.ts
import { DomainEvent } from './DomainEvent'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'

export interface LightingCalculatedEvent extends DomainEvent {
  type: 'LightingCalculatedEvent'
  chunkCoord: ChunkCoordinate
}

export interface LightingInvalidatedEvent extends DomainEvent {
  type: 'LightingInvalidatedEvent'
  chunkCoord: ChunkCoordinate
  reason: 'block' | 'time'
}
```

**Step 2: Commit**

```bash
git add src/modules/terrain/domain/events/LightingEvents.ts
git commit -m "feat: add LightingEvents definitions"
```

---

### Task 23: Create MeshingEvents

**Goal:** Event definitions for meshing module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/domain/events/MeshingEvents.ts`

**Step 1: Define events**

```typescript
// src/modules/terrain/domain/events/MeshingEvents.ts
import { DomainEvent } from './DomainEvent'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'
import * as THREE from 'three'

export interface ChunkMeshBuiltEvent extends DomainEvent {
  type: 'ChunkMeshBuiltEvent'
  chunkCoord: ChunkCoordinate
  geometry: THREE.BufferGeometry
}

export interface ChunkMeshDirtyEvent extends DomainEvent {
  type: 'ChunkMeshDirtyEvent'
  chunkCoord: ChunkCoordinate
  reason: 'block' | 'light' | 'global'
}
```

**Step 2: Commit**

```bash
git add src/modules/terrain/domain/events/MeshingEvents.ts
git commit -m "feat: add MeshingEvents definitions"
```

---

## Phase 6: Command Definitions & Handlers

### Task 24: Create GenerateChunkCommand

**Goal:** Command for chunk generation.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/domain/commands/GenerateChunkCommand.ts`

**Step 1: Define command**

```typescript
// src/modules/terrain/domain/commands/GenerateChunkCommand.ts
import { Command } from './Command'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'

export class GenerateChunkCommand implements Command {
  readonly type = 'GenerateChunkCommand'
  readonly timestamp: number

  constructor(
    public readonly chunkCoord: ChunkCoordinate,
    public readonly renderDistance: number
  ) {
    this.timestamp = Date.now()
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/terrain/domain/commands/GenerateChunkCommand.ts
git commit -m "feat: add GenerateChunkCommand"
```

---

### Task 25: Create GenerateChunkHandler

**Goal:** Handler that generates chunk and emits event.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/application/handlers/GenerateChunkHandler.ts`

**Step 1: Implement handler**

```typescript
// src/modules/terrain/application/handlers/GenerateChunkHandler.ts
import { CommandHandler } from '../../domain/commands/Command'
import { GenerateChunkCommand } from '../../domain/commands/GenerateChunkCommand'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../EventBus'

export class GenerateChunkHandler implements CommandHandler<GenerateChunkCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus,
    private terrainGenerator: any  // TODO: Type this properly
  ) {}

  execute(command: GenerateChunkCommand): void {
    const chunk = this.worldService.getOrCreateChunk(command.chunkCoord)

    // Check if already generated
    if (chunk.getBlockType(12, 128, 12) !== -1) {
      console.log(`⏭️ Chunk (${command.chunkCoord.x}, ${command.chunkCoord.z}) already generated`)
      return
    }

    // Generate blocks using terrain generator
    this.terrainGenerator.populate(chunk, command.chunkCoord)

    // Emit event
    this.eventBus.emit('world', {
      type: 'ChunkGeneratedEvent',
      timestamp: Date.now(),
      chunkCoord: command.chunkCoord,
      renderDistance: command.renderDistance
    })

    console.log(`🌍 Generated chunk (${command.chunkCoord.x}, ${command.chunkCoord.z})`)
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/terrain/application/handlers/GenerateChunkHandler.ts
git commit -m "feat: add GenerateChunkHandler"
```

---

### Task 26: Create NoiseGenerator Adapter

**Goal:** Terrain generation logic (adapter for IChunkGenerator).

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/world/adapters/NoiseGenerator.ts`
- Reference: `src/terrain/index.ts:generateChunkBlocks()` (current logic)

**Step 1: Implement NoiseGenerator**

```typescript
// src/modules/world/adapters/NoiseGenerator.ts
import { VoxelChunk } from '../domain/VoxelChunk'
import { ChunkCoordinate } from '../domain/ChunkCoordinate'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

export enum BlockType {
  grass = 0,
  sand = 1,
  tree = 2,
  leaf = 3,
  dirt = 4,
  stone = 5,
  coal = 6,
  wood = 7,
  diamond = 8,
  quartz = 9,
  glass = 10,
  bedrock = 11,
  glowstone = 12,
  redstone_lamp = 13
}

export class NoiseGenerator {
  private noise: ImprovedNoise
  private seed: number
  private gap: number = 22
  private amp: number = 8

  constructor(seed?: number) {
    this.seed = seed || Math.random()
    this.noise = new ImprovedNoise()
  }

  populate(chunk: VoxelChunk, coord: ChunkCoordinate): void {
    const chunkWorldX = coord.x * 24
    const chunkWorldZ = coord.z * 24

    for (let localX = 0; localX < 24; localX++) {
      for (let localZ = 0; localZ < 24; localZ++) {
        const worldX = chunkWorldX + localX
        const worldZ = chunkWorldZ + localZ

        // Calculate height using noise
        const height = Math.floor(
          this.noise.get(worldX / this.gap, worldZ / this.gap, this.seed) * this.amp + 30
        )

        for (let localY = 0; localY < 256; localY++) {
          let blockType: BlockType | -1 = -1  // Air

          if (localY === 0) {
            blockType = BlockType.bedrock
          } else if (localY < height - 3) {
            blockType = BlockType.stone
          } else if (localY < height) {
            blockType = BlockType.dirt
          } else if (localY === Math.floor(height)) {
            blockType = BlockType.grass
          }

          if (blockType !== -1) {
            chunk.setBlockType(localX, localY, localZ, blockType)
          }
        }
      }
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/world/adapters/NoiseGenerator.ts
git commit -m "feat: add NoiseGenerator adapter for terrain generation"
```

---

## Phase 7: Rendering Module

### Task 27: Create ChunkRenderer

**Goal:** Manages THREE.Mesh lifecycle for chunks.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/rendering/application/ChunkRenderer.ts`

**Step 1: Implement ChunkRenderer**

```typescript
// src/modules/rendering/application/ChunkRenderer.ts
import * as THREE from 'three'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { EventBus } from '../../terrain/application/EventBus'

export class ChunkRenderer {
  private meshes = new Map<string, THREE.Mesh>()

  constructor(
    private scene: THREE.Scene,
    private material: THREE.Material,
    private eventBus: EventBus
  ) {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Listen for mesh built
    this.eventBus.on('meshing', 'ChunkMeshBuiltEvent', (e: any) => {
      this.updateMesh(e.chunkCoord, e.geometry)
    })
  }

  private updateMesh(coord: ChunkCoordinate, geometry: THREE.BufferGeometry): void {
    const key = coord.toKey()

    // Remove old mesh
    const oldMesh = this.meshes.get(key)
    if (oldMesh) {
      this.scene.remove(oldMesh)
      oldMesh.geometry.dispose()
    }

    // Create new mesh
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.position.set(coord.x * 24, 0, coord.z * 24)
    mesh.castShadow = true
    mesh.receiveShadow = true

    this.scene.add(mesh)
    this.meshes.set(key, mesh)
  }

  getMesh(coord: ChunkCoordinate): THREE.Mesh | null {
    return this.meshes.get(coord.toKey()) || null
  }

  disposeAll(): void {
    for (const mesh of this.meshes.values()) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
    }
    this.meshes.clear()
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/rendering/application/ChunkRenderer.ts
git commit -m "feat: add ChunkRenderer with event-driven mesh updates"
```

---

### Task 28: Create MaterialSystem

**Goal:** Material creation with vertex colors.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/rendering/application/MaterialSystem.ts`

**Step 1: Implement MaterialSystem**

```typescript
// src/modules/rendering/application/MaterialSystem.ts
import * as THREE from 'three'

export class MaterialSystem {
  private materials = new Map<string, THREE.Material>()

  constructor() {
    this.createChunkMaterial()
  }

  private createChunkMaterial(): void {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0,
      roughness: 1
    })

    this.materials.set('chunk', material)
  }

  getChunkMaterial(): THREE.Material {
    return this.materials.get('chunk')!
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/rendering/application/MaterialSystem.ts
git commit -m "feat: add MaterialSystem with vertex color support"
```

---

### Task 29: Create RenderingService

**Goal:** Public API for rendering module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/rendering/application/RenderingService.ts`

**Step 1: Implement RenderingService**

```typescript
// src/modules/rendering/application/RenderingService.ts
import * as THREE from 'three'
import { EventBus } from '../../terrain/application/EventBus'
import { ChunkRenderer } from './ChunkRenderer'
import { MaterialSystem } from './MaterialSystem'

export class RenderingService {
  private chunkRenderer: ChunkRenderer
  private materialSystem: MaterialSystem

  constructor(
    private scene: THREE.Scene,
    private eventBus: EventBus
  ) {
    this.materialSystem = new MaterialSystem()
    this.chunkRenderer = new ChunkRenderer(
      scene,
      this.materialSystem.getChunkMaterial(),
      eventBus
    )
  }

  // Public API is minimal - rendering is event-driven
  // ChunkRenderer listens to ChunkMeshBuiltEvent automatically
}
```

**Step 2: Commit**

```bash
git add src/modules/rendering/application/RenderingService.ts
git commit -m "feat: add RenderingService (event-driven rendering)"
```

---

### Task 30: Create Rendering Module Public API

**Goal:** Strict exports for rendering module.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/rendering/index.ts`

**Step 1: Export public API**

```typescript
// src/modules/rendering/index.ts
export { RenderingService } from './application/RenderingService'

// Private to module (not exported):
// - ChunkRenderer
// - MaterialSystem
```

**Step 2: Commit**

```bash
git add src/modules/rendering/index.ts
git commit -m "feat: add rendering module public API exports"
```

---

## Phase 8: Terrain Orchestrator (Wiring)

### Task 31: Create TerrainOrchestrator

**Goal:** Wire all modules together via CQRS + events.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/application/TerrainOrchestrator.ts`

**Step 1: Implement orchestrator**

```typescript
// src/modules/terrain/application/TerrainOrchestrator.ts
import * as THREE from 'three'
import { WorldService } from '../../world/application/WorldService'
import { LightingService } from '../../lighting/application/LightingService'
import { MeshingService } from '../../meshing/application/MeshingService'
import { RenderingService } from '../../rendering/application/RenderingService'
import { CommandBus } from './CommandBus'
import { EventBus } from './EventBus'
import { GenerateChunkHandler } from './handlers/GenerateChunkHandler'
import { GenerateChunkCommand } from '../domain/commands/GenerateChunkCommand'
import { ChunkCoordinate } from '../../world/domain/ChunkCoordinate'
import { NoiseGenerator } from '../../world/adapters/NoiseGenerator'

export class TerrainOrchestrator {
  private worldService: WorldService
  private lightingService: LightingService
  private meshingService: MeshingService
  private renderingService: RenderingService
  private commandBus: CommandBus
  private eventBus: EventBus

  private currentChunk = new ChunkCoordinate(0, 0)
  private previousChunk = new ChunkCoordinate(0, 0)
  private renderDistance = 3

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    // Create infrastructure
    this.commandBus = new CommandBus()
    this.eventBus = new EventBus()

    // Create modules
    this.worldService = new WorldService()
    this.lightingService = new LightingService(this.worldService, this.eventBus)
    this.meshingService = new MeshingService(this.worldService, this.lightingService, this.eventBus)
    this.renderingService = new RenderingService(scene, this.eventBus)

    // Register command handlers
    const terrainGenerator = new NoiseGenerator()
    this.commandBus.register(
      'GenerateChunkCommand',
      new GenerateChunkHandler(this.worldService, this.eventBus, terrainGenerator)
    )

    console.log('✅ TerrainOrchestrator initialized with hexagonal architecture')
  }

  update(): void {
    // Update current chunk based on camera
    const newChunk = new ChunkCoordinate(
      Math.floor(this.camera.position.x / 24),
      Math.floor(this.camera.position.z / 24)
    )

    // Generate chunks when entering new area
    if (!newChunk.equals(this.previousChunk)) {
      this.generateChunksInRenderDistance(newChunk)
      this.previousChunk = newChunk
    }

    // Process dirty mesh rebuilds (budgeted)
    this.meshingService.processDirtyQueue()
  }

  private generateChunksInRenderDistance(centerChunk: ChunkCoordinate): void {
    const distance = this.renderDistance

    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        const coord = new ChunkCoordinate(
          centerChunk.x + x,
          centerChunk.z + z
        )

        // Send command to generate
        this.commandBus.send(
          new GenerateChunkCommand(coord, this.renderDistance)
        )
      }
    }
  }

  // Public API for debugging
  enableEventTracing(): void {
    this.eventBus.enableTracing()
  }

  replayCommands(fromIndex: number): void {
    this.commandBus.replay(fromIndex)
  }
}
```

**Step 2: Commit**

```bash
git add src/modules/terrain/application/TerrainOrchestrator.ts
git commit -m "feat: add TerrainOrchestrator (module wiring)"
```

---

## Phase 9: Integration & Cutover

### Task 32: Update main.ts to Use TerrainOrchestrator

**Goal:** Switch entry point to new architecture.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/main.ts`

**Step 1: Replace Terrain with TerrainOrchestrator**

Find the current Terrain initialization (around line 20):

```typescript
// OLD
import Terrain from './terrain'
const terrain = new Terrain(scene, camera)
```

Replace with:

```typescript
// NEW
import { TerrainOrchestrator } from './modules/terrain/application/TerrainOrchestrator'
const terrain = new TerrainOrchestrator(scene, camera)

// Enable debug tracing (can disable later)
terrain.enableEventTracing()
```

**Step 2: Test compilation**

```bash
npx tsc --noEmit
```

Expected: May have errors about missing types - will fix in next tasks.

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "refactor: switch to TerrainOrchestrator (new architecture)"
```

---

### Task 33: Deprecate Old Chunk Class

**Goal:** Mark old Chunk as deprecated, prevent new usage.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/terrain/Chunk.ts`

**Step 1: Add deprecation marker**

Add at top of file:

```typescript
/**
 * @deprecated Use modules/world/VoxelChunk + modules/lighting/LightData instead
 *
 * Migration path:
 * - For voxel data: import { VoxelChunk } from '../modules/world'
 * - For lighting data: Use LightingService.getLight() via ILightingQuery
 *
 * This class will be removed after full migration to hexagonal architecture.
 */
export class Chunk {
```

**Step 2: Commit**

```bash
git add src/terrain/Chunk.ts
git commit -m "deprecate: mark Chunk for removal (use VoxelChunk + LightData)"
```

---

### Task 34: Create PlaceBlockCommand & Handler

**Goal:** Event-driven block placement.

**Files:**
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/domain/commands/PlaceBlockCommand.ts`
- Create: `.worktrees/vertex-color-lighting/src/modules/terrain/application/handlers/PlaceBlockHandler.ts`

**Step 1: Create command**

```typescript
// src/modules/terrain/domain/commands/PlaceBlockCommand.ts
import { Command } from './Command'
import * as THREE from 'three'

export class PlaceBlockCommand implements Command {
  readonly type = 'PlaceBlockCommand'
  readonly timestamp: number

  constructor(
    public readonly position: THREE.Vector3,
    public readonly blockType: number
  ) {
    this.timestamp = Date.now()
  }
}
```

**Step 2: Create handler**

```typescript
// src/modules/terrain/application/handlers/PlaceBlockHandler.ts
import { CommandHandler } from '../../domain/commands/Command'
import { PlaceBlockCommand } from '../../domain/commands/PlaceBlockCommand'
import { WorldService } from '../../../world/application/WorldService'
import { EventBus } from '../EventBus'
import { ChunkCoordinate } from '../../../world/domain/ChunkCoordinate'

export class PlaceBlockHandler implements CommandHandler<PlaceBlockCommand> {
  constructor(
    private worldService: WorldService,
    private eventBus: EventBus
  ) {}

  execute(command: PlaceBlockCommand): void {
    const { position, blockType } = command

    // Validate
    if (position.y < 0 || position.y > 255) {
      console.warn('Invalid Y position for block placement')
      return
    }

    // Update world
    this.worldService.setBlock(
      Math.floor(position.x),
      Math.floor(position.y),
      Math.floor(position.z),
      blockType
    )

    // Calculate chunk coordinate
    const chunkCoord = new ChunkCoordinate(
      Math.floor(position.x / 24),
      Math.floor(position.z / 24)
    )

    // Emit event
    this.eventBus.emit('world', {
      type: 'BlockPlacedEvent',
      timestamp: Date.now(),
      position: position,
      blockType: blockType,
      chunkCoord: chunkCoord
    })

    console.log(`🧱 Block placed at (${position.x}, ${position.y}, ${position.z})`)
  }
}
```

**Step 3: Register handler in TerrainOrchestrator**

In TerrainOrchestrator constructor, add:

```typescript
import { PlaceBlockHandler } from './handlers/PlaceBlockHandler'
import { PlaceBlockCommand } from '../domain/commands/PlaceBlockCommand'

// In constructor after GenerateChunkHandler
this.commandBus.register(
  'PlaceBlockCommand',
  new PlaceBlockHandler(this.worldService, this.eventBus)
)
```

**Step 4: Commit**

```bash
git add src/modules/terrain/domain/commands/PlaceBlockCommand.ts \
        src/modules/terrain/application/handlers/PlaceBlockHandler.ts \
        src/modules/terrain/application/TerrainOrchestrator.ts
git commit -m "feat: add PlaceBlockCommand with event-driven handler"
```

---

## Phase 10: Testing & Verification

### Task 35: Add Debug Helper to TerrainOrchestrator

**Goal:** Expose debugging capabilities to window object.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/main.ts`

**Step 1: Expose to window for console debugging**

After creating TerrainOrchestrator:

```typescript
// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).terrain = terrain
  (window as any).debug = {
    enableTracing: () => terrain.enableEventTracing(),
    replayCommands: (from: number) => terrain.replayCommands(from),
    getCommandLog: () => terrain.getCommandLog()
  }

  console.log('🐛 Debug helpers available: window.debug.enableTracing()')
}
```

**Step 2: Add getCommandLog to TerrainOrchestrator**

```typescript
// In TerrainOrchestrator class
getCommandLog(): readonly Command[] {
  return this.commandBus.getLog()
}
```

**Step 3: Commit**

```bash
git add src/main.ts src/modules/terrain/application/TerrainOrchestrator.ts
git commit -m "feat: add debug helpers for command replay and event tracing"
```

---

### Task 36: Test New Architecture End-to-End

**Goal:** Verify the event cascade works correctly.

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Open browser console (F12)**

Enable event tracing:

```javascript
window.debug.enableTracing()
```

**Step 3: Check console output**

Expected event cascade when game loads:

```
📢 [world] ChunkGeneratedEvent { chunkCoord: {x: 0, z: 0}, ... }
☀️ SkyLightPass complete for chunk (0, 0)
💡 PropagationPass stub for chunk (0, 0)
💡 Lighting pipeline complete for chunk (0, 0) in Xms
📢 [lighting] LightingCalculatedEvent { chunkCoord: {x: 0, z: 0} }
🔨 Built mesh for chunk (0, 0) in Xms
📢 [meshing] ChunkMeshBuiltEvent { chunkCoord: {x: 0, z: 0}, geometry: ... }
```

**Step 4: Visual verification**

Check in game:
- ✅ Terrain renders (blocks visible)
- ✅ NO pure black blocks (minimum brightness)
- ✅ Surface blocks brighter than underground
- ✅ Gradual darkening as you go down

**Step 5: Check vertex colors in console**

```javascript
// Find a chunk mesh
const mesh = window.terrain.renderingService.chunkRenderer.meshes.values().next().value
const colors = mesh.geometry.attributes.color.array

// Check no pure black vertices
let blackCount = 0
for (let i = 0; i < colors.length; i += 3) {
  const r = colors[i]
  const g = colors[i+1]
  const b = colors[i+2]
  if (r + g + b === 0) blackCount++
}
console.log(`Black vertices: ${blackCount} / ${colors.length / 3}`)
```

Expected: `Black vertices: 0` (no pure black!)

**Step 6: Document results**

If issues found, document in console output and proceed to fixes. If working, commit checkpoint.

```bash
git add -A
git commit -m "test: verify hexagonal architecture event cascade"
```

---

## Phase 11: Fix Black Blocks (If Still Present)

### Task 37: Add Lighting Debug Output

**Goal:** Understand what lighting values are actually being written.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/modules/lighting/application/passes/SkyLightPass.ts`

**Step 1: Add debug logging**

In SkyLightPass.execute(), after the triple loop, add:

```typescript
    // DEBUG: Sample a few positions
    const samples = [
      { x: 0, y: 255, z: 0 },   // Top of chunk
      { x: 12, y: 128, z: 12 }, // Middle
      { x: 0, y: 30, z: 0 },    // Near surface
      { x: 0, y: 10, z: 0 }     // Underground
    ]

    console.log(`☀️ SkyLightPass samples for chunk (${coord.x}, ${coord.z}):`)
    for (const s of samples) {
      const light = lightData.getLight(s.x, s.y, s.z)
      const blockType = voxels.getBlockType(
        coord.x * 24 + s.x,
        s.y,
        coord.z * 24 + s.z
      )
      console.log(`  (${s.x},${s.y},${s.z}): sky=${light.sky.r} block=${blockType}`)
    }
```

**Step 2: Run dev server and check console**

```bash
npm run dev
```

Look for SkyLightPass samples output. Expected:
- y=255 (top): sky=15 (full bright)
- y=30 (surface): sky=15 or 0 depending on if block exists
- y=10 (underground): sky=0 (shadowed)

**Step 3: Document findings**

If lighting is correct (sky=0 underground, sky=15 at top), the issue is in VertexBuilder sampling.
If lighting is wrong, the issue is in SkyLightPass calculation.

---

### Task 38: Fix VertexBuilder Sampling (If Needed)

**Goal:** Ensure vertices sample lighting from correct positions.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/src/modules/meshing/application/VertexBuilder.ts`

**Step 1: Add debug logging to vertex color calculation**

In addQuad(), after calculating light:

```typescript
      // Read lighting from lighting module
      const lightValue = this.lighting.getLight(
        Math.floor(v.x),
        Math.floor(v.y),
        Math.floor(v.z)
      )
      const combined = combineLightChannels(lightValue)
      const light = normalizeLightToColor(combined)

      // DEBUG: Log first few vertices
      if (this.vertexCount < 4) {
        console.log(`Vertex (${v.x},${v.y},${v.z}): lightValue=${JSON.stringify(lightValue)}, normalized=(${light.r.toFixed(2)},${light.g.toFixed(2)},${light.b.toFixed(2)})`)
      }

      // Calculate AO
      const ao = this.getVertexAO(v.x, v.y, v.z, normal) / 3.0
```

**Step 2: Check console for vertex light values**

Expected:
- Surface vertices: normalized ≈ (1.0, 1.0, 1.0)
- Underground vertices: normalized ≈ (0.0, 0.0, 0.0)

**Step 3: If values are correct but still black**

Check AO calculation. If `ao = 0` for all vertices, that's the issue (fully occluded incorrectly).

**Step 4: Remove debug logging once fixed**

```bash
git add src/modules/meshing/application/VertexBuilder.ts
git commit -m "fix: correct vertex lighting sampling"
```

---

## Phase 12: Cleanup & Documentation

### Task 39: Remove Debug Logging

**Goal:** Clean up console spam from debug logs.

**Files:**
- Modify: All files with debug logging added

**Step 1: Remove all `console.log` statements added for debugging**

Search for:
- "DEBUG:"
- "Vertex ("
- "samples for chunk"

Remove those console.log statements but keep:
- Feature logs ("Generated chunk", "Built mesh")
- Error logs (console.warn, console.error)

**Step 2: Commit**

```bash
git add -A
git commit -m "cleanup: remove debug logging"
```

---

### Task 40: Update CLAUDE.md Documentation

**Goal:** Document new architecture.

**Files:**
- Modify: `.worktrees/vertex-color-lighting/CLAUDE.md`

**Step 1: Replace architecture section**

Replace the entire "Vertex Color Lighting System" section with:

```markdown
## Hexagonal Voxel Architecture (2025-12-05)

### Module Structure

**5 Feature Modules:**
```
src/modules/
├─ world/           # Voxel data only (VoxelChunk, WorldService)
├─ lighting/        # Lighting calculation & storage (LightData, LightingPipeline)
├─ meshing/         # Geometry generation (GreedyMesher, VertexBuilder)
├─ rendering/       # Three.js rendering (ChunkRenderer, MaterialSystem)
└─ terrain/         # Orchestrator (CQRS, EventBus, TerrainOrchestrator)
```

### CQRS-lite Event Flow

```
User places block
  ↓
CommandBus.send(PlaceBlockCommand)
  ↓
PlaceBlockHandler → worldService.setBlock()
  ↓ emits
BlockPlacedEvent
  ↓ lighting listens
LightingService.invalidateChunk() → recalculates
  ↓ emits
LightingCalculatedEvent
  ↓ meshing listens
MeshingService.buildMesh()
  ↓ emits
ChunkMeshBuiltEvent
  ↓ rendering listens
ChunkRenderer.updateMesh() → adds to scene
```

### Key Architectural Principles

1. **Separation of Concerns**: World data (voxels) separated from rendering data (lighting)
2. **Ports & Adapters**: Modules depend on interfaces, not concrete classes
3. **Event-Driven**: Modules communicate via EventBus (no tight coupling)
4. **Command Replay**: All actions logged, can replay for debugging
5. **Strict Exports**: Only module index.ts is importable (clean boundaries)

### Debugging

**Enable event tracing:**
```javascript
window.debug.enableTracing()
// Shows full event cascade in console
```

**Replay commands:**
```javascript
window.debug.replayCommands(1500)
// Reproduces state from command index 1500
```

**Inspect lighting:**
```javascript
const lightValue = terrain.lightingService.getLight(10, 30, 10)
console.log(lightValue)  // {sky: {r, g, b}, block: {r, g, b}}
```

### Black Block Fix

**Root cause**: Lighting calculated AFTER meshing started.

**Solution**: Event-driven pipeline ensures order:
1. ChunkGeneratedEvent
2. LightingPipeline executes (SkyLightPass + PropagationPass)
3. LightingCalculatedEvent
4. Meshing reads lighting (guaranteed ready)
5. No black blocks!
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with hexagonal architecture"
```

---

## Phase 13: Final Verification

### Task 41: Run Full Test Suite

**Goal:** Ensure no regressions, all features work.

**Step 1: Manual test checklist**

```bash
npm run dev
```

**Checklist:**
- [ ] Terrain generates (49 chunks for render distance 3)
- [ ] No black blocks (all vertices have color > 0)
- [ ] Surface blocks bright
- [ ] Underground blocks dark
- [ ] Smooth gradients visible
- [ ] Place block works (right click)
- [ ] Block triggers mesh rebuild (check console for ChunkMeshBuiltEvent)
- [ ] FPS stable at 60
- [ ] No console errors

**Step 2: Performance check**

Open DevTools → Performance → Record 10 seconds

Check:
- Frame time < 16ms (60 FPS)
- Mesh rebuild cost < 3ms per frame
- No dropped frames during block placement

**Step 3: Event cascade verification**

In console:
```javascript
window.debug.enableTracing()
```

Place a block, verify console shows:
```
📢 [world] BlockPlacedEvent
📢 [lighting] LightingInvalidatedEvent
📢 [meshing] ChunkMeshDirtyEvent
📢 [meshing] ChunkMeshBuiltEvent
```

**Step 4: Document test results**

Create file:

```bash
echo "# Test Results - Hexagonal Architecture

## Visual Tests
- Terrain rendering: PASS/FAIL
- No black blocks: PASS/FAIL
- Surface bright: PASS/FAIL
- Underground dark: PASS/FAIL
- Smooth gradients: PASS/FAIL

## Functional Tests
- Block placement: PASS/FAIL
- Mesh rebuilds: PASS/FAIL
- Event cascade: PASS/FAIL

## Performance Tests
- FPS: 60 (stable/unstable)
- Frame time: Xms
- Mesh rebuild: Xms

## Architecture Tests
- Module boundaries respected: PASS/FAIL
- No old imports in modules/: PASS/FAIL
- Event tracing works: PASS/FAIL

Tested: $(date)
" > docs/test-results-hexagonal.md

git add docs/test-results-hexagonal.md
git commit -m "docs: add test results for hexagonal architecture"
```

---

## Success Criteria

### Black Block Bug Fixed
- ✅ All blocks have light > 0
- ✅ Surface ≈ 1.0, underground ≈ 0.0
- ✅ Smooth gradients
- ✅ No visual artifacts

### Architecture Quality
- ✅ 5 modules with clean boundaries
- ✅ No imports from terrain/ into modules/
- ✅ All files < 150 lines
- ✅ Event cascade visible when tracing enabled
- ✅ Command replay functional

### Performance
- ✅ 60 FPS maintained
- ✅ Mesh rebuild < 3ms
- ✅ No regressions

### Developer Experience
- ✅ Can debug via event tracing
- ✅ Can replay commands to reproduce bugs
- ✅ Each module testable in isolation
- ✅ Clear separation of concerns

---

## Migration Checklist

**Phase 1: CQRS Foundation**
- [ ] Task 1: EventBus
- [ ] Task 2: CommandBus

**Phase 2: World Module**
- [ ] Task 3: ChunkCoordinate
- [ ] Task 4: VoxelChunk
- [ ] Task 5: IVoxelQuery
- [ ] Task 6: WorldService
- [ ] Task 7: World module exports

**Phase 3: Lighting Module**
- [ ] Task 8: LightValue
- [ ] Task 9: LightData
- [ ] Task 10: ILightingPass
- [ ] Task 11: SkyLightPass
- [ ] Task 12: PropagationPass stub
- [ ] Task 13: LightingPipeline
- [ ] Task 14: ILightingQuery
- [ ] Task 15: LightingService
- [ ] Task 16: Lighting module exports

**Phase 4: Meshing Module**
- [ ] Task 17: VertexBuilder (decoupled)
- [ ] Task 18: GreedyMesher (decoupled)
- [ ] Task 19: MeshingService
- [ ] Task 20: Meshing module exports

**Phase 5: Event Definitions**
- [ ] Task 21: WorldEvents
- [ ] Task 22: LightingEvents
- [ ] Task 23: MeshingEvents

**Phase 6: Commands & Handlers**
- [ ] Task 24: GenerateChunkCommand
- [ ] Task 25: GenerateChunkHandler
- [ ] Task 26: NoiseGenerator
- [ ] Task 34: PlaceBlockCommand & Handler

**Phase 7: Rendering Module**
- [ ] Task 27: ChunkRenderer
- [ ] Task 28: MaterialSystem
- [ ] Task 29: RenderingService
- [ ] Task 30: Rendering module exports

**Phase 8: Integration**
- [ ] Task 31: TerrainOrchestrator
- [ ] Task 32: Update main.ts
- [ ] Task 33: Deprecate old Chunk

**Phase 9: Testing**
- [ ] Task 35: Debug helpers
- [ ] Task 36: End-to-end test
- [ ] Task 37-38: Fix black blocks if needed

**Phase 10: Cleanup**
- [ ] Task 39: Remove debug logging
- [ ] Task 40: Update documentation
- [ ] Task 41: Final verification

---

## Parallel Execution Strategy

**Phase 1-2 can be parallelized:**

**Agent 1: CQRS + World Module**
- Tasks 1-7 (EventBus, CommandBus, World module)
- No dependencies, can run independently

**Agent 2: Lighting Module**
- Tasks 8-16 (LightData, LightingPipeline, passes)
- Depends on IVoxelQuery interface (define early)

**Sequential after Phase 2:**
- Tasks 17-41 must run sequentially (dependencies on previous work)

---

## Notes for Implementation

### DRY Principles
- Reuse coordinate conversion logic (worldToLocal in one place)
- Share interfaces (IVoxelQuery used by both lighting and meshing)
- Pipeline pattern (easy to add new passes)

### YAGNI Reminders
- Don't add chunk unloading yet (not needed for render distance 3)
- Don't optimize texture atlas yet (can add later)
- Don't add LOD system yet (60fps achieved without it)
- PropagationPass can be stub initially (SkyLightPass provides basic lighting)

### Commit Frequency
- After each task (41 commits total)
- Before any major refactors
- After each successful test

---

**Implementation plan complete!**

Saved to: `docs/plans/2025-12-05-hexagonal-refactor.md`
