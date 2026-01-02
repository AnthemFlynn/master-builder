# Git Workflow & Branch Strategy

**Repository**: kingdom-builder (master-builder)
**Remote**: https://github.com/AnthemFlynn/master-builder.git
**Strategy**: GitFlow-style with main/dev separation

---

## Branch Structure

### Protected Branches

**`main`** - Production releases only
- Stable, tested code
- Tagged releases (v1.0.0, v2.0.0, etc.)
- Direct commits NOT allowed
- Only accepts PRs from `dev` after review

**`dev`** - Main development branch
- Integration branch for all features
- Must be stable (all tests pass)
- Direct commits for small fixes only
- Base for all feature/hotfix/bug branches

### Working Branches

**`feature/*`** - New features
- Branch from: `dev`
- Merge to: `dev` via PR
- Naming: `feature/descriptive-name`
- Examples: `feature/inventory-system`, `feature/multiplayer`

**`hotfix/*`** - Urgent production fixes
- Branch from: `main` (if fixing production)
- Branch from: `dev` (if fixing dev)
- Merge to: Both `main` and `dev`
- Naming: `hotfix/issue-description`

**`bugfix/*`** - Non-urgent bug fixes
- Branch from: `dev`
- Merge to: `dev` via PR
- Naming: `bugfix/issue-description`

**`refactor/*`** - Code refactoring
- Branch from: `dev`
- Merge to: `dev` via PR
- Naming: `refactor/component-name`

---

## Workflow

### Starting New Feature

```bash
# Ensure dev is up to date
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/my-feature

# Work, commit, push
git add .
git commit -m "feat: implement my feature"
git push -u origin feature/my-feature

# Create PR: feature/my-feature → dev
gh pr create --base dev --title "feat: My Feature"
```

### Merging to Dev

```bash
# After PR approved
git checkout dev
git pull origin dev
git merge --no-ff feature/my-feature
git push origin dev

# Delete merged branch
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

### Releasing to Main

```bash
# When dev is stable and ready for release
git checkout main
git pull origin main
git merge --no-ff dev
git tag -a v1.0.0 -m "Release v1.0.0: Description"
git push origin main --tags
```

### Hotfix Workflow

```bash
# Critical bug in production
git checkout main
git checkout -b hotfix/critical-bug

# Fix, commit
git commit -m "hotfix: fix critical bug"

# Merge to main
git checkout main
git merge --no-ff hotfix/critical-bug
git tag -a v1.0.1 -m "Hotfix v1.0.1: Critical bug"
git push origin main --tags

# Merge to dev
git checkout dev
git merge --no-ff hotfix/critical-bug
git push origin dev

# Delete hotfix branch
git branch -d hotfix/critical-bug
```

---

## Current State (2025-12-10)

### Branches

| Branch | Status | Commits Ahead | Action Needed |
|--------|--------|---------------|---------------|
| **main** | Old code (12 days old) | 0 | Needs release from dev |
| **dev** | Stable hexagonal code | +132 vs main | Ready to release |
| **state-management** | Latest work | +8 vs dev | Merge to dev |
| feature/vertex-color-lighting | Worktree active | +55 | Review and merge/close |
| feature/shadow-optimization | Stale (11 days) | Merged | Delete |
| feature/stabilize-world-interaction | Stale (3 days) | Merged | Delete |
| feature/time-of-day-system | Stale (12 days) | Merged | Delete |
| feature/category-based-material | Stale (12 days) | Unknown | Review |

### Worktrees

```
/Users/dblspeak/projects/kingdom-builder/.worktrees/vertex-color-lighting
```

**Status**: Active, 55 commits ahead of remote

---

## Cleanup Plan

### Step 1: Merge Current Work to Dev

```bash
# Merge state-management → dev
git checkout dev
git merge --no-ff state-management -m "Merge state-management: Inventory system + code evaluation"
git push origin dev
```

### Step 2: Clean Up Merged Feature Branches

```bash
# These are already merged to dev
git branch -d feature/shadow-optimization
git branch -d feature/stabilize-world-interaction
git branch -d feature/time-of-day-system

# Delete from remote
git push origin --delete feature/shadow-optimization
git push origin --delete feature/stabilize-world-interaction
```

### Step 3: Handle Vertex Color Lighting Worktree

```bash
# Option A: Merge if complete
cd .worktrees/vertex-color-lighting
git push origin feature/vertex-color-lighting
# Create PR, review, merge to dev

# Then remove worktree
git worktree remove .worktrees/vertex-color-lighting
git branch -d feature/vertex-color-lighting

# Option B: Abandon if obsolete
git worktree remove .worktrees/vertex-color-lighting --force
git branch -D feature/vertex-color-lighting
git push origin --delete feature/vertex-color-lighting
```

### Step 4: Release Dev to Main

```bash
# After all features merged to dev
git checkout main
git pull origin main
git merge --no-ff dev -m "Release v1.0.0: Hexagonal architecture complete"
git tag -a v1.0.0 -m "Release v1.0.0: Complete hexagonal voxel engine with 10 modules"
git push origin main --tags
```

### Step 5: Delete state-management Branch

```bash
# After merged to dev
git branch -d state-management
```

---

## Branch Protection Rules (GitHub)

### Protect `main`
- Require PR reviews (1 reviewer minimum)
- Require status checks to pass
- No direct pushes
- Require branches to be up to date

### Protect `dev`
- Require PR reviews (1 reviewer minimum)
- Require status checks to pass
- Allow direct pushes for maintainers (small fixes only)

---

## Commit Message Convention

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance
- `perf`: Performance improvement

### Examples
```
feat(rendering): implement greedy meshing algorithm

Reduces polygon count by 90% (30k → 3k per chunk).
Uses 0fps.net algorithm with lighting-aware face merging.

Closes #42
```

```
fix(physics): prevent 318MB/s data transfer bottleneck

Use transferable ArrayBuffers instead of structured clone.
Reduces transfer from 318MB/s to 500KB/s (99% reduction).
```

---

## Release Versioning

**Semantic Versioning**: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking API changes (v1.0.0 → v2.0.0)
- **MINOR**: New features, backwards compatible (v1.0.0 → v1.1.0)
- **PATCH**: Bug fixes, backwards compatible (v1.0.0 → v1.0.1)

### Current Version
- **v0.x.x** - Pre-release (not production-ready)
- **v1.0.0** - First release (after Phase 1 critical fixes)

---

## PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Performance improvement

## Testing
- [ ] Manual testing completed
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] No regressions

## Checklist
- [ ] Code follows hexagonal architecture
- [ ] No console.log in production code
- [ ] Documentation updated
- [ ] Breaking changes documented
```

---

## Common Commands

### Update from dev
```bash
git checkout your-feature-branch
git fetch origin
git rebase origin/dev  # Or merge if you prefer
```

### Sync fork (if applicable)
```bash
git remote add upstream https://github.com/original/repo.git
git fetch upstream
git checkout dev
git merge upstream/dev
```

### Fix merge conflicts
```bash
git status  # See conflicted files
# Edit files, resolve conflicts
git add .
git commit  # Completes merge
```

### Recover from mistakes
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Recover deleted branch
git reflog
git checkout -b recovered-branch <sha>
```

---

## Best Practices

### DO:
- ✅ Create PRs for all feature work
- ✅ Keep commits atomic and focused
- ✅ Write clear commit messages
- ✅ Rebase feature branches on dev regularly
- ✅ Delete branches after merging
- ✅ Tag releases on main
- ✅ Run tests before merging

### DON'T:
- ❌ Commit directly to main
- ❌ Force push to main or dev
- ❌ Merge without PR review
- ❌ Leave stale feature branches
- ❌ Commit broken code to dev
- ❌ Use generic commit messages ("fix stuff", "wip")

---

## CI/CD Integration (Future)

### GitHub Actions (Recommended)

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun lint
      - run: bun test  # When tests exist
      - run: bun build
```

---

## Current Action Items

1. **Merge state-management → dev** (has latest work)
2. **Review vertex-color-lighting worktree** (55 commits)
3. **Delete merged feature branches** (4 branches)
4. **Release dev → main** (132 commits ready)
5. **Tag v1.0.0 or v0.1.0** (depending on readiness)

See below for detailed commands.
