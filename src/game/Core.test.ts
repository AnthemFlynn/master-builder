import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import Core from './Core';

// Mock THREE.WebGLRenderer to avoid WebGL context issues in tests
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof THREE>('three');

  class MockWebGLRenderer {
    domElement: HTMLCanvasElement;
    shadowMap = { enabled: false };

    constructor(options?: { canvas?: HTMLCanvasElement; antialias?: boolean }) {
      this.domElement = options?.canvas || document.createElement('canvas');
    }

    setSize = vi.fn();
    setPixelRatio = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
  }

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

describe('Core', () => {
  let canvas: HTMLCanvasElement;
  let core: Core;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    core = new Core(canvas);
  });

  afterEach(() => {
    if (core) {
      core.dispose();
    }
  });

  it('should initialize camera with correct FOV', () => {
    expect(core.camera.fov).toBe(50);
  });

  it('should initialize scene with sky blue background', () => {
    expect(core.scene.background).toBeInstanceOf(THREE.Color);
    expect((core.scene.background as THREE.Color).getHex()).toBe(0x87ceeb);
  });

  it('should have fog enabled', () => {
    expect(core.scene.fog).toBeInstanceOf(THREE.Fog);
  });

  it('should add lights to scene', () => {
    const lights = core.scene.children.filter(
      child => child instanceof THREE.Light
    );
    expect(lights.length).toBeGreaterThan(0);
  });

  it('should handle window resize', () => {
    // const initialAspect = core.camera.aspect;

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

    window.dispatchEvent(new Event('resize'));

    expect(core.camera.aspect).toBe(1920 / 1080);
  });
});
