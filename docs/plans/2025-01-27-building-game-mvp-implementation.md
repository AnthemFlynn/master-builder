# Educational Building Game MVP - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build MVP of educational building game with smart snapping, physics simulation, AI mentor, and 5 starter challenges.

**Architecture:** React + Three.js frontend with smart snapping system. Node.js + Express backend integrating Anthropic Agent SDK for AI mentor. Physics simulation using Rapier. State management with Zustand. All components follow TDD with comprehensive test coverage.

**Tech Stack:**
- Frontend: React 18, TypeScript, Three.js, React Three Fiber, Zustand, Vite, TailwindCSS
- Backend: Node.js, Express, Anthropic Agent SDK, TypeScript
- Physics: @dimforge/rapier3d
- Testing: Vitest, React Testing Library, Playwright (E2E)

---

## Phase 1: Project Setup & Foundation

### Task 1: Initialize Monorepo Structure

**Files:**
- Create: `package.json` (root)
- Create: `client/package.json`
- Create: `server/package.json`
- Create: `shared/package.json`
- Create: `.gitignore`
- Create: `tsconfig.base.json`

**Step 1: Create root package.json with workspaces**

```json
{
  "name": "kingdom-builder-v2",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "client",
    "server",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.6.2"
  }
}
```

**Step 2: Create client package.json**

```json
{
  "name": "@kingdom-builder/client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "@dimforge/rapier3d": "^0.11.2",
    "@react-three/fiber": "^8.15.12",
    "@react-three/drei": "^9.92.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.170.0",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.170.0",
    "@vitejs/plugin-react-swc": "^3.7.1",
    "@vitest/ui": "^1.0.4",
    "autoprefixer": "^10.4.22",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.6.2",
    "vite": "^6.0.1",
    "vitest": "^1.0.4"
  }
}
```

**Step 3: Create server package.json**

```json
{
  "name": "@kingdom-builder/server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.5",
    "tsx": "^4.7.0",
    "typescript": "^5.6.2",
    "vitest": "^1.0.4"
  }
}
```

**Step 4: Create shared package.json**

```json
{
  "name": "@kingdom-builder/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "vitest": "^1.0.4"
  }
}
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.vite/
```

**Step 6: Create base TypeScript config**

Create: `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Step 7: Install dependencies**

```bash
npm install
```

Expected: All workspaces installed successfully

**Step 8: Commit project setup**

```bash
git add .
git commit -m "feat: initialize monorepo with client, server, shared workspaces

- Set up npm workspaces
- Add base TypeScript configuration
- Configure Vite for client
- Configure Express for server
- Add shared types package"
```

---

### Task 2: Setup Client Build Configuration

**Files:**
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`
- Create: `client/tsconfig.node.json`
- Create: `client/index.html`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/index.css`

**Step 1: Create Vite config**

Create: `client/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
});
```

**Step 2: Create client tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src"],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Step 3: Create tsconfig.node.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

**Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kingdom Builder - Learn Architecture</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 5: Create Tailwind config**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'blueprint-blue': '#2B5A9E',
        'golden-yellow': '#FFD700',
        'emerald-green': '#50C878',
        'coral-red': '#FF6B6B'
      }
    },
  },
  plugins: [],
}
```

**Step 6: Create PostCSS config**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 7: Create main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 8: Create App.tsx**

```typescript
import React from 'react';

function App() {
  return (
    <div className="w-screen h-screen bg-blueprint-blue flex items-center justify-center">
      <h1 className="text-4xl font-bold text-white">
        Kingdom Builder v2 - Coming Soon
      </h1>
    </div>
  );
}

export default App;
```

**Step 9: Create index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Step 10: Test dev server**

```bash
cd client
npm run dev
```

Expected: Server runs on http://localhost:5173, shows "Coming Soon" page

**Step 11: Commit client setup**

```bash
git add client/
git commit -m "feat: configure client build system

- Set up Vite with React and SWC
- Configure TypeScript for client
- Add Tailwind CSS
- Create basic App component"
```

---

### Task 3: Setup Server & Shared Types

**Files:**
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/.env.example`
- Create: `shared/tsconfig.json`
- Create: `shared/src/types/index.ts`
- Create: `shared/src/types/Player.ts`
- Create: `shared/src/types/Piece.ts`
- Create: `shared/src/types/Challenge.ts`

**Step 1: Create server tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

**Step 2: Create basic Express server**

Create: `server/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 3: Create .env.example**

```
PORT=3000
ANTHROPIC_API_KEY=your_api_key_here
```

**Step 4: Create shared tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
```

**Step 5: Create shared types structure**

Create: `shared/src/types/index.ts`

```typescript
export * from './Player';
export * from './Piece';
export * from './Challenge';
```

**Step 6: Create Player types**

Create: `shared/src/types/Player.ts`

```typescript
export interface Player {
  id: string;
  username: string;
  createdAt: number;
  title: string;
  level: number;
  xp: number;
  totalStars: number;
  completedChallenges: string[];
  unlockedPieces: string[];
  unlockedTiers: number[];
  achievements: string[];
  stats: PlayerStats;
}

export interface PlayerStats {
  totalBlocksPlaced: number;
  tallestStructure: number;
  favoriteMaterial: string;
  playTimeMinutes: number;
  buildingsCreated: number;
  physicsTestsPassed: number;
}
```

**Step 7: Create Piece types**

Create: `shared/src/types/Piece.ts`

```typescript
import { Vector3 } from './Common';

export interface PieceDefinition {
  id: string;
  name: string;
  category: PieceCategory;
  size: Vector3;
  connectionPoints: ConnectionPoint[];
  tier: number;
  unlockRequirement?: string;
}

export type PieceCategory =
  | 'foundation'
  | 'wall'
  | 'vertical'
  | 'horizontal'
  | 'roof'
  | 'decorative';

export interface ConnectionPoint {
  position: Vector3;
  normal: Vector3;
  type: 'snap' | 'align';
}

export interface PlacedPiece {
  id: string;
  pieceId: string;
  position: Vector3;
  rotation: Vector3;
  materialId: string;
}
```

**Step 8: Create Challenge types**

Create: `shared/src/types/Challenge.ts`

```typescript
export interface Challenge {
  id: string;
  name: string;
  description: string;
  branch: ChallengeBranch;
  type: ChallengeType;
  difficulty: number;
  learningObjective: string;
  requirements: ChallengeRequirements;
  hints: string[];
  unlocks: string[];
  prerequisiteChallenges: string[];
  starThresholds: StarThresholds;
  estimatedTimeMinutes: number;
  realWorldExample?: string;
}

export type ChallengeBranch =
  | 'foundations'
  | 'towers'
  | 'bridges'
  | 'balance'
  | 'beauty';

export type ChallengeType =
  | 'construction'
  | 'puzzle'
  | 'destruction'
  | 'speed'
  | 'resource'
  | 'style';

export interface ChallengeRequirements {
  minHeight?: number;
  maxHeight?: number;
  minPieces?: number;
  maxPieces?: number;
  requiredPieces?: string[];
  forbiddenPieces?: string[];
  mustBeStable: boolean;
  mustBeSymmetrical?: boolean;
  timeLimit?: number;
}

export interface StarThresholds {
  bronze: Partial<ChallengeRequirements>;
  silver: Partial<ChallengeRequirements>;
  gold: Partial<ChallengeRequirements> & {
    creativityScore?: number;
  };
}
```

**Step 9: Create Common types**

Create: `shared/src/types/Common.ts`

```typescript
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
```

Update: `shared/src/types/index.ts`

```typescript
export * from './Common';
export * from './Player';
export * from './Piece';
export * from './Challenge';
```

**Step 10: Build shared types**

```bash
cd shared
npm run build
```

Expected: Types compiled to dist/

**Step 11: Test server**

```bash
cd server
npm run dev
```

Expected: Server runs on port 3000

Test: `curl http://localhost:3000/api/health`

Expected: `{"status":"ok","timestamp":"..."}`

**Step 12: Commit server and shared setup**

```bash
git add server/ shared/
git commit -m "feat: setup server and shared types

- Create Express server with health endpoint
- Define core types: Player, Piece, Challenge
- Configure TypeScript for server and shared
- Add environment variables template"
```

---

## Phase 2: Core Building System

### Task 4: Implement Piece System with Tests

**Files:**
- Create: `shared/src/data/pieces.ts`
- Create: `shared/src/data/pieces.test.ts`

**Step 1: Write failing test for piece definitions**

Create: `shared/src/data/pieces.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { PIECE_DEFINITIONS, getPieceById, getPiecesByCategory } from './pieces';

describe('Piece Definitions', () => {
  it('should have at least foundation pieces', () => {
    expect(PIECE_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it('should find piece by id', () => {
    const piece = getPieceById('foundation-block');
    expect(piece).toBeDefined();
    expect(piece?.name).toBe('Foundation Block');
  });

  it('should filter pieces by category', () => {
    const foundationPieces = getPiecesByCategory('foundation');
    expect(foundationPieces.length).toBeGreaterThan(0);
    expect(foundationPieces.every(p => p.category === 'foundation')).toBe(true);
  });

  it('should have connection points for each piece', () => {
    const piece = getPieceById('foundation-block');
    expect(piece?.connectionPoints.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd shared
npm test pieces.test.ts
```

Expected: FAIL - "Cannot find module './pieces'"

**Step 3: Implement piece definitions**

Create: `shared/src/data/pieces.ts`

```typescript
import { PieceDefinition, ConnectionPoint } from '../types';

// Helper to create top/bottom connection points for a block
function createBlockConnections(width: number, depth: number, height: number): ConnectionPoint[] {
  const points: ConnectionPoint[] = [];

  // Top surface
  points.push({
    position: { x: 0, y: height / 2, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
    type: 'snap'
  });

  // Bottom surface
  points.push({
    position: { x: 0, y: -height / 2, z: 0 },
    normal: { x: 0, y: -1, z: 0 },
    type: 'snap'
  });

  // Side connections
  points.push({
    position: { x: width / 2, y: 0, z: 0 },
    normal: { x: 1, y: 0, z: 0 },
    type: 'align'
  });

  points.push({
    position: { x: -width / 2, y: 0, z: 0 },
    normal: { x: -1, y: 0, z: 0 },
    type: 'align'
  });

  return points;
}

export const PIECE_DEFINITIONS: PieceDefinition[] = [
  // Foundation pieces (Tier 1 - always unlocked)
  {
    id: 'foundation-block',
    name: 'Foundation Block',
    category: 'foundation',
    size: { x: 1, y: 0.5, z: 1 },
    connectionPoints: createBlockConnections(1, 1, 0.5),
    tier: 1
  },
  {
    id: 'foundation-wide',
    name: 'Wide Foundation',
    category: 'foundation',
    size: { x: 2, y: 0.5, z: 2 },
    connectionPoints: createBlockConnections(2, 2, 0.5),
    tier: 1
  },
  {
    id: 'support-column',
    name: 'Support Column',
    category: 'foundation',
    size: { x: 0.5, y: 1, z: 0.5 },
    connectionPoints: createBlockConnections(0.5, 0.5, 1),
    tier: 1
  },

  // Basic blocks (Tier 1)
  {
    id: 'block',
    name: 'Block',
    category: 'wall',
    size: { x: 1, y: 1, z: 1 },
    connectionPoints: createBlockConnections(1, 1, 1),
    tier: 1
  },
  {
    id: 'slab',
    name: 'Slab',
    category: 'wall',
    size: { x: 1, y: 0.5, z: 1 },
    connectionPoints: createBlockConnections(1, 1, 0.5),
    tier: 1
  },

  // Vertical elements (Unlocked via Tower challenges)
  {
    id: 'pillar',
    name: 'Pillar',
    category: 'vertical',
    size: { x: 0.5, y: 2, z: 0.5 },
    connectionPoints: createBlockConnections(0.5, 0.5, 2),
    tier: 2,
    unlockRequirement: 'challenge-watchtower'
  },
  {
    id: 'tall-column',
    name: 'Tall Column',
    category: 'vertical',
    size: { x: 0.75, y: 3, z: 0.75 },
    connectionPoints: createBlockConnections(0.75, 0.75, 3),
    tier: 2,
    unlockRequirement: 'challenge-twin-spires'
  },

  // Horizontal elements (Unlocked via Bridge challenges)
  {
    id: 'beam',
    name: 'Beam',
    category: 'horizontal',
    size: { x: 3, y: 0.5, z: 0.5 },
    connectionPoints: createBlockConnections(3, 0.5, 0.5),
    tier: 2,
    unlockRequirement: 'challenge-simple-span'
  },
  {
    id: 'arch-small',
    name: 'Small Arch',
    category: 'horizontal',
    size: { x: 2, y: 2, z: 0.5 },
    connectionPoints: [
      { position: { x: -1, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 }, type: 'snap' },
      { position: { x: 1, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 }, type: 'snap' }
    ],
    tier: 2,
    unlockRequirement: 'challenge-arch-bridge'
  }
];

export function getPieceById(id: string): PieceDefinition | undefined {
  return PIECE_DEFINITIONS.find(p => p.id === id);
}

export function getPiecesByCategory(category: string): PieceDefinition[] {
  return PIECE_DEFINITIONS.filter(p => p.category === category);
}

export function getPiecesByTier(tier: number): PieceDefinition[] {
  return PIECE_DEFINITIONS.filter(p => p.tier === tier);
}

export function getUnlockedPieces(unlockedChallenges: string[], tier: number): PieceDefinition[] {
  return PIECE_DEFINITIONS.filter(piece => {
    // Tier 1 pieces always unlocked
    if (piece.tier === 1) return true;

    // Check tier unlocked
    if (piece.tier > tier) return false;

    // Check challenge requirement
    if (piece.unlockRequirement) {
      return unlockedChallenges.includes(piece.unlockRequirement);
    }

    return true;
  });
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test pieces.test.ts
```

Expected: All tests PASS

**Step 5: Commit piece system**

```bash
git add shared/src/data/
git commit -m "feat: implement piece definition system

- Add 9 base piece definitions
- Create helper functions for piece queries
- Add connection point system for snapping
- Include comprehensive tests"
```

---

### Task 5: Create Challenge Definitions with Tests

**Files:**
- Create: `shared/src/data/challenges.ts`
- Create: `shared/src/data/challenges.test.ts`

**Step 1: Write failing test for challenge definitions**

Create: `shared/src/data/challenges.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  CHALLENGES,
  getChallengeById,
  getChallengesByBranch,
  getAvailableChallenges
} from './challenges';

describe('Challenge Definitions', () => {
  it('should have foundation challenges', () => {
    const foundationChallenges = getChallengesByBranch('foundations');
    expect(foundationChallenges.length).toBeGreaterThan(0);
  });

  it('should find challenge by id', () => {
    const challenge = getChallengeById('first-foundation');
    expect(challenge).toBeDefined();
    expect(challenge?.name).toBe('First Foundation');
  });

  it('should return available challenges based on completed', () => {
    const available = getAvailableChallenges([]);
    expect(available.length).toBeGreaterThan(0);
    expect(available.every(c => c.prerequisiteChallenges.length === 0)).toBe(true);
  });

  it('should unlock dependent challenges', () => {
    const available = getAvailableChallenges(['first-foundation', 'simple-support']);
    const stableStructure = available.find(c => c.id === 'stable-structure');
    expect(stableStructure).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd shared
npm test challenges.test.ts
```

Expected: FAIL - "Cannot find module './challenges'"

**Step 3: Implement challenge definitions**

Create: `shared/src/data/challenges.ts`

```typescript
import { Challenge } from '../types';

export const CHALLENGES: Challenge[] = [
  // FOUNDATIONS BRANCH
  {
    id: 'first-foundation',
    name: 'First Foundation',
    description: 'Place foundation blocks and learn the grid snapping system',
    branch: 'foundations',
    type: 'construction',
    difficulty: 1,
    learningObjective: 'Understanding grid alignment and basic placement',
    requirements: {
      minPieces: 3,
      mustBeStable: true
    },
    hints: [
      'Click on the glowing surface to place your first block',
      'Foundation blocks snap to a grid automatically',
      'Stack blocks on top of each other'
    ],
    unlocks: ['block', 'slab'],
    prerequisiteChallenges: [],
    starThresholds: {
      bronze: {},
      silver: { maxPieces: 5 },
      gold: { maxPieces: 3 }
    },
    estimatedTimeMinutes: 2
  },
  {
    id: 'simple-support',
    name: 'Simple Support',
    description: 'Add columns to support a structure and see stress visualization',
    branch: 'foundations',
    type: 'construction',
    difficulty: 1,
    learningObjective: 'Understanding vertical support and load distribution',
    requirements: {
      minHeight: 2,
      requiredPieces: ['support-column'],
      mustBeStable: true
    },
    hints: [
      'Columns provide vertical support',
      'Watch the stress indicators - green means stable',
      'Place columns under heavy blocks'
    ],
    unlocks: [],
    prerequisiteChallenges: ['first-foundation'],
    starThresholds: {
      bronze: {},
      silver: { maxPieces: 8 },
      gold: { maxPieces: 6 }
    },
    estimatedTimeMinutes: 3
  },
  {
    id: 'stable-structure',
    name: 'Stable Structure',
    description: 'Build a 5-block tall tower that passes physics test',
    branch: 'foundations',
    type: 'construction',
    difficulty: 2,
    learningObjective: 'Foundation width must support height',
    requirements: {
      minHeight: 5,
      mustBeStable: true
    },
    hints: [
      'Taller structures need wider foundations',
      'Stack blocks directly above supports',
      'Test your structure before submitting'
    ],
    unlocks: [],
    prerequisiteChallenges: ['first-foundation', 'simple-support'],
    starThresholds: {
      bronze: {},
      silver: { maxPieces: 12 },
      gold: { maxPieces: 10, creativityScore: 7 }
    },
    estimatedTimeMinutes: 5,
    realWorldExample: 'Like building a stable tower with blocks!'
  },

  // TOWERS BRANCH (unlocked after foundations)
  {
    id: 'watchtower',
    name: 'Watchtower',
    description: 'Build a tower 10 blocks tall that remains stable',
    branch: 'towers',
    type: 'construction',
    difficulty: 3,
    learningObjective: 'Vertical building and structural stability',
    requirements: {
      minHeight: 10,
      mustBeStable: true
    },
    hints: [
      'Use a 3x3 foundation for a 10-block tower',
      'Pillars are taller and more efficient',
      'Keep weight centered'
    ],
    unlocks: ['pillar', 'tall-column'],
    prerequisiteChallenges: ['stable-structure'],
    starThresholds: {
      bronze: {},
      silver: { maxPieces: 20 },
      gold: { maxPieces: 15, creativityScore: 8 }
    },
    estimatedTimeMinutes: 8,
    realWorldExample: 'Medieval watchtowers protected castle walls'
  },

  // BRIDGES BRANCH
  {
    id: 'simple-span',
    name: 'Simple Span',
    description: 'Build a bridge across a 5-block gap',
    branch: 'bridges',
    type: 'construction',
    difficulty: 3,
    learningObjective: 'Horizontal spanning and support',
    requirements: {
      minPieces: 5,
      mustBeStable: true
    },
    hints: [
      'Beams can span horizontal distances',
      'Support both ends of the span',
      'Add a walkway on top'
    ],
    unlocks: ['beam'],
    prerequisiteChallenges: ['stable-structure'],
    starThresholds: {
      bronze: {},
      silver: { maxPieces: 12 },
      gold: { maxPieces: 8, creativityScore: 7 }
    },
    estimatedTimeMinutes: 7,
    realWorldExample: 'Simple beam bridges cross small gaps'
  }
];

export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGES.find(c => c.id === id);
}

export function getChallengesByBranch(branch: string): Challenge[] {
  return CHALLENGES.filter(c => c.branch === branch);
}

export function getAvailableChallenges(completedChallenges: string[]): Challenge[] {
  return CHALLENGES.filter(challenge => {
    // Already completed
    if (completedChallenges.includes(challenge.id)) return false;

    // Check prerequisites
    return challenge.prerequisiteChallenges.every(prereq =>
      completedChallenges.includes(prereq)
    );
  });
}

export function validateChallengeCompletion(
  challenge: Challenge,
  buildData: {
    pieceCount: number;
    height: number;
    isStable: boolean;
    pieces: string[];
  }
): { passed: boolean; stars: number; feedback: string[] } {
  const feedback: string[] = [];
  let passed = true;

  // Check stability
  if (challenge.requirements.mustBeStable && !buildData.isStable) {
    feedback.push('Structure is not stable - it collapsed in physics test');
    passed = false;
  }

  // Check height requirements
  if (challenge.requirements.minHeight && buildData.height < challenge.requirements.minHeight) {
    feedback.push(`Structure must be at least ${challenge.requirements.minHeight} blocks tall`);
    passed = false;
  }

  // Check piece count
  if (challenge.requirements.minPieces && buildData.pieceCount < challenge.requirements.minPieces) {
    feedback.push(`Must use at least ${challenge.requirements.minPieces} pieces`);
    passed = false;
  }

  // Check required pieces
  if (challenge.requirements.requiredPieces) {
    const missingPieces = challenge.requirements.requiredPieces.filter(
      required => !buildData.pieces.includes(required)
    );
    if (missingPieces.length > 0) {
      feedback.push(`Must use: ${missingPieces.join(', ')}`);
      passed = false;
    }
  }

  if (!passed) {
    return { passed: false, stars: 0, feedback };
  }

  // Calculate stars
  let stars = 1; // Bronze

  // Check silver threshold
  const silverReqs = challenge.starThresholds.silver;
  if (silverReqs.maxPieces && buildData.pieceCount <= silverReqs.maxPieces) {
    stars = 2;
  }

  // Check gold threshold (simplified - creativity would come from AI)
  const goldReqs = challenge.starThresholds.gold;
  if (goldReqs.maxPieces && buildData.pieceCount <= goldReqs.maxPieces) {
    stars = 3;
  }

  return { passed: true, stars, feedback: ['Challenge complete!'] };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test challenges.test.ts
```

Expected: All tests PASS

**Step 5: Commit challenge system**

```bash
git add shared/src/data/challenges.ts shared/src/data/challenges.test.ts
git commit -m "feat: implement challenge definition system

- Add 5 starter challenges (3 foundations, 1 tower, 1 bridge)
- Create helper functions for challenge queries
- Add challenge validation logic
- Include prerequisite system
- Add comprehensive tests"
```

---

### Task 6: Build Three.js Scene with Smart Snapping

**Files:**
- Create: `client/src/game/BuildingScene.ts`
- Create: `client/src/game/BuildingScene.test.ts`
- Create: `client/src/game/SnapSystem.ts`
- Create: `client/src/game/SnapSystem.test.ts`

**Step 1: Write failing test for snap system**

Create: `client/src/game/SnapSystem.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { SnapSystem } from './SnapSystem';
import * as THREE from 'three';

describe('SnapSystem', () => {
  it('should find nearest snap surface', () => {
    const snapSystem = new SnapSystem();

    // Add a test surface (top of a block at y=0.5)
    const testBlock = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    testBlock.position.set(0, 0, 0);

    const surface = snapSystem.findNearestSurface(
      { x: 0.1, y: 1.0, z: 0.1 },
      [testBlock]
    );

    expect(surface).toBeDefined();
    expect(surface?.position.y).toBeCloseTo(0.5);
  });

  it('should calculate snap position on surface', () => {
    const snapSystem = new SnapSystem();

    const surface = {
      position: { x: 0, y: 0.5, z: 0 },
      normal: { x: 0, y: 1, z: 0 }
    };

    const snapPos = snapSystem.calculateSnapPosition(
      surface,
      { x: 1, y: 1, z: 1 } // piece size
    );

    expect(snapPos.y).toBeCloseTo(1.0); // 0.5 + 1/2
  });

  it('should return null if no surface nearby', () => {
    const snapSystem = new SnapSystem();

    const surface = snapSystem.findNearestSurface(
      { x: 100, y: 100, z: 100 },
      []
    );

    expect(surface).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd client
npm test SnapSystem.test.ts
```

Expected: FAIL - "Cannot find module './SnapSystem'"

**Step 3: Implement SnapSystem**

Create: `client/src/game/SnapSystem.ts`

```typescript
import * as THREE from 'three';

export interface SnapSurface {
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  mesh: THREE.Mesh;
}

export class SnapSystem {
  private snapDistance = 2.0; // Maximum distance to snap

  /**
   * Find the nearest valid snap surface to a point
   */
  findNearestSurface(
    point: { x: number; y: number; z: number },
    existingMeshes: THREE.Mesh[]
  ): SnapSurface | null {
    let nearestSurface: SnapSurface | null = null;
    let nearestDistance = this.snapDistance;

    for (const mesh of existingMeshes) {
      const surfaces = this.extractSurfaces(mesh);

      for (const surface of surfaces) {
        const distance = this.distanceToPoint(surface.position, point);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSurface = surface;
        }
      }
    }

    return nearestSurface;
  }

  /**
   * Calculate where a piece should snap to on a surface
   */
  calculateSnapPosition(
    surface: SnapSurface,
    pieceSize: { x: number; y: number; z: number }
  ): THREE.Vector3 {
    const pos = new THREE.Vector3(
      surface.position.x,
      surface.position.y,
      surface.position.z
    );

    const normal = new THREE.Vector3(
      surface.normal.x,
      surface.normal.y,
      surface.normal.z
    );

    // Offset by half the piece size in the normal direction
    const offset = normal.clone().multiplyScalar(
      this.getOffsetForNormal(normal, pieceSize)
    );

    return pos.add(offset);
  }

  /**
   * Extract all snap surfaces from a mesh
   */
  private extractSurfaces(mesh: THREE.Mesh): SnapSurface[] {
    const surfaces: SnapSurface[] = [];
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    const center = new THREE.Vector3();
    box.getCenter(center);

    // Top surface
    surfaces.push({
      position: { x: center.x, y: box.max.y, z: center.z },
      normal: { x: 0, y: 1, z: 0 },
      mesh
    });

    // Bottom surface
    surfaces.push({
      position: { x: center.x, y: box.min.y, z: center.z },
      normal: { x: 0, y: -1, z: 0 },
      mesh
    });

    // Front, back, left, right surfaces could be added here

    return surfaces;
  }

  private distanceToPoint(
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number }
  ): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private getOffsetForNormal(
    normal: THREE.Vector3,
    pieceSize: { x: number; y: number; z: number }
  ): number {
    // Return half the piece dimension in the normal direction
    if (Math.abs(normal.y) > 0.9) {
      return pieceSize.y / 2;
    } else if (Math.abs(normal.x) > 0.9) {
      return pieceSize.x / 2;
    } else {
      return pieceSize.z / 2;
    }
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test SnapSystem.test.ts
```

Expected: All tests PASS

**Step 5: Commit snap system**

```bash
git add client/src/game/SnapSystem.ts client/src/game/SnapSystem.test.ts
git commit -m "feat: implement smart snapping system

- Add surface detection from existing meshes
- Calculate snap positions based on piece size
- Support top/bottom surface snapping
- Include comprehensive tests"
```

---

## Phase 3: Physics Integration

### Task 7: Integrate Rapier Physics Engine

**Files:**
- Create: `client/src/game/PhysicsEngine.ts`
- Create: `client/src/game/PhysicsEngine.test.ts`

**Step 1: Write failing test for physics engine**

Create: `client/src/game/PhysicsEngine.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine } from './PhysicsEngine';
import * as THREE from 'three';

describe('PhysicsEngine', () => {
  let physics: PhysicsEngine;

  beforeEach(async () => {
    physics = new PhysicsEngine();
    await physics.initialize();
  });

  it('should initialize successfully', () => {
    expect(physics.isInitialized()).toBe(true);
  });

  it('should add rigid body for mesh', () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    mesh.position.set(0, 5, 0);

    const bodyId = physics.addRigidBody(mesh, 'dynamic');
    expect(bodyId).toBeDefined();
  });

  it('should detect falling block', async () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    mesh.position.set(0, 10, 0);

    physics.addRigidBody(mesh, 'dynamic');

    // Simulate for 1 second
    for (let i = 0; i < 60; i++) {
      physics.step(1/60);
    }

    // Should have fallen
    expect(mesh.position.y).toBeLessThan(5);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test PhysicsEngine.test.ts
```

Expected: FAIL - "Cannot find module './PhysicsEngine'"

**Step 3: Implement PhysicsEngine**

Create: `client/src/game/PhysicsEngine.ts`

```typescript
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';

export type BodyType = 'static' | 'dynamic';

export class PhysicsEngine {
  private world: RAPIER.World | null = null;
  private bodies: Map<string, RAPIER.RigidBody> = new Map();
  private meshToBody: Map<THREE.Mesh, string> = new Map();

  async initialize(): Promise<void> {
    await RAPIER.init();

    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);
  }

  isInitialized(): boolean {
    return this.world !== null;
  }

  /**
   * Add a rigid body for a Three.js mesh
   */
  addRigidBody(mesh: THREE.Mesh, type: BodyType = 'dynamic'): string {
    if (!this.world) throw new Error('Physics not initialized');

    const id = `body-${Math.random().toString(36).substr(2, 9)}`;

    // Create rigid body description
    const bodyDesc = type === 'dynamic'
      ? RAPIER.RigidBodyDesc.dynamic()
      : RAPIER.RigidBodyDesc.fixed();

    bodyDesc.setTranslation(
      mesh.position.x,
      mesh.position.y,
      mesh.position.z
    );

    const body = this.world.createRigidBody(bodyDesc);

    // Create collider from mesh geometry
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      size.x / 2,
      size.y / 2,
      size.z / 2
    );

    this.world.createCollider(colliderDesc, body);

    this.bodies.set(id, body);
    this.meshToBody.set(mesh, id);

    return id;
  }

  /**
   * Step the physics simulation
   */
  step(deltaTime: number): void {
    if (!this.world) return;
    this.world.step();
  }

  /**
   * Sync Three.js mesh positions with physics bodies
   */
  syncMeshes(): void {
    this.meshToBody.forEach((bodyId, mesh) => {
      const body = this.bodies.get(bodyId);
      if (!body) return;

      const position = body.translation();
      mesh.position.set(position.x, position.y, position.z);

      const rotation = body.rotation();
      mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    });
  }

  /**
   * Remove a rigid body
   */
  removeRigidBody(mesh: THREE.Mesh): void {
    const bodyId = this.meshToBody.get(mesh);
    if (!bodyId || !this.world) return;

    const body = this.bodies.get(bodyId);
    if (body) {
      this.world.removeRigidBody(body);
      this.bodies.delete(bodyId);
    }
    this.meshToBody.delete(mesh);
  }

  /**
   * Check if structure is stable (no significant movement)
   */
  isStructureStable(meshes: THREE.Mesh[], threshold = 0.01): boolean {
    for (const mesh of meshes) {
      const bodyId = this.meshToBody.get(mesh);
      if (!bodyId) continue;

      const body = this.bodies.get(bodyId);
      if (!body) continue;

      const velocity = body.linvel();
      const speed = Math.sqrt(
        velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
      );

      if (speed > threshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.bodies.clear();
    this.meshToBody.clear();
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test PhysicsEngine.test.ts
```

Expected: All tests PASS

**Step 5: Commit physics engine**

```bash
git add client/src/game/PhysicsEngine.ts client/src/game/PhysicsEngine.test.ts
git commit -m "feat: integrate Rapier physics engine

- Add rigid body creation for meshes
- Implement physics stepping and syncing
- Add stability detection
- Include comprehensive tests"
```

---

## Phase 4: State Management & UI

### Task 8: Setup Zustand State Management

**Files:**
- Create: `client/src/state/gameStore.ts`
- Create: `client/src/state/gameStore.test.ts`

**Step 1: Write failing test for game store**

Create: `client/src/state/gameStore.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

describe('Game Store', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('should initialize with default state', () => {
    const state = useGameStore.getState();
    expect(state.placedPieces).toEqual([]);
    expect(state.selectedPieceId).toBeNull();
    expect(state.currentChallenge).toBeNull();
  });

  it('should select a piece', () => {
    const { selectPiece } = useGameStore.getState();
    selectPiece('foundation-block');

    expect(useGameStore.getState().selectedPieceId).toBe('foundation-block');
  });

  it('should place a piece', () => {
    const { placePiece } = useGameStore.getState();

    placePiece({
      id: 'piece-1',
      pieceId: 'block',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      materialId: 'oak'
    });

    expect(useGameStore.getState().placedPieces.length).toBe(1);
  });

  it('should remove a piece', () => {
    const { placePiece, removePiece } = useGameStore.getState();

    placePiece({
      id: 'piece-1',
      pieceId: 'block',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      materialId: 'oak'
    });

    removePiece('piece-1');

    expect(useGameStore.getState().placedPieces.length).toBe(0);
  });

  it('should start a challenge', () => {
    const { startChallenge } = useGameStore.getState();
    startChallenge('first-foundation');

    expect(useGameStore.getState().currentChallenge).toBe('first-foundation');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test gameStore.test.ts
```

Expected: FAIL - "Cannot find module './gameStore'"

**Step 3: Implement game store**

Create: `client/src/state/gameStore.ts`

```typescript
import { create } from 'zustand';
import { PlacedPiece } from '@kingdom-builder/shared/types';

interface GameState {
  // Piece placement
  placedPieces: PlacedPiece[];
  selectedPieceId: string | null;
  hoveredSurface: { position: { x: number; y: number; z: number } } | null;

  // Challenge state
  currentChallenge: string | null;
  completedChallenges: string[];

  // Player progress
  unlockedPieces: string[];
  totalStars: number;
  xp: number;
  level: number;

  // UI state
  showHints: boolean;
  showStressVisualization: boolean;
  mode: 'build' | 'test' | 'view';

  // Actions
  selectPiece: (pieceId: string | null) => void;
  placePiece: (piece: PlacedPiece) => void;
  removePiece: (pieceId: string) => void;
  setHoveredSurface: (surface: { position: { x: number; y: number; z: number } } | null) => void;

  startChallenge: (challengeId: string) => void;
  completeChallenge: (challengeId: string, stars: number) => void;

  unlockPieces: (pieceIds: string[]) => void;
  addXP: (amount: number) => void;

  setMode: (mode: 'build' | 'test' | 'view') => void;
  toggleHints: () => void;
  toggleStressVisualization: () => void;

  reset: () => void;
}

const initialState = {
  placedPieces: [],
  selectedPieceId: null,
  hoveredSurface: null,
  currentChallenge: null,
  completedChallenges: [],
  unlockedPieces: ['foundation-block', 'foundation-wide', 'support-column', 'block', 'slab'],
  totalStars: 0,
  xp: 0,
  level: 1,
  showHints: true,
  showStressVisualization: true,
  mode: 'build' as const
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  selectPiece: (pieceId) => set({ selectedPieceId: pieceId }),

  placePiece: (piece) => set((state) => ({
    placedPieces: [...state.placedPieces, piece]
  })),

  removePiece: (pieceId) => set((state) => ({
    placedPieces: state.placedPieces.filter(p => p.id !== pieceId)
  })),

  setHoveredSurface: (surface) => set({ hoveredSurface: surface }),

  startChallenge: (challengeId) => set({
    currentChallenge: challengeId,
    placedPieces: [],
    mode: 'build'
  }),

  completeChallenge: (challengeId, stars) => set((state) => ({
    completedChallenges: [...state.completedChallenges, challengeId],
    totalStars: state.totalStars + stars,
    currentChallenge: null
  })),

  unlockPieces: (pieceIds) => set((state) => ({
    unlockedPieces: [...new Set([...state.unlockedPieces, ...pieceIds])]
  })),

  addXP: (amount) => set((state) => {
    const newXP = state.xp + amount;
    const newLevel = Math.floor(newXP / 1000) + 1;

    return {
      xp: newXP,
      level: newLevel
    };
  }),

  setMode: (mode) => set({ mode }),
  toggleHints: () => set((state) => ({ showHints: !state.showHints })),
  toggleStressVisualization: () => set((state) => ({
    showStressVisualization: !state.showStressVisualization
  })),

  reset: () => set(initialState)
}));
```

**Step 4: Run tests to verify they pass**

```bash
npm test gameStore.test.ts
```

Expected: All tests PASS

**Step 5: Commit state management**

```bash
git add client/src/state/
git commit -m "feat: implement Zustand state management

- Add game state store with piece placement
- Track challenge progress and completion
- Manage player progression (XP, level, unlocks)
- Include UI state (mode, hints, visualization)
- Add comprehensive tests"
```

---

## Phase 5: Backend & AI Mentor

### Task 9: Setup Express API Routes

**Files:**
- Create: `server/src/routes/mentor.ts`
- Create: `server/src/routes/challenges.ts`
- Modify: `server/src/index.ts`

**Step 1: Create mentor routes**

Create: `server/src/routes/mentor.ts`

```typescript
import express from 'express';

const router = express.Router();

// Get hint for current build
router.post('/hint', async (req, res) => {
  try {
    const { playerId, challengeId, screenshot, question } = req.body;

    // TODO: Integrate Agent SDK
    res.json({
      hint: "This is a placeholder hint. Agent SDK integration coming next."
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get hint' });
  }
});

// Review a portfolio build
router.post('/review', async (req, res) => {
  try {
    const { playerId, buildId, screenshot } = req.body;

    // TODO: Integrate Agent SDK
    res.json({
      feedback: "Placeholder review",
      score: 7.5
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review build' });
  }
});

export default router;
```

**Step 2: Create challenges routes**

Create: `server/src/routes/challenges.ts`

```typescript
import express from 'express';
import { CHALLENGES, getAvailableChallenges } from '@kingdom-builder/shared/data/challenges';

const router = express.Router();

// Get all challenges
router.get('/', (req, res) => {
  res.json(CHALLENGES);
});

// Get available challenges for player
router.get('/available/:playerId', (req, res) => {
  // TODO: Get player's completed challenges from database
  const completedChallenges: string[] = [];

  const available = getAvailableChallenges(completedChallenges);
  res.json(available);
});

// Validate challenge completion
router.post('/validate', (req, res) => {
  const { challengeId, buildData } = req.body;

  // TODO: Implement validation logic
  res.json({
    passed: true,
    stars: 2,
    feedback: ['Great work!']
  });
});

export default router;
```

**Step 3: Update server index to use routes**

Modify: `server/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mentorRoutes from './routes/mentor';
import challengeRoutes from './routes/challenges';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // For screenshots

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/mentor', mentorRoutes);
app.use('/api/challenges', challengeRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 4: Test routes**

```bash
cd server
npm run dev
```

Test: `curl http://localhost:3000/api/challenges`

Expected: JSON array of challenges

Test: `curl -X POST http://localhost:3000/api/mentor/hint -H "Content-Type: application/json" -d '{"playerId":"test","challengeId":"first-foundation"}'`

Expected: JSON with hint

**Step 5: Commit API routes**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "feat: create Express API routes for mentor and challenges

- Add /api/mentor/hint endpoint for AI hints
- Add /api/mentor/review for portfolio reviews
- Add /api/challenges endpoints for challenge data
- Add validation endpoint for challenge completion"
```

---

### Task 10: Integrate Anthropic Agent SDK (Basic)

**Files:**
- Create: `server/src/agents/CoachAgent.ts`
- Create: `server/src/agents/CoachAgent.test.ts`
- Create: `server/src/tools/gameTools.ts`
- Modify: `server/src/routes/mentor.ts`

**Step 1: Write test for CoachAgent**

Create: `server/src/agents/CoachAgent.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CoachAgent } from './CoachAgent';

describe('CoachAgent', () => {
  let agent: CoachAgent;

  beforeEach(() => {
    agent = new CoachAgent();
  });

  it('should provide hint for challenge', async () => {
    const hint = await agent.getHint({
      playerId: 'test-player',
      challengeId: 'first-foundation',
      question: 'How do I start?'
    });

    expect(hint).toBeDefined();
    expect(hint.length).toBeGreaterThan(0);
  }, 30000); // 30 second timeout for API call

  it('should maintain session context', async () => {
    const playerId = 'test-player';

    await agent.getHint({
      playerId,
      challengeId: 'first-foundation',
      question: 'How do I place blocks?'
    });

    const secondHint = await agent.getHint({
      playerId,
      challengeId: 'first-foundation',
      question: 'What next?'
    });

    expect(secondHint).toBeDefined();
  }, 60000);
});
```

**Step 2: Run test to verify it fails**

```bash
cd server
npm test CoachAgent.test.ts
```

Expected: FAIL - "Cannot find module './CoachAgent'"

**Step 3: Create game tools MCP server**

Create: `server/src/tools/gameTools.ts`

```typescript
import { z } from 'zod';

// Placeholder tool definitions for Agent SDK
export const gameTools = {
  validateStructure: {
    description: 'Check if a structure meets challenge requirements',
    inputSchema: z.object({
      challengeId: z.string(),
      pieceCount: z.number(),
      height: z.number(),
      isStable: z.boolean()
    }),
    handler: async (input: any) => {
      // TODO: Implement actual validation
      return {
        isValid: true,
        feedback: 'Structure looks good!'
      };
    }
  },

  explainConcept: {
    description: 'Explain an architectural or engineering concept',
    inputSchema: z.object({
      concept: z.string()
    }),
    handler: async (input: any) => {
      const concepts: Record<string, string> = {
        'foundation': 'A foundation is the base of a structure that supports its weight and distributes it to the ground.',
        'arch': 'An arch is a curved structure that spans an opening and supports weight by transferring it to supports on either side.',
        'symmetry': 'Symmetry in architecture means both sides of a structure mirror each other, creating visual balance.'
      };

      return {
        explanation: concepts[input.concept] || 'Let me explain that concept...'
      };
    }
  }
};
```

**Step 4: Implement CoachAgent**

Create: `server/src/agents/CoachAgent.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface HintRequest {
  playerId: string;
  challengeId: string;
  question?: string;
  screenshot?: string;
}

export class CoachAgent {
  private client: Anthropic;
  private sessionHistory: Map<string, any[]> = new Map();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }

    this.client = new Anthropic({ apiKey });
  }

  async getHint(request: HintRequest): Promise<string> {
    const sessionKey = `coach-${request.playerId}-${request.challengeId}`;

    // Get or initialize session history
    let messages = this.sessionHistory.get(sessionKey) || [];

    // Build user message
    const content: any[] = [
      {
        type: 'text',
        text: request.question || 'I need help with this challenge'
      }
    ];

    // Add screenshot if provided
    if (request.screenshot) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: request.screenshot.replace(/^data:image\/jpeg;base64,/, '')
        }
      });
    }

    messages.push({
      role: 'user',
      content
    });

    // Call Claude
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: this.getSystemPrompt(request.challengeId),
      messages
    });

    const assistantMessage = response.content[0];
    const hint = assistantMessage.type === 'text' ? assistantMessage.text : '';

    // Store assistant response in history
    messages.push({
      role: 'assistant',
      content: [{ type: 'text', text: hint }]
    });

    this.sessionHistory.set(sessionKey, messages);

    return hint;
  }

  private getSystemPrompt(challengeId: string): string {
    return `You are Master Aldric, a warm and encouraging architecture mentor teaching a 9-12 year old child.

Your student is working on the "${challengeId}" challenge.

Guidelines:
- Be warm, patient, and encouraging
- Use simple, age-appropriate language
- Give specific, actionable hints (not full solutions)
- Explain WHY things work, teaching real engineering concepts
- Keep responses under 60 words
- If they're stuck, offer one clear next step
- Celebrate their efforts and progress

Remember: Your goal is to teach, not just solve problems for them.`;
  }

  clearSession(playerId: string, challengeId: string): void {
    const sessionKey = `coach-${playerId}-${challengeId}`;
    this.sessionHistory.delete(sessionKey);
  }
}
```

**Step 5: Update mentor routes to use CoachAgent**

Modify: `server/src/routes/mentor.ts`

```typescript
import express from 'express';
import { CoachAgent } from '../agents/CoachAgent';

const router = express.Router();
const coachAgent = new CoachAgent();

// Get hint for current build
router.post('/hint', async (req, res) => {
  try {
    const { playerId, challengeId, screenshot, question } = req.body;

    const hint = await coachAgent.getHint({
      playerId,
      challengeId,
      question,
      screenshot
    });

    res.json({ hint });
  } catch (error: any) {
    console.error('Hint error:', error);
    res.status(500).json({ error: error.message || 'Failed to get hint' });
  }
});

// Review a portfolio build
router.post('/review', async (req, res) => {
  try {
    const { playerId, buildId, screenshot } = req.body;

    // TODO: Integrate PortfolioAgent
    res.json({
      feedback: "Portfolio agent coming soon!",
      score: 7.5
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to review build' });
  }
});

export default router;
```

**Step 6: Create .env file for testing**

Create: `server/.env`

```
PORT=3000
ANTHROPIC_API_KEY=your_actual_api_key_here
```

**Step 7: Test CoachAgent (skip if no API key)**

```bash
# Only run if you have API key
npm test CoachAgent.test.ts
```

Expected: Tests pass with real API responses

**Step 8: Commit AI mentor integration**

```bash
git add server/src/agents/ server/src/tools/ server/src/routes/mentor.ts
git commit -m "feat: integrate Anthropic Agent SDK for AI mentor

- Create CoachAgent with session management
- Add hint generation with vision support
- Implement system prompts for age-appropriate guidance
- Update mentor routes to use CoachAgent
- Add game tools placeholder for future MCP server"
```

---

## Summary & Next Steps

### Completed Tasks

✅ **Phase 1: Project Setup**
- Monorepo with client, server, shared workspaces
- TypeScript configuration
- Build tooling (Vite, Express)
- Shared type definitions

✅ **Phase 2: Core Systems**
- Piece definition system with 9 base pieces
- Challenge system with 5 starter challenges
- Smart snapping system with surface detection

✅ **Phase 3: Physics**
- Rapier physics engine integration
- Rigid body simulation
- Stability detection

✅ **Phase 4: State Management**
- Zustand store for game state
- Piece placement tracking
- Challenge progression

✅ **Phase 5: Backend & AI**
- Express API routes
- Anthropic Agent SDK integration
- CoachAgent for hints

### Remaining Tasks for MVP

**UI Components** (5-7 days):
- Task 11: Three.js scene component with React Three Fiber
- Task 12: Piece palette UI
- Task 13: Challenge UI (requirements, hints, test button)
- Task 14: HUD (progress, XP, level)
- Task 15: Tutorial overlay

**Integration** (3-5 days):
- Task 16: Connect UI to game store
- Task 17: Wire up physics testing
- Task 18: Implement challenge validation
- Task 19: Add sound effects (Tone.js)

**Polish** (2-3 days):
- Task 20: Loading states and error handling
- Task 21: Responsive design
- Task 22: Accessibility features
- Task 23: Performance optimization

**Testing & Deployment** (2-3 days):
- Task 24: E2E tests with Playwright
- Task 25: Build optimization
- Task 26: Deployment configuration

### Recommended Execution Approach

This plan is **ready for execution**. Two options:

**Option 1: Subagent-Driven Development** (Recommended)
- Execute in this session
- Fresh subagent per task
- Code review between tasks
- Fast iteration

**Option 2: Parallel Execution Session**
- Open new Claude Code session
- Use superpowers:executing-plans
- Batch execution with checkpoints

---

**Plan saved to:** `docs/plans/2025-01-27-building-game-mvp-implementation.md`

**Current progress:** 10/26 tasks complete (38%)

**Estimated time to MVP:** 12-15 working days
