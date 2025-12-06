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
