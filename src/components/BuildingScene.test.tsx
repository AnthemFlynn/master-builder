import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildingScene } from './BuildingScene';

// Mock Three.js to avoid WebGL errors in tests
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  
  // Create a mock WebGLRenderer class
  class MockWebGLRenderer {
    domElement = document.createElement('canvas');
    shadowMap = { enabled: false };
    setSize = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
  }
  
  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

describe('BuildingScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the building scene container', () => {
    const { container } = render(<BuildingScene />);
    const sceneContainer = container.querySelector('[data-testid="building-scene"]');
    expect(sceneContainer).toBeInTheDocument();
  });

  it('should render with custom camera position', () => {
    const { container } = render(<BuildingScene cameraPosition={[0, 10, 20]} />);
    const sceneContainer = container.querySelector('[data-testid="building-scene"]');
    expect(sceneContainer).toBeInTheDocument();
  });

  it('should render with grid enabled', () => {
    const { container } = render(<BuildingScene showGrid={true} />);
    const sceneContainer = container.querySelector('[data-testid="building-scene"]');
    expect(sceneContainer).toBeInTheDocument();
  });

  it('should handle block placement callback', () => {
    const onBlockPlace = vi.fn();
    const { container } = render(<BuildingScene onBlockPlace={onBlockPlace} />);
    const sceneContainer = container.querySelector('[data-testid="building-scene"]');
    expect(sceneContainer).toBeInTheDocument();
  });

  it('should accept and render placed blocks array', () => {
    const blocks = [
      { id: '1', position: { x: 0, y: 0, z: 0 }, type: 'block' },
      { id: '2', position: { x: 1, y: 0, z: 1 }, type: 'block' }
    ];
    const { container } = render(<BuildingScene blocks={blocks} />);
    const sceneContainer = container.querySelector('[data-testid="building-scene"]');
    expect(sceneContainer).toBeInTheDocument();
  });
});
