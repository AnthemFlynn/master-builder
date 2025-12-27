# Architectural Code Review Report

**Date:** 2025-12-27
**Reviewer:** Gemini CLI Agent

## Executive Summary

The codebase generally adheres to the Modular Monolith and Hexagonal Architecture patterns defined in the documentation. However, several critical architectural discrepancies and violations of CLEAN/SOLID principles were found. Most notably, a circular dependency exists between the `game` and `world` modules due to the improper location of the `EventBus`, and the `GameOrchestrator` conflates application logic with dependency injection/composition responsibilities.

## Key Findings

### 1. Circular Module Dependency (Critical)
**Observation:**
- `src/modules/game` depends on `src/modules/world` (GameOrchestrator orchestrates WorldService).
- `src/modules/world` depends on `src/modules/game` (WorldService imports `EventBus` from `../../game/infrastructure/EventBus`).

**Violation:**
- Violates the **Acyclic Dependency Principle**. Modules should form a directed acyclic graph (DAG).
- Coupling the foundational `world` module to the higher-level `game` orchestrator makes `world` impossible to test or reuse in isolation.

**Recommendation:**
- Move `EventBus` to `src/shared/infrastructure/EventBus.ts` or `src/shared/application/EventBus.ts`.
- Both `game` and `world` should depend on the `SharedKernel`.

### 2. Composition Root Violation
**Observation:**
- `src/modules/game/application/GameOrchestrator.ts` acts as the **Composition Root**, instantiating all services and *specifically* instantiating infrastructure adapters like `IndexedDBAdapter`.
- `GameOrchestrator` is located in the `Application` layer.

**Violation:**
- **Dependency Inversion Principle (DIP):** The Application layer is manually creating Infrastructure implementations. While it injects them (constructor injection), the creation logic is coupled to the class itself.
- **Single Responsibility Principle (SRP):** `GameOrchestrator` handles both game loop logic and system wiring/dependency injection.

**Recommendation:**
- Extract the wiring logic into a `GameFactory` or `main.ts` (Infrastructure layer).
- `GameOrchestrator` should receive fully instantiated services in its constructor.

### 3. Documentation vs. Implementation Discrepancies
**Observation:**
- **Module Structure:** Documentation lists `lighting` and `meshing` as top-level modules. In code, they are sub-components:
  - Lighting: `src/modules/environment/application/voxel-lighting`
  - Meshing: `src/modules/rendering/meshing-application`
- **Data Structures:** Documentation references `VoxelChunk` in `world/domain`. The code uses `ChunkData` in `shared/domain`.
- **Legacy Artifacts:** `EventBus.ts` contains a comment `// src/modules/terrain/application/EventBus.ts`, indicating it was copy-pasted from the legacy system without updates.

**Recommendation:**
- Update `docs/HEXAGONAL_ARCHITECTURE.md` to reflect the actual directory structure.
- Rename `ChunkData` to `VoxelChunk` if the domain concept is strong, or update docs to `ChunkData` (Shared Kernel).

### 4. Shared Kernel Usage
**Observation:**
- `ChunkData` and `IVoxelQuery` are correctly placed in `src/shared`, allowing `world`, `environment` (lighting), and `rendering` (meshing) to communicate without direct coupling. This is a **success** of the current architecture.

## Action Plan (Proposed)

1.  **Refactor EventBus:** Move `src/modules/game/infrastructure/EventBus.ts` -> `src/shared/infrastructure/EventBus.ts`. Update imports in `game`, `world`, etc.
2.  **Refactor Composition:** Move instantiation of `IndexedDBAdapter` and other services out of `GameOrchestrator` constructor and into `src/main.ts` or a `src/core/GameBuilder.ts`.
3.  **Update Docs:** Sync architecture documentation with the file system reality.
4.  **Clean Code:** Fix the file header comment in `EventBus.ts`.

## Token Economics
- File sizes are generally healthy (`<200 lines` for most, `~500` for Orchestrator).
- `GameOrchestrator` is growing large due to the combined responsibility of wiring and orchestration. Extracting the wiring will reduce its size and complexity, improving maintainability and reducing LLM context usage for modifications.

## Conclusion
The project is in a good state but requires immediate refactoring of the `EventBus` location to break the circular dependency. The `GameOrchestrator` should be treated as an Application Service, stripped of its "Factory" responsibilities.
