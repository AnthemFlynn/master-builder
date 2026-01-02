# Voxel Engine Improvements Plan

**Created:** 2025-12-27
**Status:** In Progress
**Workflow:** Feature branch → PR → Merge to dev → Repeat

---

## Overview

16 improvements identified from SOTA voxel engine review, organized by priority.

| Priority | Count | Focus |
|----------|-------|-------|
| P0 (Critical) | 2 | Broken mechanics |
| P1 (High) | 4 | Game feel & visuals |
| P2 (Medium) | 4 | Polish & tuning |
| P3 (Low) | 6 | Content & advanced |

---

## Feature Queue

### P0 - Critical (Broken Mechanics)

#### 1. `fix/glass-light-transparency`
- [ ] **Glass blocks light completely**
- **File:** `src/modules/environment/workers/WorkerVoxelQuery.ts:29-41`
- **Problem:** `getLightAbsorption()` uses `collidable` flag instead of `transparent` property
- **Impact:** Glass, leaves, ice block all light despite `lightAbsorption: 0`
- **Fix:** Check `transparent` property, respect `lightAbsorption` value
- **Test:** Build glass room, verify light passes through

#### 2. `feature/enable-caves`
- [ ] **Cave system disabled**
- **File:** `src/modules/world/workers/ChunkWorker.ts:36-44`
- **Problem:** CavePass commented out in generation pipeline
- **Impact:** No underground exploration content
- **Fix:** Uncomment CavePass, add cave lighting (glowstone placement)
- **Test:** Generate world, find caves with light sources

---

### P1 - High Priority (Game Feel & Core Visuals)

#### 3. `feature/movement-acceleration`
- [ ] **No movement acceleration (floaty feel)**
- **File:** `src/modules/physics/application/MovementController.ts`
- **Problem:** Instant velocity application, no momentum
- **Impact:** Movement feels "arcade-like" not "Minecraft-like"
- **Fix:** Add velocity-based movement with acceleration/friction
- **Test:** WASD feels smooth with ramp-up, sliding stop

#### 4. `feature/step-up-climbing`
- [ ] **Cannot climb 1-block obstacles**
- **File:** `src/modules/physics/application/CollisionDetector.ts`
- **Problem:** No auto-step for small height differences
- **Impact:** Player gets stuck on single blocks
- **Fix:** Implement step-up for obstacles ≤0.6 units
- **Test:** Walk into 1-block ledge, auto-climb

#### 5. `feature/smooth-lighting`
- [ ] **No light interpolation**
- **File:** `src/modules/rendering/meshing-application/VertexBuilder.ts:172-184`
- **Problem:** Light sampled at single point, harsh transitions
- **Impact:** Blocky light/shadow boundaries
- **Fix:** Average 2×2×2 light samples per vertex
- **Test:** Light gradients smooth across block faces

#### 6. `feature/ambient-minimum-light`
- [ ] **Pitch black in unlit areas**
- **File:** `src/modules/environment/domain/voxel-lighting/LightValue.ts:12-18`
- **Problem:** Light normalization allows 0.0 (pure black)
- **Impact:** Cannot see anything in caves/shadows
- **Fix:** Add 5% ambient minimum to `normalizeLightToColor()`
- **Test:** Unlit areas dim but visible

---

### P2 - Medium Priority (Polish & Tuning)

#### 7. `fix/terminal-velocity`
- [ ] **Unbounded fall speed**
- **File:** `src/modules/physics/application/MovementController.ts`
- **Problem:** No velocity cap, can tunnel through terrain
- **Impact:** Physics glitches on long falls
- **Fix:** Cap fall velocity at -78 blocks/sec
- **Test:** Long fall doesn't clip through ground

#### 8. `fix/jump-height-tuning`
- [ ] **Jump too high (2 blocks vs 1.25)**
- **File:** `src/modules/physics/application/MovementController.ts`
- **Problem:** jumpVelocity=10, gravity=25 yields 2-block jump
- **Impact:** Feels bouncy, not Minecraft-like
- **Fix:** Adjust to jumpVelocity=7.5, gravity=32
- **Test:** Jump clears 1-block gap, not 2-block

#### 9. `feature/sneak-edge-prevention`
- [ ] **Sneak doesn't prevent edge falls**
- **File:** `src/modules/physics/application/MovementController.ts`
- **Problem:** Sneak only slows, doesn't stop at edges
- **Impact:** Easy to fall accidentally while building
- **Fix:** Add edge detection, cancel movement toward void
- **Test:** Sneaking at edge stops at block boundary

#### 10. `feature/cave-lighting`
- [ ] **Caves are pitch black**
- **File:** `src/modules/world/generation/passes/CavePass.ts`
- **Problem:** No light sources placed in caves
- **Impact:** Underground unplayable without torches
- **Fix:** Place glowstone every ~20 blocks on cave floors
- **Test:** Caves have ambient glow from light sources

---

### P3 - Low Priority (Content & Advanced)

#### 11. `feature/water-depth-effects`
- [ ] **Water lacks visual depth**
- **File:** `src/modules/rendering/application/MaterialSystem.ts`
- **Problem:** Flat blue color regardless of depth
- **Impact:** Water looks artificial
- **Fix:** Darken color based on depth, add surface animation
- **Test:** Deep water darker, surface has movement

#### 12. `feature/tree-variety`
- [ ] **Single tree shape per species**
- **File:** `src/modules/world/generation/passes/TreePass.ts`
- **Problem:** All trees identical spherical canopy
- **Impact:** Forests look repetitive
- **Fix:** Add 3-4 shape variants (tall, bushy, sparse, giant)
- **Test:** Forest has varied tree silhouettes

#### 13. `feature/block-animations`
- [ ] **No breaking/placing feedback**
- **Files:** `src/modules/interaction/`, `src/modules/rendering/`
- **Problem:** Instant block changes, no visual feedback
- **Impact:** Actions feel disconnected
- **Fix:** Breaking progress overlay, placement scale animation
- **Test:** Mining shows cracks, placing has bounce

#### 14. `feature/structures`
- [ ] **No generated structures**
- **File:** New `src/modules/world/generation/structures/`
- **Problem:** Only trees and vegetation
- **Impact:** World feels empty
- **Fix:** Add structure system, implement 2-3 basic structures
- **Test:** Find ruined portal or dungeon in world

#### 15. `feature/mesh-lod`
- [ ] **No level-of-detail for distant chunks**
- **File:** `src/modules/rendering/meshing-application/MeshingService.ts`
- **Problem:** Full detail at all distances
- **Impact:** Performance at high render distance
- **Fix:** Simplified mesh for chunks beyond RD 6
- **Test:** Distant chunks render faster, look acceptable

#### 16. `feature/frustum-priority-meshing`
- [ ] **Mesh queue ignores camera frustum**
- **File:** `src/modules/rendering/meshing-application/MeshingService.ts`
- **Problem:** All dirty chunks rebuilt equally
- **Impact:** Visible chunks may wait behind off-screen ones
- **Fix:** Prioritize chunks in camera view
- **Test:** Looking at dirty chunk rebuilds it first

---

## Progress Tracking

| # | Branch | Status | PR | Merged |
|---|--------|--------|-----|--------|
| 1 | `fix/glass-light-transparency` | Done | #9 | Yes |
| 2 | `feature/enable-caves` | Done | #10 | Yes |
| 3 | `feature/movement-acceleration` | Done | #11 | Yes |
| 4 | `feature/step-up-climbing` | Done | #12 | Yes |
| 5 | `feature/smooth-lighting` | Done | #13 | Yes |
| 6 | `feature/ambient-minimum-light` | Done | #14 | Yes |
| 7 | `fix/terminal-velocity` | Done | #15 | Yes |
| 8 | `fix/jump-height-tuning` | Done | #16 | Yes |
| 9 | `feature/sneak-edge-prevention` | Done | #17 | Yes |
| 10 | `feature/cave-lighting` | Done | (included in #10) | Yes |
| 11 | `feature/water-depth-effects` | Done | #18 | Yes |
| 12 | `feature/tree-variety` | Done | #19 | Yes |
| 13 | `feature/block-animations` | Deferred | - | - |
| 14 | `feature/structures` | Deferred | - | - |
| 15 | `feature/mesh-lod` | Deferred | - | - |
| 16 | `feature/frustum-priority-meshing` | Deferred | - | - |

---

## Workflow Per Feature

```bash
# 1. Create branch from dev
git checkout dev && git pull
git checkout -b <branch-name>

# 2. Implement feature
# ... make changes ...

# 3. Verify
bun lint && bun run build

# 4. Commit & Push
git add -A && git commit -m "<message>"
git push -u origin <branch-name>

# 5. Create PR
gh pr create --base dev --title "<title>" --body "<description>"

# 6. Merge & Cleanup
gh pr merge <number> --merge --delete-branch
git checkout dev && git pull
```

---

## Notes

- Each feature is independent and can be tested in isolation
- P0 issues should be fixed first (blocking bugs)
- P1 issues significantly improve player experience
- P2/P3 can be deferred but add polish
- Total estimate: 16 features × ~30min avg = ~8 hours work
