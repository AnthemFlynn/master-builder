/**
 * IAudioService - Port interface for audio system
 */
export interface IAudioService {
  playSound(soundId: string): void
  playBlockSound(blockType: number): void
  setMasterVolume(volume: number): void
  mute(): void
  unmute(): void
  isMuted(): boolean
}
