// src/modules/terrain/domain/events/MeshingEvents.ts
import { DomainEvent } from './DomainEvent'
import { ChunkCoordinate } from '../../../shared/domain/ChunkCoordinate'
import * as THREE from 'three'

export interface ChunkMeshBuiltEvent extends DomainEvent {
  type: 'ChunkMeshBuiltEvent'
  chunkCoord: ChunkCoordinate
  geometryMap: Map<string, THREE.BufferGeometry>
  lodLevel?: 0 | 1 | 2 | 3
}

export interface ChunkMeshDirtyEvent extends DomainEvent {
  type: 'ChunkMeshDirtyEvent'
  chunkCoord: ChunkCoordinate
  reason: 'block' | 'light' | 'global'
}
