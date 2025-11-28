import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Audio from './Audio';
import { MaterialType } from './Materials';
import * as THREE from 'three';

describe('Audio', () => {
  let audio: Audio;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera();
    audio = new Audio(camera);
  });

  afterEach(() => {
    audio.dispose();
  });

  describe('Initialization', () => {
    it('should create audio system', () => {
      expect(audio).toBeDefined();
    });

    it('should add audio listener to camera', () => {
      expect(camera.children.length).toBe(1);
      expect(camera.children[0]).toBeInstanceOf(THREE.AudioListener);
    });

    it('should initialize sound map for all material types', () => {
      // The sound map should be initialized but empty (placeholders)
      expect(audio['soundMap']).toBeDefined();
      expect(audio['soundMap'].size).toBe(Object.keys(MaterialType).length / 2); // Divide by 2 because enums have reverse mapping
    });

    it('should start with disabled set to false', () => {
      expect(audio.disabled).toBe(false);
    });

    it('should start with currentIndex at 0', () => {
      expect(audio['currentIndex']).toBe(0);
    });
  });

  describe('Sound Playing', () => {
    it('should not play sound when disabled', () => {
      audio.disabled = true;

      // Since there are no loaded sounds, this just tests that it doesn't error
      expect(() => audio.playSound(MaterialType.OakWood)).not.toThrow();
    });

    it('should not error when playing sound with no loaded audio', () => {
      // With placeholder sounds (empty arrays), this should not error
      expect(() => audio.playSound(MaterialType.OakWood)).not.toThrow();
      expect(() => audio.playSound(MaterialType.Cobblestone)).not.toThrow();
      expect(() => audio.playSound(MaterialType.Brick)).not.toThrow();
    });

    it('should cycle through sound indices', () => {
      // const initialIndex = audio['currentIndex'];

      // Mock the sound map with fake sounds
      const mockAudio1 = new THREE.Audio(audio['listener']);
      const mockAudio2 = new THREE.Audio(audio['listener']);
      const mockAudio3 = new THREE.Audio(audio['listener']);

      // Create mock audio buffers
      const mockBuffer = {} as AudioBuffer;
      mockAudio1.setBuffer(mockBuffer);
      mockAudio2.setBuffer(mockBuffer);
      mockAudio3.setBuffer(mockBuffer);

      // Mock play method and isPlaying property
      vi.spyOn(mockAudio1, 'play');
      vi.spyOn(mockAudio2, 'play');
      vi.spyOn(mockAudio3, 'play');
      Object.defineProperty(mockAudio1, 'isPlaying', { value: false, writable: true });
      Object.defineProperty(mockAudio2, 'isPlaying', { value: false, writable: true });
      Object.defineProperty(mockAudio3, 'isPlaying', { value: false, writable: true });

      audio['soundMap'].set(MaterialType.OakWood, [mockAudio1, mockAudio2, mockAudio3]);

      audio.playSound(MaterialType.OakWood);
      expect(audio['currentIndex']).toBe(1);

      audio.playSound(MaterialType.OakWood);
      expect(audio['currentIndex']).toBe(2);

      audio.playSound(MaterialType.OakWood);
      expect(audio['currentIndex']).toBe(0); // Should wrap around
    });

    it('should not play if sound is already playing', () => {
      const mockAudio = new THREE.Audio(audio['listener']);
      const playSpy = vi.spyOn(mockAudio, 'play');

      // Mock isPlaying as true
      Object.defineProperty(mockAudio, 'isPlaying', { value: true, writable: true });

      audio['soundMap'].set(MaterialType.OakWood, [mockAudio]);

      audio.playSound(MaterialType.OakWood);

      expect(playSpy).not.toHaveBeenCalled();
    });
  });

  describe('Sound Loading', () => {
    it('should have loadSoundForMaterial method', () => {
      expect(audio.loadSoundForMaterial).toBeDefined();
      expect(typeof audio.loadSoundForMaterial).toBe('function');
    });

    it('should return a promise from loadSoundForMaterial', () => {
      const result = audio.loadSoundForMaterial(MaterialType.OakWood, '/fake/path.ogg');
      expect(result).toBeInstanceOf(Promise);

      // Clean up the promise to avoid unhandled rejection
      result.catch(() => {});
    });

    // Note: We can't easily test actual audio loading without real audio files
    // This will be tested in integration tests once audio assets are available
  });

  describe('Disposal', () => {
    it('should dispose audio system without errors', () => {
      expect(() => audio.dispose()).not.toThrow();
    });

    it('should stop all playing sounds on disposal', () => {
      const mockAudio1 = new THREE.Audio(audio['listener']);
      const mockAudio2 = new THREE.Audio(audio['listener']);

      const stopSpy1 = vi.spyOn(mockAudio1, 'stop');
      const stopSpy2 = vi.spyOn(mockAudio2, 'stop');

      // Mock isPlaying as true
      Object.defineProperty(mockAudio1, 'isPlaying', { value: true, writable: true });
      Object.defineProperty(mockAudio2, 'isPlaying', { value: false, writable: true });

      audio['soundMap'].set(MaterialType.OakWood, [mockAudio1, mockAudio2]);

      audio.dispose();

      expect(stopSpy1).toHaveBeenCalled();
      expect(stopSpy2).not.toHaveBeenCalled(); // Not playing, so shouldn't be stopped
    });

    it('should clear sound map on disposal', () => {
      const mockAudio = new THREE.Audio(audio['listener']);
      audio['soundMap'].set(MaterialType.OakWood, [mockAudio]);

      expect(audio['soundMap'].size).toBeGreaterThan(0);

      audio.dispose();

      expect(audio['soundMap'].size).toBe(0);
    });

    it('should disconnect sounds with sources on disposal', () => {
      const mockAudio = new THREE.Audio(audio['listener']);
      const disconnectSpy = vi.spyOn(mockAudio, 'disconnect');

      // Mock a source
      Object.defineProperty(mockAudio, 'source', {
        value: {},
        writable: true
      });
      Object.defineProperty(mockAudio, 'isPlaying', { value: false, writable: true });

      audio['soundMap'].set(MaterialType.OakWood, [mockAudio]);

      audio.dispose();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Material Type Support', () => {
    it('should support all material types', () => {
      const materialTypes = [
        MaterialType.OakWood,
        MaterialType.Cobblestone,
        MaterialType.Brick,
        MaterialType.Sandstone,
        MaterialType.WhiteMarble,
        MaterialType.Glass,
        MaterialType.Gold,
        MaterialType.Ruby,
        MaterialType.Emerald
      ];

      materialTypes.forEach(type => {
        expect(() => audio.playSound(type)).not.toThrow();
      });
    });
  });
});
