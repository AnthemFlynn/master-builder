# Git Cleanup Execution Plan

**Date**: 2025-12-10
**Goal**: Establish clean git tree with proper main/dev/feature workflow

---

## Current State Analysis

### Branch Status

| Branch | Last Commit | Ahead of | Status | Action |
|--------|-------------|----------|--------|--------|
| **main** | 12 days ago | - | OLD CODE | Update from dev |
| **dev** | 3 days ago | +132 vs main | INTEGRATION | Receive state-management |
| **state-management** | 25 min ago | +8 vs dev | CURRENT WORK | Merge to dev |
| feature/vertex-color-lighting | 5 days ago | +55 (worktree) | IN WORKTREE | Review/merge |
| feature/stabilize-world-interaction | 3 days ago | MERGED | Delete |
| feature/shadow-optimization | 11 days ago | MERGED | Delete |
| feature/time-of-day-system | 12 days ago | MERGED | Delete |
| feature/category-based-material | 12 days ago | UNKNOWN | Review first |

### Issues Detected

1. **state-management has 8 commits not in dev**:
   - Latest code evaluation
   - Vite→Bun fixes
   - Inventory system
   - Must merge to dev

2. **dev is 132 commits ahead of main**:
   - Entire hexagonal refactor
   - All features from last 12 days
   - main is obsolete old code

3. **Worktree exists**: `.worktrees/vertex-color-lighting`
   - 55 commits ahead of remote
   - Needs review/decision

4. **3-4 stale feature branches**:
   - Already merged to dev
   - Should be deleted

---

## Cleanup Execution Steps

### Phase 1: Merge Current Work to Dev

**Goal**: Get state-management work into dev

```bash
# Step 1: Switch to dev
git checkout dev

# Step 2: Ensure dev is up to date
git pull origin dev

# Step 3: Merge state-management
git merge --no-ff state-management -m "Merge state-management: Inventory + code evaluation + Bun fixes"

# Step 4: Push to origin
git push origin dev

# Step 5: Delete local state-management branch
git branch -d state-management
```

**Commits being merged**:
- 0f1f34e: Docs: comprehensive code evaluation
- 557e32f: Fix: Vite→Bun worker imports
- 6e42e28: feat(inventory): robust inventory management
- fee7ba2: feat: Inventory, Radial Menu, Creative UI
- bbc060f: refactor: Vite→Bun migration
- 8ddedca: feat: PhysicsWorker offloading
- 72fa739: Fix: PropagationPass optimization
- e70dc88: Fix: block interaction bugs

---

### Phase 2: Review Vertex Color Lighting Worktree

**Goal**: Decide what to do with 55-commit worktree

**Option A: It's Obsolete (Most Likely)**

The worktree was created for "vertex-color-lighting" but dev already has vertex color lighting (commit 62d7899, 5 days ago: "feat: implement greedy meshing core algorithm with lighting awareness").

**Verify**:
```bash
git log --oneline feature/vertex-color-lighting..dev | grep -i "vertex\|lighting" | head -10
```

If dev has the same work, **delete the worktree**:

```bash
# Remove worktree
git worktree remove .worktrees/vertex-color-lighting --force

# Delete branch locally
git branch -D feature/vertex-color-lighting

# Delete from GitHub
git push origin --delete feature/vertex-color-lighting
```

**Option B: It Has Unique Work**

If worktree has different/additional work:

```bash
# From worktree directory
cd .worktrees/vertex-color-lighting

# Review changes
git log --oneline origin/feature/vertex-color-lighting..HEAD

# If valuable, push and create PR
git push origin feature/vertex-color-lighting
gh pr create --base dev --title "feat: Vertex color lighting enhancements"

# After PR merged, remove worktree
cd ../..
git worktree remove .worktrees/vertex-color-lighting
git branch -d feature/vertex-color-lighting
```

---

### Phase 3: Delete Merged Feature Branches

**Goal**: Remove branches already merged to dev

**Verify they're merged**:
```bash
# Check if branch is merged
git branch --merged dev

# For each merged branch:
git log dev..feature/stabilize-world-interaction
# If empty output = fully merged
```

**Delete merged branches**:
```bash
# Local deletion
git branch -d feature/shadow-optimization
git branch -d feature/stabilize-world-interaction

# Remote deletion
git push origin --delete feature/shadow-optimization
git push origin --delete feature/stabilize-world-interaction
```

**Review before deleting**:
```bash
# feature/time-of-day-system - check if merged
git log dev..feature/time-of-day-system

# feature/category-based-material-selection - check if merged
git log dev..feature/category-based-material-selection
```

---

### Phase 4: Release to Main

**Goal**: Bring main up to date with dev (132 commits)

**Decision Point**: What version number?

**Option A: v0.1.0** (Pre-release, has critical issues)
- Use if code evaluation shows critical issues
- Indicates not production-ready
- Semantic versioning: 0.x.x = unstable API

**Option B: v1.0.0** (First stable release)
- Use only if critical issues fixed
- Indicates production-ready
- Requires Phase 1 fixes from evaluation

**Recommended**: **v0.1.0** (based on 6.4/10 score, critical issues exist)

**Execute**:
```bash
# Step 1: Checkout main
git checkout main
git pull origin main

# Step 2: Merge dev
git merge --no-ff dev -m "Release v0.1.0: Hexagonal architecture with 10 modules

Complete refactor to hexagonal architecture with:
- 10 independent modules (audio, blocks, environment, game, input, interaction, physics, player, rendering, ui, world)
- Event-driven architecture with EventBus
- CQRS with CommandBus
- Web Workers for physics, meshing, lighting, world generation
- Vertex color lighting system
- Greedy meshing foundation
- Inventory and creative UI
- Input management system

Known issues (see docs/eval/):
- Memory leaks (3 sources)
- No error handling (workers/buses)
- 50% hexagonal compliance
- Missing greedy meshing algorithm
- No save/load system

Next: Phase 1 critical fixes (see docs/eval/TECHNICAL-ROADMAP.md)"

# Step 3: Tag release
git tag -a v0.1.0 -m "Release v0.1.0: Hexagonal architecture foundation (pre-release)"

# Step 4: Push
git push origin main --tags
```

---

### Phase 5: Set Default Branch (GitHub)

**Goal**: Make dev the default branch on GitHub

**Steps**:
1. Go to: https://github.com/AnthemFlynn/master-builder/settings/branches
2. Change default branch from `main` to `dev`
3. Reason: Most development happens on dev, PRs should default to dev

**Note**: main remains protected for releases only

---

## Post-Cleanup State

### Expected Result

| Branch | Role | Protection |
|--------|------|------------|
| **main** | Releases | Protected, PR-only |
| **dev** | Development | Protected, PR preferred |
| feature/* | Feature work | Temporary |
| hotfix/* | Urgent fixes | Temporary |
| bugfix/* | Bug fixes | Temporary |

### Branch Topology

```
main (v0.1.0)
  |
  └─ dev (latest stable)
      ├─ feature/new-feature-1
      ├─ feature/new-feature-2
      └─ hotfix/urgent-fix
```

---

## Automated Cleanup Script

```bash
#!/bin/bash
# cleanup-git.sh

echo "🧹 Kingdom Builder Git Cleanup"
echo ""

# Phase 1: Merge state-management to dev
echo "Phase 1: Merging state-management to dev..."
git checkout dev
git pull origin dev
git merge --no-ff state-management -m "Merge state-management: Inventory + evaluation + fixes"
git push origin dev
git branch -d state-management
echo "✅ state-management merged to dev"
echo ""

# Phase 2: Delete merged feature branches
echo "Phase 2: Cleaning up merged branches..."
MERGED_BRANCHES="feature/shadow-optimization feature/stabilize-world-interaction"

for branch in $MERGED_BRANCHES; do
  # Check if fully merged
  DIFF=$(git log dev..$branch --oneline | wc -l | tr -d ' ')
  if [ "$DIFF" -eq "0" ]; then
    echo "  Deleting $branch (fully merged)"
    git branch -d $branch 2>/dev/null
    git push origin --delete $branch 2>/dev/null
  else
    echo "  ⚠️  $branch has $DIFF unique commits, skipping"
  fi
done
echo "✅ Merged branches cleaned"
echo ""

# Phase 3: Report on worktree
echo "Phase 3: Checking worktree..."
if [ -d ".worktrees/vertex-color-lighting" ]; then
  echo "  ⚠️  Worktree exists: .worktrees/vertex-color-lighting"
  echo "  Review manually and decide to merge or delete"
else
  echo "  ✅ No worktrees found"
fi
echo ""

# Phase 4: Create release tag
echo "Phase 4: Would you like to release dev to main?"
echo "  dev is 132 commits ahead of main"
echo "  Suggested version: v0.1.0 (pre-release)"
echo ""
echo "To release, run:"
echo "  git checkout main"
echo "  git merge --no-ff dev"
echo "  git tag -a v0.1.0 -m 'Release v0.1.0'"
echo "  git push origin main --tags"
echo ""

echo "🎉 Cleanup complete!"
echo ""
echo "Next steps:"
echo "  1. Review worktree (if exists)"
echo "  2. Decide on main release"
echo "  3. Set dev as default branch on GitHub"
```

---

## Manual Review Checklist

Before executing cleanup:

- [ ] state-management has evaluation docs committed
- [ ] dev branch is stable (tests pass if they exist)
- [ ] No critical work in worktree
- [ ] Confirmed feature branches are merged
- [ ] Backup created (just in case)
- [ ] Team notified of branch deletions

After cleanup:

- [ ] dev is up to date with state-management work
- [ ] Stale branches deleted (local + remote)
- [ ] main released (if ready)
- [ ] GitHub default branch set to dev
- [ ] Branch protection rules configured

---

## Recovery Procedures

### If something goes wrong

**Recover deleted branch**:
```bash
git reflog  # Find commit SHA
git checkout -b recovered-branch <sha>
```

**Undo merge**:
```bash
git reset --hard ORIG_HEAD  # Immediately after merge
git reset --hard <sha-before-merge>  # If already committed
```

**Restore deleted remote branch**:
```bash
git push origin <sha>:refs/heads/branch-name
```

---

## Notes

- main is 12 days behind dev (needs major update)
- state-management is your current work (evaluation + fixes)
- dev is the actual latest code (hexagonal architecture)
- main still has old monolithic code from before refactor

**Priority**: Merge state-management → dev → Update main

This brings everything into alignment with proper workflow.
