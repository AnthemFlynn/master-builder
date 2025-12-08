import { GameAction } from '../domain/GameAction'
import { KeyBinding } from '../domain/KeyBinding'
import { GameState } from '../domain/InputState'

export interface IInputQuery {
  isActionPressed(actionName: string): boolean
  getBindings(actionName: string): KeyBinding[]
  getAllActions(): GameAction[]
  getCurrentState(): GameState
}
