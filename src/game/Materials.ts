import * as THREE from 'three';

export enum MaterialType {
  OakWood = 0,
  Cobblestone = 1,
  Brick = 2,
  Sandstone = 3,
  WhiteMarble = 4,
  Glass = 5,
  Gold = 6,
  Ruby = 7,
  Emerald = 8
}

export default class Materials {
  private materials: Map<MaterialType, THREE.Material | THREE.Material[]>;

  constructor() {
    this.materials = new Map();
    this.loadMaterials();
  }

  private loadMaterials(): void {
    this.materials.set(MaterialType.OakWood, new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    this.materials.set(MaterialType.Cobblestone, new THREE.MeshStandardMaterial({ color: 0x808080 }));
    this.materials.set(MaterialType.Brick, new THREE.MeshStandardMaterial({ color: 0xB22222 }));
    this.materials.set(MaterialType.Sandstone, new THREE.MeshStandardMaterial({ color: 0xF4A460 }));
    this.materials.set(MaterialType.WhiteMarble, new THREE.MeshStandardMaterial({ color: 0xFFFAFA }));

    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x87CEEB });
    glassMaterial.transparent = true;
    glassMaterial.opacity = 0.5;
    this.materials.set(MaterialType.Glass, glassMaterial);

    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    goldMaterial.metalness = 0.8;
    goldMaterial.roughness = 0.2;
    this.materials.set(MaterialType.Gold, goldMaterial);

    this.materials.set(MaterialType.Ruby, new THREE.MeshStandardMaterial({ color: 0xE0115F }));
    this.materials.set(MaterialType.Emerald, new THREE.MeshStandardMaterial({ color: 0x50C878 }));
  }

  get(type: MaterialType): THREE.Material | THREE.Material[] {
    const material = this.materials.get(type);
    if (!material) {
      throw new Error(`Material type ${type} not found`);
    }
    return material;
  }

  dispose(): void {
    this.materials.forEach(material => {
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    });
  }
}
