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
