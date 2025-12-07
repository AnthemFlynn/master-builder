// src/modules/terrain/domain/events/WorldEvents.ts
import { DomainEvent } from './DomainEvent'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'

export interface ChunkGeneratedEvent extends DomainEvent {
  type: 'ChunkGeneratedEvent'
  chunkCoord: ChunkCoordinate
  renderDistance: number
}

export interface BlockPosition {
  x: number
  y: number
  z: number
}

export interface BlockPlacedEvent extends DomainEvent {
  type: 'BlockPlacedEvent'
  position: BlockPosition
  blockType: number
  chunkCoord: ChunkCoordinate
}

export interface BlockRemovedEvent extends DomainEvent {
  type: 'BlockRemovedEvent'
  position: BlockPosition
  blockType: number
  chunkCoord: ChunkCoordinate
}
