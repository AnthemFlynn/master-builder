import { GameState } from '../../../shared/domain/GameState'

export interface IUIQuery {
  getState(): GameState
  isPlaying(): boolean
  isPaused(): boolean
}
