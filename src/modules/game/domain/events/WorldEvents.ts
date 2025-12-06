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
