# Shadow System - Implementation Notes

## ✅ FIXED - Solutions Implemented (2025-11-28)

### Root Cause
InstancedMesh in Three.js requires `customDepthMaterial` for proper shadow support. Without it, shadow mapping doesn't work correctly for instanced geometry.

### Solutions Implemented

#### 1. customDepthMaterial (CRITICAL FIX)
**Location**: `src/terrain/index.ts:141-145`

```typescript
block.customDepthMaterial = new THREE.MeshDepthMaterial({
  depthPacking: THREE.RGBADepthPacking
})
```

**Impact**: Enables shadow rendering for all 14 InstancedMesh block types

#### 2. Optimized Shadow Settings
**Location**: `src/core/TimeOfDay.ts:37-53`

```typescript
// Shadow camera bounds: 40x40 units (tighter = sharper)
sunLight.shadow.camera.left/right/top/bottom = -40 to 40

// Shadow map resolution: 4096x4096 (higher = crisper edges)
sunLight.shadow.mapSize = 4096

// Shadow bias: -0.0001 (lower = less acne on flat surfaces)
sunLight.shadow.bias = -0.0001
```

**Impact**: Sharper, higher quality shadows around player

#### 3. Three.js Upgrade
**Version**: 0.137.0 → 0.181.2 (3+ years of improvements)

**Impact**: Better shadow performance, bug fixes, improved InstancedMesh support

### Current Shadow Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Shadow Map Size | 4096×4096 | High quality, ~64MB VRAM |
| Shadow Camera Bounds | 40×40 units | Follows player position |
| Shadow Bias | -0.0001 | Tuned for voxel blocks |
| Shadow Camera Near/Far | 0.5 / 300 | Covers full scene depth |
| Sun Light Intensity | 2.5 (max) | Scales with sun altitude |

### Shadow Camera Following
The shadow camera follows the player every frame:

```typescript
// src/core/TimeOfDay.ts:270-272
const playerPos = this.camera.position
this.sunLight.target.position.set(playerPos.x, playerPos.y, playerPos.z)
this.sunLight.target.updateMatrixWorld()
```

This ensures shadows are always visible around the player, even when moving far from origin.

---

## Future Tweaking Parameters

### To Adjust Shadow Quality:
- **Sharper shadows**: Increase `shadow.mapSize` (4096 → 8192)
- **Softer shadows**: Use `PCFSoftShadowMap` (already enabled)
- **Wider coverage**: Increase camera bounds (40 → 60)
- **Performance**: Decrease `shadow.mapSize` (4096 → 2048)

### To Fix Shadow Artifacts:
- **Shadow acne** (dotted patterns): Increase bias (-0.0001 → -0.001)
- **Peter panning** (disconnected shadows): Decrease bias (-0.0001 → -0.00001)
- **Clipped shadows**: Increase camera bounds or far plane

### Debug Helper
To visualize shadow camera coverage, uncomment in `TimeOfDay.ts:58-59`:
```typescript
const helper = new THREE.CameraHelper(this.sunLight.shadow.camera)
this.scene.add(helper)
```

---

## References
- [InstancedMesh shadows issue #17656](https://github.com/mrdoob/three.js/issues/17656)
- [DirectionalLight Shadow Tutorial](https://sbcode.net/threejs/directional-light-shadow/)
- [Three.js Shadow Mapping](https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow)

**Last Updated**: 2025-11-28
