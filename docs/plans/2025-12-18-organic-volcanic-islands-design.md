# Organic Volcanic Islands Design

## Problem

Current terrain generation produces:
- Circular islands (distance + noise = wobbly circles)
- Uniform volcano shapes (identical smooth cones)
- Cartoonish, artificial appearance

## Solution

Replace geometric shapes with noise-driven organic generation.

## Island Shape Generation

### Current Approach (replace)
```typescript
const isLand = distance < radius + noise
```

### New Approach: Domain-Warped Noise Blobs

Build island mass from layered noise:

1. **Large blob** (scale 0.008) - overall island mass
2. **Medium peninsulas/bays** (scale 0.02) - arms and indentations
3. **Small coves/points** (scale 0.05) - coastline detail
4. **Domain warping** - distort coordinates by noise for organic swirls

```typescript
// Warp coordinates
const warpX = x + warpNoise(x * 0.01, z * 0.01) * 30
const warpZ = z + warpNoise(z * 0.01, x * 0.01) * 30

// Layer noise at warped coords
const blob = largeNoise(warpX, warpZ) * 0.6
         + medNoise(warpX, warpZ) * 0.25
         + smallNoise(warpX, warpZ) * 0.15

const isLand = blob > threshold
```

Each island uses unique seed offset for different shapes.

## Volcano Archetypes

### 1. Shield Volcano (Mauna Loa style)
- Gradual slopes (power ~1.5)
- Broad, rounded profile
- Subtle radial ridges

### 2. Stratovolcano (Mt. Fuji style)
- Steep cone (power ~3.0)
- Asymmetric slopes (erosion on windward side)
- Sharp peak or small crater

### 3. Caldera Volcano (Crater Lake style)
- Rises then drops in center
- Rim around collapsed crater
- Flat or water-filled center

### 4. Eroded Remnant (Na Pali style)
- Dramatic knife-edge ridges
- Deep V-shaped valleys between ridges
- Heavily weathered appearance

### 5. Multi-Peak Complex (Haleakala style)
- 2-3 connected peaks
- Saddle valleys between
- Shared base, separate summits

## Additional Volcanic Features

Applied randomly based on archetype:

- **Radial ridges** (4-8) - lava flow paths extending from peak
- **Erosion gullies** - V-cuts perpendicular to ridges
- **Parasitic cones** - small bumps on volcano flanks
- **Slope asymmetry** - steeper windward, gradual leeward

## Terrain Zones

From coast to peak:

| Zone | Height Range | Characteristics |
|------|--------------|-----------------|
| Reef/Shallows | Below sea level | Irregular underwater shelf |
| Beach | Sea level + 2-4 | Narrow, follows coastline |
| Coastal Plain | +4 to +15 | Flat, widest on leeward |
| Foothills | +15 to +30 | Rolling, gullies begin |
| Mountain Slopes | +30 to peak-10 | Steep, ridges visible |
| Summit | Peak | Archetype-dependent |

## Per-Island Parameters

```typescript
interface IslandConfig {
  shapeSeed: number        // Unique blob shape
  volcanoArchetype: VolcanoType
  asymmetryAngle: number   // Steeper direction (radians)
  ridgeCount: number       // 4-8 radial ridges
  erosionIntensity: number // 0-1, gully depth
  peakCount: number        // 1-3 peaks
  peaks: PeakConfig[]      // Position, height per peak
}
```

## Implementation Plan

1. Create `OrganicIslandGenerator` class
2. Implement domain-warped coastline generation
3. Implement volcano archetype system
4. Add radial ridge generation
5. Add erosion gully carving
6. Integrate with existing TerrainPass
7. Test and tune parameters

## Files to Modify

- `src/modules/world/generation/passes/TerrainPass.ts` - Main changes
- May extract to new `OrganicTerrainGenerator.ts` for cleanliness
