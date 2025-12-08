# Vertex Color Lighting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace InstancedMesh + DataTexture shader approach with BufferGeometry + vertex color lighting for correct multi-chunk RGB lighting.

**Architecture:** Per-chunk BufferGeometry meshes with lighting baked into vertex colors during greedy meshing. Supports smooth lighting, ambient occlusion, and dynamic updates with rebuild budget.

**Tech Stack:** Three.js 0.181, TypeScript 5.7, Greedy meshing algorithm, Vertex colors

---

See full plan in committed version or use /superpowers:execute-plan to begin implementation.

27 tasks covering:
- FaceBuilder (vertex generation with smooth lighting + AO)
- GreedyMesher (polygon reduction algorithm)
- ChunkMesh & ChunkMeshManager (lifecycle management)
- Migration from InstancedMesh
- Dynamic updates with hybrid strategy
- Testing & profiling

Estimated: 1-2 days focused development
