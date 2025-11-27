import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Materials, { MaterialType } from './Materials';
import * as THREE from 'three';

describe('Materials', () => {
  let materials: Materials;

  beforeEach(() => {
    materials = new Materials();
  });

  afterEach(() => {
    materials.dispose();
  });

  it('should create materials manager', () => {
    expect(materials).toBeDefined();
  });

  it('should provide OakWood material', () => {
    const material = materials.get(MaterialType.OakWood);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.Material);
  });

  it('should provide Cobblestone material', () => {
    const material = materials.get(MaterialType.Cobblestone);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.Material);
  });

  it('should provide Brick material', () => {
    const material = materials.get(MaterialType.Brick);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.Material);
  });

  it('should provide Sandstone material', () => {
    const material = materials.get(MaterialType.Sandstone);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.Material);
  });

  it('should provide WhiteMarble material', () => {
    const material = materials.get(MaterialType.WhiteMarble);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.Material);
  });

  it('should provide Glass material with transparency', () => {
    const material = materials.get(MaterialType.Glass);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);

    const standardMaterial = material as THREE.MeshStandardMaterial;
    expect(standardMaterial.transparent).toBe(true);
    expect(standardMaterial.opacity).toBe(0.5);
  });

  it('should provide Gold material with metalness', () => {
    const material = materials.get(MaterialType.Gold);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);

    const standardMaterial = material as THREE.MeshStandardMaterial;
    expect(standardMaterial.metalness).toBe(0.8);
    expect(standardMaterial.roughness).toBe(0.2);
  });

  it('should provide Ruby material', () => {
    const material = materials.get(MaterialType.Ruby);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.Material);
  });

  it('should provide Emerald material', () => {
    const material = materials.get(MaterialType.Emerald);
    expect(material).toBeDefined();
    expect(material).toBeInstanceOf(THREE.Material);
  });

  it('should throw error for invalid material type', () => {
    expect(() => materials.get(999 as MaterialType)).toThrow();
  });

  it('should use NearestFilter for pixelated look', () => {
    const material = materials.get(MaterialType.OakWood) as THREE.MeshStandardMaterial;

    if (material.map) {
      expect(material.map.magFilter).toBe(THREE.NearestFilter);
      expect(material.map.minFilter).toBe(THREE.NearestFilter);
    }
  });

  it('should dispose all materials', () => {
    const oakWood = materials.get(MaterialType.OakWood) as THREE.MeshStandardMaterial;
    const disposeSpy = vi.spyOn(oakWood, 'dispose');

    materials.dispose();

    expect(disposeSpy).toHaveBeenCalled();
  });
});
