import * as THREE from 'three';
import { MaterialType } from './Materials';

export default class Audio {
  private listener: THREE.AudioListener;
  private soundMap: Map<MaterialType, THREE.Audio[]>;
  private audioLoader: THREE.AudioLoader;
  private currentIndex = 0;
  public disabled = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.listener = new THREE.AudioListener();
    this.audioLoader = new THREE.AudioLoader();
    this.soundMap = new Map();

    camera.add(this.listener);

    // Initialize sound arrays for each material type
    // For now, these are placeholders - we'll load actual sounds later
    this.initializeSounds();
  }

  private initializeSounds(): void {
    // Create placeholder audio for each material type
    // In a real implementation, we'd load .ogg files here
    // TODO: Add actual sound file loading when audio assets are available
    // Each material type should have 3-4 sound variations for variety
    Object.values(MaterialType).forEach(type => {
      if (typeof type === 'number') {
        this.soundMap.set(type, []);
        // We'll add actual sound loading later via loadSoundForMaterial()
      }
    });
  }

  playSound(materialType: MaterialType): void {
    if (this.disabled) return;

    const sounds = this.soundMap.get(materialType);
    if (sounds && sounds.length > 0) {
      // Cycle through available sounds for variety
      this.currentIndex = (this.currentIndex + 1) % sounds.length;
      const sound = sounds[this.currentIndex];
      if (sound && !sound.isPlaying) {
        sound.play();
      }
    }
  }

  /**
   * Load a sound file for a specific material type
   * TODO: This will be used to load actual .ogg files when assets are ready
   * For now, this is a placeholder implementation
   *
   * Example usage:
   * audio.loadSoundForMaterial(MaterialType.OakWood, '/sounds/wood1.ogg');
   * audio.loadSoundForMaterial(MaterialType.OakWood, '/sounds/wood2.ogg');
   * audio.loadSoundForMaterial(MaterialType.OakWood, '/sounds/wood3.ogg');
   */
  loadSoundForMaterial(materialType: MaterialType, audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        audioPath,
        (buffer) => {
          const audio = new THREE.Audio(this.listener);
          audio.setBuffer(buffer);
          audio.setVolume(0.15);

          if (!this.soundMap.has(materialType)) {
            this.soundMap.set(materialType, []);
          }
          this.soundMap.get(materialType)!.push(audio);
          resolve();
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  dispose(): void {
    this.soundMap.forEach(sounds => {
      sounds.forEach(sound => {
        if (sound.isPlaying) {
          sound.stop();
        }
        // Disconnect the sound
        if (sound.source) {
          sound.disconnect();
        }
      });
    });
    this.soundMap.clear();
  }
}
