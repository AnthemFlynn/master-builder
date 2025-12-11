export interface GameAction {
  id: string
  category: string
  description: string
  defaultKey?: string
  defaultModifiers?: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
  }
}
