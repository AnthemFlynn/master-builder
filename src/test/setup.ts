import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Web Audio API for Three.js audio tests
class AudioContextMock {
  createGain() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        value: 1
      }
    };
  }

  createPanner() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      setPosition: vi.fn(),
      setOrientation: vi.fn()
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
      playbackRate: {
        value: 1,
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn()
      }
    };
  }

  get destination() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn()
    };
  }

  get currentTime() {
    return 0;
  }

  get listener() {
    return {
      setPosition: vi.fn(),
      setOrientation: vi.fn(),
      positionX: { value: 0 },
      positionY: { value: 0 },
      positionZ: { value: 0 },
      forwardX: { value: 0 },
      forwardY: { value: 0 },
      forwardZ: { value: -1 },
      upX: { value: 0 },
      upY: { value: 1 },
      upZ: { value: 0 }
    };
  }
}

// Set up global AudioContext mock
global.AudioContext = AudioContextMock as any;
(global as any).webkitAudioContext = AudioContextMock as any;

afterEach(() => {
  cleanup();
});
