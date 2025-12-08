// src/modules/player/ports/IPlayerQuery.ts
import * as THREE from 'three'
import { PlayerMode } from '../domain/PlayerMode'

export interface IPlayerQuery {
  getPosition(): THREE.Vector3
  getMode(): PlayerMode
  getSpeed(): number
  isFlying(): boolean
}
