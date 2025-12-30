/**
 * Value object representing a sound effect configuration.
 */
export interface SoundEffect {
  /** Unique identifier for the sound */
  id: string
  /** Path to the audio file */
  path: string
  /** Volume level (0.0 to 1.0) */
  volume: number
  /** Whether the sound should loop */
  loop: boolean
  /** Sound category for volume controls */
  category: 'sfx' | 'bgm' | 'ambient'
}

/**
 * Block sound mapping - which sound to play for each block type
 */
export interface BlockSoundMapping {
  /** Block type ID */
  blockType: number
  /** Sound effect to play on place/break */
  sound: SoundEffect
}
