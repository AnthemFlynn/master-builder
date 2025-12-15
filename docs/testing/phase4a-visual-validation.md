# Phase 4A Visual Validation Checklist

## Test World: default.json (Sky Islands)

**Load Instructions:**
1. `bun dev`
2. Click Play
3. Press F3 (debug overlay)

**Validation Steps:**

### Floating Islands
- [ ] Islands visible in distance (Y=90-130 range)
- [ ] Islands have grass top surface
- [ ] Islands are roughly spherical
- [ ] Multiple islands visible at different distances
- [ ] Islands appear at consistent locations (determinism)

### Cave Systems
- [ ] Caves visible when digging down (Y=15-70)
- [ ] Tunnels are smooth and organic (not blocky)
- [ ] Tunnels wind naturally (not straight)
- [ ] Cave radius varies (5-15 blocks)
- [ ] Can explore inside caves

### Giant Trees
- [ ] Massive trees visible (40-75 blocks tall)
- [ ] Thick trunks (4-7 block radius)
- [ ] Large spherical canopy of leaves
- [ ] Trees don't appear too frequently (rare = impressive)
- [ ] Can climb trees

### Crystal Formations
- [ ] Glowing crystals in caves
- [ ] Crystals grow from cave walls/ceilings
- [ ] Obsidian crystals in deep caves (Y<50)
- [ ] Crystals provide natural cave lighting
- [ ] Varying heights (12-28 blocks)

### Performance
- [ ] FPS: 60 stable at RD=7
- [ ] Chunk generation: <50ms average
- [ ] No frame drops during exploration
- [ ] LOD system working (F3 shows distribution)

### Persistence
- [ ] Place blocks → save → reload → blocks persist
- [ ] Unmodified chunks regenerate identically
- [ ] View from built structures stays consistent

---

## Test World: caves.json (Massive Caves)

**Expected:**
- Dense cave networks
- Heavy use of glowstone crystals
- Obsidian formations in deep caves
- Exciting exploration

---

## Test World: forest.json (Giant Trees)

**Expected:**
- Forest of massive trees
- Can walk underneath canopies
- Trees create natural shade
- Impressive scale

---

## Test World: crystals.json (Glowing Caves)

**Expected:**
- Heavy crystal coverage
- Caves well-lit by crystals
- Mix of glowstone (yellow) and obsidian (purple)
- Magical atmosphere

---

## Test World: flat.json (Testing)

**Expected:**
- Perfectly flat at Y=32
- No features
- Clean surface for manual testing
- Block placement/removal works perfectly
