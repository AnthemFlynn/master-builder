# Phase 4A Migration Guide

## For Users

### Switching Between Worlds

**Method 1: Edit ChunkWorker (requires rebuild)**
```typescript
// src/modules/world/workers/ChunkWorker.ts:18
const worldDef = await loader.load('/worlds/default.json')  // Change filename
```

**Method 2: Via localStorage (future)**
```javascript
localStorage.setItem('selected-world', '/worlds/caves.json')
// Reload page
```

### Creating Custom Worlds

1. Copy `public/worlds/default.json`
2. Edit parameters:
   - Change seed for different layout
   - Adjust feature spacing/density
   - Modify biome elevation ranges
3. Save as `public/worlds/custom.json`
4. Update ChunkWorker to load your file
5. Rebuild: `bun dev`

### World Definition Fields

**meta.seed:**
- Controls all random generation
- Same seed = same world layout
- Change seed for completely different world

**terrain.noise.frequency:**
- Higher = more frequent height changes (bumpier)
- Lower = smoother, rolling hills
- Range: 0.005-0.02 recommended

**features[].spacing:**
- Distance between feature grid points
- Floating islands: 300-500 blocks
- Lower = denser features

**features[].density:**
- Probability of feature appearing
- Caves: 0.01-0.04 typical
- Trees: 0.001-0.005 typical
- Crystals: 0.005-0.02 typical

## For Developers

### Adding New Feature Types

1. Create generator class implementing `FeatureGenerator`
2. Add Zod schema to `WorldDefinition.ts`
3. Register in `DramaticFeaturesPass.generators` Map
4. Write unit tests
5. Add example to world JSON

### Converting Old Presets

**canyon preset → JSON:**
```json
{
  "meta": { "name": "Grand Canyon", "seed": 1337 },
  "terrain": {
    "generator": "noise",
    "baseHeight": 28,
    "noise": { "octaves": 4, "frequency": 0.01, "amplitude": 24 }
  },
  "features": [],
  "biomes": {
    "elevationBased": true,
    "ranges": [
      { "elevationRange": [0, 35], "surface": "sand", "subsurface": "sand" }
    ]
  }
}
```

### Backward Compatibility

**Feature flag in ChunkWorker:**
```typescript
const USE_NEW_SYSTEM = true

if (USE_NEW_SYSTEM) {
  const worldDef = await loader.load('/worlds/default.json')
  chunk = await orchestrator.generateChunk(coord)
} else {
  // Old system (fallback)
  const generator = new NoiseGenerator()
  generator.populate(chunk, coord)
}
```
