import { UIState } from '../domain/UIState'

export interface IUIQuery {
  getState(): UIState
  isPlaying(): boolean
  isPaused(): boolean
}
