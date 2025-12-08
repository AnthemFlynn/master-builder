export interface MovementVector {
  forward: number   // -1 to 1
  strafe: number    // -1 to 1
  vertical: number  // -1 to 1
  jump: boolean
  sneak: boolean
}
