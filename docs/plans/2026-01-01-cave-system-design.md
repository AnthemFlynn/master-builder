# Cave System Design

**Date**: 2026-01-01
**Status**: Approved
**Goal**: Replace current noise-threshold caves with explorable volcanic lava tube networks

---

## Overview

Massive cave networks spanning each island's underground, themed as ancient lava tubes with sea cave entrances. Caves are a **major exploration feature**, not decoration.

## Three-Layer Structure

### Upper Caves (Y=50-70) - Dry Lava Tubes
- **Access**: Volcanic vents on island slopes (2-4 per island)
- **Character**: Long winding tunnels, smooth obsidian walls, dormant volcanic feel
- **Lighting**: Mostly dark with occasional skylights (collapsed tube sections)
- **Features**: Lava stalactites, cooled lava pools, ancient atmosphere

### Middle Caves (Y=30-50) - Crystal Grottos
- **Access**: Transitions from upper and lower layers
- **Character**: Hub layer with largest chambers, crystal formations
- **Lighting**: Glowing crystal clusters every 15-25 blocks
- **Features**: Crystal pillars, reflecting pools, the "wonder" layer

### Lower Caves (Y=10-30) - Flooded Depths
- **Access**: Sea caves at coastline (1-3 per island)
- **Character**: Partially flooded tunnels, underground pools
- **Lighting**: Lava pockets behind obsidian, orange glow on water
- **Features**: Underground lakes, lava falls, geothermal vents

## Generation Algorithm

### Worm Carving (not noise thresholds)

Worm agents carve actual connected tunnels:

1. **Spawn** at entrance point (sea cave or volcanic vent)
2. **Walk** in a direction, carving tube as it goes
3. **Curve** gradually using seeded noise
4. **Branch** occasionally, spawning child worms
5. **Terminate** after traveling set distance

### Per-Layer Worm Parameters

| Layer  | Tunnel Width | Curve Rate | Branch Chance | Special            |
|--------|-------------|------------|---------------|--------------------|
| Upper  | 3-4 blocks  | Gentle     | 15%           | Long runs, skylights |
| Middle | 4-6 blocks  | Medium     | 40%           | Chambers at branches |
| Lower  | 3-5 blocks  | Tight      | 25%           | Pools at low points |

### Chamber Generation

- **Worm intersections** → Large chamber
- **Branch points** → Small chamber
- **Random along path** → Medium chamber with features

## Entrances

### Sea Caves (Lower Layer)
- Spawn where terrain meets sea level on coastline
- 1-3 per island based on size
- Wide mouth (6-8 blocks) narrowing into tunnel
- First 20-30 blocks partially flooded
- Connect into lower flooded network

### Volcanic Vents (Upper Layer)
- Spawn on slopes between Y=70-100
- Dark openings in cliff faces or crater edges
- 2-4 per island, scattered around volcano
- Descend via sloped tubes into upper caves

### Inter-Layer Transitions
- **Upper → Middle**: Lava tube gradually descends, walls shift to crystal-studded
- **Middle → Lower**: Flooded grotto, dive underwater, emerge below
- **Shortcuts**: Water-filled vertical shafts (safe fall), lava rivers to navigate

No explicit markers - layer change communicated through block palette and lighting.

## Decoration & Atmosphere

### Upper Caves
- Smooth basalt/obsidian walls
- Flat floors where lava flowed
- Lava stalactites, cooled obsidian pools
- Skylight shafts (2-3 block holes to surface)

### Middle Caves
- Stone with crystal-embedded surfaces
- Uneven natural cave floor
- Crystal pillars, reflecting pools
- Glowing clusters provide ambient light

### Lower Caves
- Wet stone, moss near water
- Floor often underwater
- Lava behind obsidian "windows"
- Underground lakes, steam vents

### Transition Zones
Block palettes blend over 10-15 blocks for natural layer changes.

## Implementation

### Pass Order (caves LAST)

```
1. TerrainPass      - Heightmap, stone fill
2. WaterPass        - Sea level
3. OrePass          - Ores in stone
4. BiomePass        - Surface materials
5. TreePass         - Trees
6. DecorationPass   - Grass, flowers
7. CaveSystemPass   - Carves through everything (NEW)
```

Caves run last so entrances punch through surface decoration dramatically.

### CaveSystemPass Steps

1. **Find entrances** - Scan coastline for sea caves, slopes for vents
2. **Spawn worms** - Per layer, starting from entrances
3. **Run simulation** - Carve tunnels, track intersections
4. **Carve chambers** - At intersections and random points
5. **Create connections** - Between layers where they overlap
6. **Decorate** - Place crystals, lava, lighting by layer

### Chunk Boundary Handling

Worms are deterministic (seeded RNG). When generating any chunk, simulate all worms that could reach it from nearby island entrances. Same seed = same path = consistent caves across chunks.

### Performance

- Skip ocean chunks entirely (no islands = no caves)
- Use cached island positions to know which chunks need caves
- Worm simulation more expensive than noise, but only runs for relevant chunks

## Success Criteria

- [ ] Can enter cave from sea level and explore upward
- [ ] Can enter from volcanic vent and explore downward
- [ ] All three layers feel distinct (palette, lighting, features)
- [ ] Tunnels are connected and explorable, not random holes
- [ ] Can get genuinely lost in the system
- [ ] Transitions between layers are interesting, not just shafts
- [ ] Performance acceptable (< 50ms per chunk with caves)
