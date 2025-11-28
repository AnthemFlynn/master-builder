# Educational Building Game - Complete Design Document

**Date:** January 27, 2025
**Project:** Kingdom Builder Evolution - Educational Architecture & Engineering Game
**Target Audience:** Ages 9-12
**Platform:** Web (React + Three.js), with future mobile support

---

## Executive Summary

This design document outlines a comprehensive educational building game that teaches architecture and engineering principles through play. The game combines Lego-like building mechanics with AI-powered mentorship (via Anthropic Agent SDK), physics simulation, and social features to create an engaging learning experience for children aged 9-12.

### Core Philosophy
- **Educational Without Feeling Like School**: Real concepts taught through creative play
- **Lego-Like Building**: Smart snapping, architectural pieces, satisfying mechanics
- **AI-Powered Personalization**: Mentor remembers each player's journey
- **Balance of Structure & Freedom**: Guided challenges + open creative mode
- **Social Yet Safe**: COPPA-compliant sharing and async multiplayer

### Key Differentiators
1. **Agent SDK Integration**: Persistent AI mentor with vision capabilities
2. **Multi-Layer Feedback**: Visual guides + physics simulation + AI coaching
3. **Smart Snapping System**: Surface-first highlighting, architectural piece library
4. **Adaptive Difficulty**: Frustration detection and intelligent hints
5. **Rich Social Features**: Safe sharing without direct communication

---

## Table of Contents

1. [Core Game Structure](#1-core-game-structure)
2. [Piece System (Lego-Like Building)](#2-piece-system-lego-like-building)
3. [Challenge System & Learning Mechanics](#3-challenge-system--learning-mechanics)
4. [Skill Tree Progression](#4-skill-tree-progression)
5. [AI Mentor System (Agent SDK)](#5-ai-mentor-system-agent-sdk)
6. [Physics & Visual Feedback](#6-physics--visual-feedback)
7. [Creative Studio & Portfolio](#7-creative-studio--portfolio)
8. [Gamification & Rewards](#8-gamification--rewards)
9. [Onboarding & Tutorial](#9-onboarding--tutorial)
10. [Controls & Input](#10-controls--input)
11. [Audio & Visual Design](#11-audio--visual-design)
12. [Example Challenges](#12-example-challenges)
13. [Social & Sharing Features](#13-social--sharing-features)
14. [Progression & Rewards System](#14-progression--rewards-system)
15. [Creative Mode Depth](#15-creative-mode-depth)
16. [Challenge Variety & Balance](#16-challenge-variety--balance)
17. [Technical Architecture](#17-technical-architecture)
18. [Expert Review & Critical Improvements](#18-expert-review--critical-improvements)

---

## 1. Core Game Structure

### Main Menu Structure
- **Workshop Hub** - Visual skill tree showing challenge progression
- **Active Challenge** - Jump into current challenge
- **Creative Studio** - Open sandbox with unlocked pieces
- **Portfolio** - Gallery of saved builds

### Workshop Hub Layout

The hub displays a visual skill tree as an actual architectural blueprint:

```
         🏛️ FOUNDATIONS
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
  🗼 TOWERS  🌉 BRIDGES  ⚖️ BALANCE
```

Each node on the tree is a challenge tile showing:
- Challenge name and thumbnail
- What concept it teaches
- What pieces it unlocks
- Status (locked, available, completed, mastered)

### Visual Style
- Clean, colorful blueprint aesthetic (blueprint blue background with white grid lines)
- Challenge nodes are illustrated cards with building sketches
- Unlocked pieces appear in a "toolbox" sidebar
- Progress feels like filling out an architect's blueprint portfolio

---

## 2. Piece System (Lego-Like Building)

### Core Philosophy
Instead of just placing basic blocks, players work with architectural components that snap together intelligently.

### Piece Categories

**1. Structural Foundation** (unlocked from start)
- Foundation blocks (wide, stable bases)
- Support columns (various heights)
- Floor tiles
- Load-bearing walls

**2. Walls & Enclosures**
- Wall sections (full height, half height)
- Corner pieces (inside/outside corners)
- Doorways and door frames
- Window frames (various sizes)

**3. Vertical Elements** (unlocked via Tower challenges)
- Pillars and columns (Doric, Ionic, decorative)
- Spiral staircases
- Ladders
- Buttresses and supports

**4. Horizontal Spans** (unlocked via Bridge challenges)
- Beams (various lengths)
- Arches (different sizes and styles)
- Planks and walkways
- Cable/suspension pieces

**5. Roofing & Tops**
- Flat roof tiles
- Slanted roof sections
- Peaks and gables
- Domes and turrets

**6. Decorative & Functional**
- Balconies
- Railings and fences
- Lights and lanterns
- Flags and ornaments

### Smart Snapping System

**Surface-First Highlighting:**
- **Primary feedback**: Hovering near a structure highlights the **surface** you'll snap to in bright green
- Ghost piece appears secondary/translucent
- Different surfaces highlight as you sweep across them
- Clear visual: "You're attaching to THIS floor" or "You're connecting to THIS wall face"

**Connection Intelligence:**
- **Grid Snapping**: Pieces align to a clean grid automatically
- **Connection Points**: Valid connection points glow green, invalid show red
- **Auto-Rotation**: Hold hotkey and pieces auto-rotate to face nearest connection
- **Symmetry Mode**: Toggle symmetry and pieces mirror across central axis automatically
- **Ghost Preview**: Always see exactly where piece will land before placing

---

## 3. Challenge System & Learning Mechanics

### Challenge Structure

Each challenge presents:
1. **The Brief** - What to build and why ("Build a bridge that spans 10 blocks across the river")
2. **Constraints** - Requirements (must use at least 3 support beams, must be stable under physics)
3. **Learning Tip** - One concept explained simply ("Arches distribute weight evenly to supports")
4. **Piece Palette** - Only relevant pieces available (keeps it focused, not overwhelming)

### Three Scoring Dimensions

**1. ✓ Structural Integrity** (Pass/Fail)
- Physics simulation runs
- Visual stress indicators show weak points
- Must be stable to complete challenge

**2. ⭐ Efficiency** (1-3 stars)
- Did you use pieces wisely?
- Fewer pieces = better (teaches elegance)
- "You used 15 blocks, but the master solution uses only 8!"

**3. 🎨 Creativity** (Bonus points)
- AI mentor evaluates aesthetic choices
- Symmetry, proportion, decorative touches
- Not required to pass, but unlocks extra pieces

### Challenge Feedback Loop

- **During Building**: Live stress visualization (green = stable, yellow = stressed, red = will collapse)
- **Test Phase**: "Test Structure" button runs physics sim
- **If Failed**: Mentor gives specific hint ("The left support needs more foundation")
- **If Passed**: Mentor praise + shows "Master Builder" reference solution
- **Portfolio Option**: "Save to Creative Studio" to keep building on it

---

## 4. Skill Tree Progression

### Starting Point - Foundations Branch

Every player begins with 3 intro challenges:
1. **"First Foundation"** - Place foundation blocks, learn grid snapping
2. **"Simple Support"** - Add columns, see stress visualization
3. **"Stable Structure"** - Build a basic 5-block tall stable tower

Completing all 3 unlocks the main skill tree branches.

### Main Skill Tree Branches

**🗼 Towers & Heights** (Vertical building)
- Challenge 1: "Watchtower" - 10 blocks tall, must be stable
- Challenge 2: "Spiral Stairs" - Build climbable tower with stairs
- Challenge 3: "Twin Spires" - Two identical towers (teaches symmetry)
- Challenge 4: "Sky Scraper" - 20 blocks tall with buttress supports
- **Unlocks**: Tall columns, spiral stairs, spires, decorative tops

**🌉 Bridges & Spans** (Horizontal building)
- Challenge 1: "Simple Span" - Bridge across 5-block gap
- Challenge 2: "Arch Bridge" - Use arches for 10-block span
- Challenge 3: "Suspension Bridge" - Cable-supported long bridge
- Challenge 4: "Aqueduct" - Multi-level bridge with water flow
- **Unlocks**: Beams, arches, cables, decorative railings

**⚖️ Balance & Symmetry** (Design principles)
- Challenge 1: "Mirror Image" - Build perfectly symmetrical structure
- Challenge 2: "Radial Design" - 4-way symmetry around center
- Challenge 3: "Proportion Palace" - Use golden ratio guides
- Challenge 4: "Balanced Asymmetry" - Visually balanced but not mirrored
- **Unlocks**: Symmetry tools, proportion guides, decorative pieces

**🎨 Beauty & Form** (Advanced aesthetics)
- Challenge 1: "Window Gallery" - Building with natural light
- Challenge 2: "Garden Terrace" - Outdoor/indoor integration
- Challenge 3: "Grand Entrance" - Impressive doorway design
- Challenge 4: "Masterpiece" - Open-ended showcase challenge
- **Unlocks**: Windows, balconies, gardens, lighting effects

### Branch Dependencies
- Must complete at least 2 challenges in Towers AND Bridges to unlock Balance branch
- Must complete Balance branch to unlock Beauty branch
- Creates natural progression: structure first, then aesthetics

---

## 5. AI Mentor System (Agent SDK)

### Architecture Pattern

Instead of simple API calls, we use persistent Agent SDK sessions for each player. The mentor "remembers" the player across sessions.

### Three Specialized Agents

**1. Coach Agent** (Challenge Guidance)
- **Session ID**: `coach-{playerId}-{challengeId}`
- **Purpose**: Real-time help during challenges
- **Tools Available**:
  - `analyzeStructure(screenshot)` - Uses vision to see current build
  - `checkStability(buildData)` - Runs physics validation
  - `suggestFix(weakPoint)` - Provides specific improvement hints
  - `explainConcept(topic)` - Teaches engineering principles on-demand

**Example Flow**:
```typescript
// Player clicks "I'm stuck" during bridge challenge
const coachSession = await sdk.query({
  sessionOptions: {
    id: `coach-${playerId}-bridge-1`,
    resume: true
  },
  prompt: async function*() {
    yield `Player is stuck on bridge challenge. Here's their current build: [screenshot]
           They've been working for 5 minutes. Previous hint: "Try using arches"`;
  },
  mcpServers: [gameToolsServer],
  maxTurns: 3
});
```

**2. Portfolio Agent** (Creative Review)
- **Session ID**: `portfolio-{playerId}`
- **Purpose**: Long-term mentorship, reviews creative builds
- **Tools Available**:
  - `getPlayerHistory(playerId)` - Loads all previous builds
  - `compareToReference(buildId, architecturalStyle)` - Shows real-world inspiration
  - `scoreCreativity(aspects)` - Multi-dimensional aesthetic evaluation
  - `suggestNextChallenge(skillGaps)` - Adaptive learning path

**Example Response**:
```
"Wow! Your tower work has improved so much since your first watchtower!
 I love how you used buttresses here - that shows you understand
 the Flying Buttress concept from the Cathedral challenge.
 Want to try building a Gothic-style church next?"
```

**3. Challenge Generator Agent**
- **Session ID**: `generator-{playerId}`
- **Purpose**: Creates personalized challenges based on skill level
- **Tools Available**:
  - `getCompletedChallenges(playerId)` - Track progress
  - `identifyWeakSkills(playerData)` - Find learning gaps
  - `generateChallenge(constraints)` - Create new challenge
  - `findRealWorldInspiration(topic)` - Pull from architecture database

### Memory & Continuity

Each agent maintains persistent memory files:

```
player-data/
├── player-123/
│   ├── mentor-memory.md        # Mentor's observations over time
│   ├── challenge-progress.json # Completed challenges, scores
│   ├── portfolio/              # Screenshots + metadata
│   └── learning-profile.json   # Strengths, weaknesses, preferences
```

### Vision Integration

Every time the player asks for help or submits a build, send a screenshot:

```typescript
// Three.js screenshot capture
const screenshot = renderer.domElement.toDataURL('image/jpeg', 0.8);

// Send to mentor with vision
const response = await fetch('/api/mentor/analyze', {
  method: 'POST',
  body: JSON.stringify({
    playerId,
    screenshot,
    question: "Why does my bridge keep collapsing?"
  })
});
```

The mentor sees the actual 3D build and can give visual feedback:
- "I see the problem - your left support column isn't aligned with the arch"
- "The symmetry looks great! But try adding a foundation block under this corner"

---

## 6. Physics & Visual Feedback

### Multi-Layer Feedback Approach

**Layer 1: Real-Time Visual Guides** (Always On)

- **Snap Surface Highlighting**
  - Surface you're attaching to glows bright green
  - Invalid surfaces show red
  - Alt surfaces show yellow (valid but suboptimal)

- **Stress Visualization**
  - Green = well-supported, no stress
  - Yellow = moderate stress, stable but not ideal
  - Orange = high stress, may fail in physics test
  - Red = critical stress, will collapse
  - Updates live as you build

- **Symmetry Guide** (toggle)
  - Ghost mirror image on opposite side
  - Axis line shows center of symmetry

- **Proportion Grid** (toggle)
  - Golden ratio overlay guides
  - Rule of thirds grid

**Layer 2: Physics Simulation** (Test Mode)

When player clicks "Test Structure":
1. Camera pulls back to overview position
2. Physics engine activates for all pieces
3. Unstable structures wobble, then collapse (slow-motion for drama)
4. Stable structures get green checkmark overlay
5. Weak points flash red before failure

**Failure is fun, not punishing:**
- Slow-motion collapse with sound effects
- "Almost! Let's look at what happened" mentor message
- Rewind button restores structure instantly
- Highlight tool shows exact failure point

**Layer 3: AI Analysis** (On-Demand)

After physics test, player can ask mentor:
- "Why did it fall?" → AI analyzes collapse point from screenshot
- "How can I fix this?" → AI suggests specific improvements
- "Is this stable?" → AI validates even before physics test

### Progressive Physics Complexity

**Early challenges**: Simple gravity checks (very forgiving)
**Mid challenges**: Weight distribution and center of mass
**Advanced challenges**: Full physics with material elasticity and wind resistance

---

## 7. Creative Studio & Portfolio

### Creative Studio Interface

**Left Panel - Piece Palette:**
- All unlocked pieces organized by category
- Search/filter functionality
- Favorites tab
- "New!" badge on recently unlocked pieces

**Center - 3D Workspace:**
- Unlimited build space
- All visual guides available
- Optional physics mode toggle
- Free camera movement

**Right Panel - Studio Tools:**
- Quick Save/Load
- Submit for Review
- Export Image
- Challenge Mode toggle

### Portfolio System

Builds saved to portfolio create a persistent gallery:

```typescript
interface PortfolioBuild {
  id: string;
  name: string;
  thumbnail: string;
  timestamp: number;
  pieceCount: number;
  materialsUsed: string[];
  tags: string[];           // AI-generated
  mentorReview?: {
    feedback: string;
    score: number;
    strengths: string[];
    suggestions: string[];
    inspiration: string;
  };
}
```

### Submit for Review Flow

1. Player clicks "Submit for Review"
2. UI asks: "What would you like feedback on?"
3. Portfolio Agent analyzes with full build history context
4. Mentor provides structured feedback celebrating growth
5. Review saved with build

### Portfolio Showcase Feature

Players can mark builds as "Showcase":
- Displays in special gallery
- Can be shared via build codes
- Mentor might say "This is showcase-worthy!" after exceptional builds

---

## 8. Gamification & Rewards

### Piece Unlocking (Primary Motivation)

Each challenge completed unlocks specific architectural pieces with dramatic reveal animation and mentor explanation.

### Achievement System

**Categories:**
- Building (blocks placed, height achieved)
- Learning (physics tests passed, concepts mastered)
- Creative (portfolio reviews, showcase builds)
- Social (shares, reactions, friend challenges)

### Title Progression

Players earn architectural titles:
- Apprentice Builder → Junior Architect → Skilled Engineer → Master Builder → Grand Architect → Royal Master Architect

### Challenge Stars

Each challenge earns 1-3 stars:
- ⭐ Bronze: Complete challenge
- ⭐⭐ Silver: Complete with efficiency
- ⭐⭐⭐ Gold: Complete with creativity bonus

### Material Tier System

Keep current tier unlock with gold, enhanced with educational context about each material's properties and historical use.

---

## 9. Onboarding & Tutorial

### First-Time Player Experience

**Interactive Tutorial (10 minutes):**

**Stage 1: "Your First Block"** (2 min)
- Single piece type: Foundation Block
- Glowing surface shows where to click
- Celebration on first placement

**Stage 2: "Stacking & Snapping"** (3 min)
- Stack 3 blocks high
- Learn surface highlighting and stability
- First physics test

**Stage 3: "Your First Challenge"** (5 min)
- Mini-challenge: "Build a 5-block tower"
- Introduces challenge UI
- First star earned, pieces unlocked

### Progressive Disclosure

Don't show everything at once:
- First session: Basic building
- Second session: Symmetry guide
- Third session: Portfolio feature
- After 5 challenges: Full Creative Studio

### Tutorial Skip Option

For experienced players:
- Quick quiz: "Place 5 blocks to prove you know the basics"
- Pass → Skip to Workshop Hub

---

## 10. Controls & Input

### Mouse Controls (Primary)

**Building Mode:**
- Left Click: Place piece
- Right Click: Remove piece
- Mouse Wheel: Rotate piece (Y-axis)
- Middle Click + Drag: Rotate camera
- Shift + Wheel: Zoom

**Camera Mode:**
- Click + Drag: Orbit camera
- WASD/Arrows: Pan camera
- Q/E: Rotate camera
- Spacebar: Reset view
- F: Focus on selected piece

### Keyboard Shortcuts

**Building:**
- 1-9: Quick select piece categories
- G: Toggle symmetry guide
- H: Toggle stress visualization
- T: Test structure
- Ctrl+Z/Y: Undo/Redo
- R: Rotate piece (X-axis)

**UI:**
- ESC: Pause/Back
- Tab: Toggle piece palette
- M: Open mentor chat
- P: Open portfolio

### Touch Controls (Tablet Support)

- Single finger drag: Rotate camera
- Two finger pinch: Zoom
- Two finger drag: Pan
- Tap: Place piece
- Long press: Remove piece

### Accessibility Features

**Motor Control:**
- Auto-snap intensity slider
- Hover delay adjustment
- Click-to-place mode
- Large click targets

**Visual:**
- Colorblind modes
- High contrast mode
- Text size slider
- Simplified UI mode

**Audio/Communication:**
- Text-to-speech toggle
- Reduced motion mode
- Dyslexia-friendly font option

---

## 11. Audio & Visual Design

### Visual Style

**Art Direction:**
- Clean, colorful, playful realism
- Materials have texture but remain readable
- Bright, saturated colors appealing to kids
- Think: LEGO + Monument Valley + simplified Minecraft

### Lighting & Atmosphere

**Time of Day System:**
- Dawn: Warm pinks/oranges, soft shadows
- Day: Bright blue sky, clear visibility (default)
- Sunset: Golden hour glow, dramatic shadows
- Night: Deep blue sky, stars, glowing pieces shine

### UI Design

**Color Palette:**
- Primary: Blueprint blue (#2B5A9E)
- Accent: Golden yellow (#FFD700)
- Success: Emerald green (#50C878)
- Warning: Amber (#FFBF00)
- Danger: Coral red (#FF6B6B)
- Neutral: Warm gray (#B8B8B8)

**Typography:**
- Headers: Bold, playful sans-serif (Fredoka One or Poppins Bold)
- Body: Clean, readable sans-serif (Inter or Open Sans)
- Dyslexia mode: OpenDyslexic font

### Sound Design

**Music:**
- Workshop Hub: Gentle orchestral, inspiring
- Challenge Mode: Upbeat, focused, encouraging
- Creative Studio: Dreamy, open, exploratory
- Physics Test: Suspenseful build-up

**Sound Effects:**
- Piece placement: Satisfying "click-snap" (like LEGO)
- Physics test stable: Triumphant bell chime
- Structure collapse: Comedic tumbling (not scary)
- Achievement unlock: Fanfare with sparkles
- Star earned: Ascending musical notes

**Mentor Voice:**
- Text-to-speech with natural voices
- Master Aldric: Warm, grandfather-like, British accent
- Option to disable voice

---

## 12. Example Challenges

### Foundations Branch

**Challenge: "The Stable Tower"**
- Objective: Build 8 blocks tall, pass physics test
- Learning: Foundation width must support height
- Star Thresholds:
  - Bronze: Complete
  - Silver: ≤12 pieces
  - Gold: ≤10 pieces + symmetric
- Unlocks: Tall columns, decorative tops

### Towers Branch

**Challenge: "Twin Spires"**
- Objective: Two identical towers, 10+ blocks tall
- Learning: Symmetry and structural matching
- Requirements: Perfect mirror, both stable, ≤3 blocks apart
- Star Thresholds:
  - Bronze: Complete
  - Silver: Perfect symmetry
  - Gold: + decorative tops + 3+ materials
- Unlocks: Spiral staircases, ornamental spires, tower windows
- Inspiration: "Like Notre-Dame Cathedral towers!"

### Bridges Branch

**Challenge: "The Roman Arch"**
- Objective: Bridge using arches across 12-block gap
- Learning: Arches distribute weight to supports
- Requirements: At least one complete arch, stable walkway
- Star Thresholds:
  - Bronze: Complete with any arch
  - Silver: Use only one arch (elegant)
  - Gold: Symmetrical + decorative railings
- Unlocks: Multiple arch styles, keystones, bridge railings
- Inspiration: "Romans built these 2000 years ago!"

### Balance & Symmetry Branch

**Challenge: "The Balanced Asymmetry"**
- Objective: Build visually balanced but NOT symmetrical
- Learning: Balance through proportion, not mirroring
- Requirements: Must NOT be symmetrical, AI mentor evaluates balance
- Star Thresholds:
  - Bronze: Balance 6+/10
  - Silver: Balance 8+/10
  - Gold: Balance 9+/10 + creative bonus
- Unlocks: Proportion guides, balance visualization
- Inspiration: "Like Frank Lloyd Wright's Fallingwater!"

### Beauty & Form Branch

**Challenge: "Cathedral of Light"**
- Objective: Building using windows for beautiful lighting
- Learning: Natural light in architecture
- Requirements: 6+ windows, enclosed interior, well-lit
- Star Thresholds:
  - Bronze: Complete requirements
  - Silver: Symmetrical window placement
  - Gold: 3+ window types + decorative + creativity 8+
- Unlocks: Rose windows, stained glass, skylights
- Inspiration: "Gothic cathedrals flood interiors with light!"

### Master Challenge

**Challenge: "Your Masterpiece"**
- Objective: Build anything, demonstrate all learning
- Requirements: 50+ pieces, pass physics, show 3+ concepts
- Evaluation: Comprehensive mentor review across 5 dimensions
- Stars based on average score (8+, 9+, 9.5+)
- Unlocks: "Master Architect" title, legendary pieces
- Reward: Featured in "Hall of Masters"

---

## 13. Social & Sharing Features

### COPPA-Compliant Social Design

All social features designed without direct communication.

### Build Sharing System

**Share Codes:**
```typescript
// Generate 6-character alphanumeric code
const shareCode = generateShareCode(buildId); // "A7K9M2"
```

**What you can do:**
- View in 3D, rotate and explore
- Remix: Load into Creative Studio and modify
- Like: Give emoji reactions (anonymous)
- Try Challenge: Attempt to beat their score

**No usernames** - builds show as "Builder #12847"

### Community Gallery

**Featured Builds (Moderated):**
- AI pre-screens for appropriateness
- Human moderators approve "Featured" status
- Categories: Most Liked, Most Creative, Tallest Tower, Longest Bridge
- Refreshes daily

**Discovery:**
- Browse by category
- Filter by difficulty
- "Surprise Me!" random build
- "Inspired by yours" recommendations

### Async Multiplayer Modes

**1. Build Challenges:**
- Player A completes challenge with X pieces
- Generates challenge code
- Player B tries to beat it
- Ghost overlay shows original solution

**2. Build Battles (Weekly Event):**
- Theme announced: "Build tallest lighthouse"
- 3-day submission window
- AI mentor judges all submissions
- Top 10 displayed in gallery

**3. Collaborative Builds (Future):**
- Two players in same Creative Studio
- Split-screen local or online
- Perfect for parent-child play

### Reactions System

Emoji reactions instead of comments:
- ✨ Amazing!
- 🏆 So Creative!
- 💪 Strong Build!
- 🤯 Mind-Blowing!
- ❤️ Love It!

### Friend System (Optional)

**Friend Codes:**
- Personal code: "ARCH-8472-1947"
- Share with real-life friends only
- See their portfolio builds
- No chat, just build sharing
- Parent controls available

### Safety Features

- All builds moderated before "Featured"
- Report button for flagging
- No text input (except filtered build names)
- Parent dashboard to view/disable sharing
- COPPA-compliant: No personal data collected

---

## 14. Progression & Rewards System

### Always-Visible Progress HUD

**Top Bar (Persistent):**
```
┌────────────────────────────────────────────────────────┐
│ [Avatar] Builder Name - Master Builder [Lvl 12]        │
│ ━━━━━━━━━━━━━━━━━━━ 847/1000 XP                       │
│                                                        │
│ Next Goal: Earn 2 more stars to unlock Bridges! ⭐⭐  │
│ Daily Challenge: Build with only wood [2/5 pieces]    │
└────────────────────────────────────────────────────────┘
```

### Multi-Tier Reward System

**1. XP & Leveling (Continuous Micro-Rewards)**

Every action earns XP:
- Place block: +5 XP
- Complete challenge: +100-500 XP
- Earn star: +50 XP
- Portfolio review: +25 XP
- Daily login: +50 XP

**Level Up Rewards:**
- Every level: 50 gold
- Every 5 levels: Exclusive cosmetic piece
- Every 10 levels: New title + rare material

**2. Combo System (Immediate Gratification)**

**Speed Combos:**
- 5 blocks in 30 sec → "Quick Builder!" +25 XP
- 10 blocks in 60 sec → "Speed Master!" +50 XP

**Skill Combos:**
- 3 different piece types in row → "Variety!" +15 XP
- 5 symmetrical pairs → "Symmetry Streak!" +30 XP

**Visual Feedback:**
- Combo counter on screen
- "Ding" sound
- Particle burst
- XP floats to XP bar

**3. Daily/Weekly Challenges**

**Daily** (Reset 24h):
- "Place 20 blocks today"
- "Use 3 different materials"
- Reward: 200 XP + 20 gold

**Weekly** (Reset 7 days):
- "Earn 5 stars this week"
- "Build in Creative for 30 min total"
- Reward: 500 XP + 100 gold + exclusive cosmetic

**4. Achievement System**

**Categories:**
- Building: Blocks placed, height, materials
- Learning: Physics tests, concepts mastered
- Creative: Portfolio stars, showcases
- Social: Shares, reactions, friend challenges

**Hidden Achievements:**
- "Tower of Babel": Build 100 blocks tall
- "Demolition Expert": Remove 50 blocks in 10 sec
- "Perfectionist": Undo 50 times in one build

**5. Streak Tracking**

**Login Streaks:**
- Day 1: 50 gold
- Day 7: Rare material unlock
- Day 30: Legendary cosmetic + special title

**6. Idle/Comeback Rewards**

- Gone 1 day: 25 gold
- Gone 3 days: 100 gold + XP boost
- Gone 7 days: 200 gold + comeback challenge (2x XP)

**7. Progress Visualization**

**Skill Tree Enhancements:**
```
FOUNDATIONS [●●●●○] 80% Complete
├─ Foundation Basics ✓ [⭐⭐⭐]
├─ The Stable Tower ✓ [⭐⭐○]
├─ Support Systems ✓ [⭐○○]
└─ Master Foundation [LOCKED] (Need 2 more stars)
```

**Stats Dashboard:**
- Total blocks placed: 1,247
- Tallest structure: 23 blocks
- Total play time: 8h 42m
- Favorite material: Oak Wood
- Building style: "Tower Enthusiast"

**8. Surprise Mechanics**

**Golden Blocks:**
- Randomly appear in palette (1% chance)
- Place for +100 XP bonus

**Mystery Boxes:**
- Earn from leveling up
- Reveal: Gold, XP, cosmetic, or rare material

**Mentor Surprises:**
- Random celebrations of milestones
- "You've built 500 blocks! Amazing!"

**9. Notification System**

**Smart Notifications:**
- "Daily challenge refreshes in 1 hour!"
- "You're 1 star from unlocking Bridges!"
- "Friend beat your bridge challenge!"

Settings: Toggle per type, quiet hours, parent controls

---

## 15. Creative Mode Depth

### Creative Studio - Two Phases

**Phase 1: Basic Creative** (After tutorial)
- All unlocked pieces
- Smart snapping and guides
- Save/load builds
- Optional physics

**Phase 2: Advanced Creative** (After 10 challenges)
- Environmental tools
- Advanced building tools
- NPCs and animation
- Custom materials/colors

### Environmental Tools

**1. Terrain Sculpting**

Tools:
- Raise/Lower terrain (click and drag)
- Flatten: Create platforms
- Smooth: Smooth rough terrain
- Paint: Change material (grass, dirt, sand, snow)

Features:
- Circular brush (adjustable size)
- Real-time height map visualization
- Undo support

**2. Water Placement**

Tools:
- Place water source
- Fill area (flood-fill)
- Flowing water (animates downhill)
- Set global water level

Types:
- Regular water (blue, transparent)
- Lava (orange, glowing)
- Crystal water (sparkling, magical)

**3. Vegetation & Decoration**

**Trees:** Oak, Pine, Palm, Cherry Blossom, Willow
**Plants:** Grass patches, flowers, bushes, vines
**Rocks:** Boulders, formations, crystal clusters

Placement:
- Click individual items
- "Scatter" brush for random placement
- Density slider
- Rotation randomization

**4. NPCs & Animation**

**Types:** Villagers, guards, merchants, children, animals
**Behaviors:** Walk on paths, enter buildings, wave when clicked
**Placement:** Drag from palette, set patrol routes, adjust speed

### Advanced Building Tools

**1. Copy/Paste System**

- Click-drag box to select
- Ctrl+Click to add/remove
- Copy (Ctrl+C), Paste (Ctrl+V)
- Duplicate with auto-offset
- Mirror across axis
- Rotate entire group

**2. Templates & Prefabs**

**Starter Templates:**
- "Medieval Castle Base"
- "Village House Foundation"
- "Bridge Span"
- "Garden Layout"

**User Templates:**
- Save selections as personal templates
- Reuse across builds
- Share template codes

**Community Templates:**
- Browse popular templates
- "Gothic Window", "Spiral Staircase"
- Credit original creator

**3. Material Customization**

**Color Tinting:**
- HSV color picker
- Create: Pink marble, lime wood, blue glass
- Save custom colors

**Material Mixer:**
- Combine materials: Brick + Gold = Golden Brick

**Texture Variants:**
- Wood: Polished, rough, weathered, charred
- Stone: Smooth, cobbled, cracked, mossy

### Creative Modes

**1. Free Build** (Default)
- Everything available, no constraints

**2. Zen Mode**
- No UI clutter
- Ambient music only
- Time cycles automatically
- Pure meditative building

**3. Sandbox Physics**
- Full physics always on
- Experiment with instability
- No failure state

**4. Time-Attack Creative**
- "Build coolest tower in 10 min"
- Leaderboard for creativity

### Advanced Features

**1. Lighting Designer**
- Place spotlights (color, intensity, direction)
- Ambient light adjustment
- Colored fog, god rays
- Glowstone intensity control

**2. Camera Tools**
- Free camera (detached)
- Adjustable FOV
- Depth of field
- Filters (sepia, noir, vibrant)
- Remove UI, save high-res

**3. Weather Control**
- Clear, Cloudy, Rain, Snow, Fog
- Thunder storms with lightning
- Rainbow after rain
- Wind strength

**4. Sound Designer**
- Ambient sounds (water, birds, wind)
- Music selection
- Volume per source

### Creative Challenges

**Weekly Creative Prompt:**
- "Build a treehouse"
- Submit for AI review
- Featured if exceptional

**Self-Set Goals:**
- "Build 50-block cathedral"
- Track progress

**Remix Challenges:**
- Load community build
- "Make it better"
- Submit remix

---

## 16. Challenge Variety & Balance

### Challenge Type Taxonomy

**6 Challenge Types** (mixed throughout skill tree):

**1. Construction Challenges** (40%)
- Classic "build something"
- Variants: Guided (ghost blueprint), Open (requirements only), Reference (inspired by photo)

**2. Puzzle Challenges** (20%)
- Repair broken structures
- Fix with limited pieces
- Constraint puzzles ("connect with exactly 10 pieces")
- Pattern completion

**3. Destruction Challenges** (10%)
- Strategic demolition
- "Demolish with fewest bombs"
- "Remove red blocks without collapsing green"
- Remove-the-block (Jenga-style)

**4. Speed Challenges** (10%)
- Build against clock
- "Tower in 90 seconds"
- "20 blocks in 60 seconds"
- Faster = bonus XP

**5. Resource Challenges** (15%)
- Limited pieces
- "Tallest tower with 15 pieces"
- "Span 20 blocks with fewest beams"
- Material constraints

**6. Style Challenges** (5%)
- Aesthetic improvement
- "Make this beautiful"
- "Add medieval style"
- No physics, judged on beauty

### Adaptive Difficulty System

**Struggle Detection**

Monitors:
- Failed physics tests (3+ failures)
- Time without progress (5+ min)
- Excessive undo (20+ in 2 min)
- Placement hesitation (30+ sec hover)

**Automated Response**

After 3 failures:
```
Mentor: "This is tricky! Would you like some help?"

Options:
[Show hint] → Specific tip
[Show solution] → Ghost blueprint
[Make easier] → Reduce requirements
[Keep trying] → Continue unaided
```

**Hint Escalation:**
1. Generic: "Towers need wide bases"
2. Specific: "Try adding foundation here" (highlights)
3. Visual: Ghost pieces show solution
4. Auto-assist: "Place support columns for you?"

**Difficulty Adjustment**

Settings menu presets:
- **Relaxed**: Generous physics, lots of hints
- **Balanced**: Default
- **Strict**: Realistic physics, minimal help
- **Master**: Speedrun mode, no hints

### Physics Balancing

**Three Physics Modes:**

**1. Educational Physics** (Default)
- Slightly forgiving
- Visual warnings before collapse
- 2-second grace period
- Teaches without punishing

**2. Realistic Physics** (Unlockable)
- Accurate simulation
- Heavy materials compress lighter
- Wind affects tall structures
- For advanced players

**3. Sandbox Physics** (Creative)
- Optional toggle
- Can disable entirely

**Stability Prediction:**

Real-time meter:
```
Stability: [████████░░] 82%

Green (90-100%): Rock solid
Yellow (70-89%): Stable but stressed
Orange (50-69%): Risky
Red (0-49%): Will collapse
```

**Hover prediction** shows stability change before placing.

**Physics Helper Mode:**
- Force arrows (weight vectors)
- Stress points highlighted
- Center of mass shown
- Support connections visible

### Failure Recovery Systems

**When Test Fails:**

1. Slow-motion collapse (1 sec)
2. Zoom to failure point
3. Red highlight on first-failed piece
4. Freeze-frame option

**Mentor Response:**
```
"Almost there! I see the problem."

[Show me] → Visual explanation
[Why?] → Physics lesson
[Fix it] → Auto-add support (costs gold)
[Try again] → Reload pre-test state
```

**Failure Analysis:**
```
❌ Physics Test Failed

Failure Point: Left support column
Reason: Insufficient foundation
Load: 45 blocks
Support: Only 2 foundation blocks

Suggestions:
- Add 2 more foundation blocks
- Widen base to 3x3
- Use heavier foundation material

[Auto-Fix: 20 gold] [Try Again] [Replay]
```

**Replay System:**
- Scrub frame-by-frame
- Toggle force visualization
- Rotate during replay

**Partial Credit:**
```
✓ Height requirement met
✓ Symmetry looks great!
✗ Stability needs work

Progress: 66% complete
Keep going!
```

### Challenge Progression

**Difficulty Curve:**
- Early (1-5): Simple, generous, hard to fail
- Mid (6-15): Constraints, mixed types, moderate
- Advanced (16-30): Complex, strict, minimal hints
- Master (31+): Open-ended, showcase skills

Gradual slope, no steep jumps.

### Smart Recommendations

After every 3 challenges:
```
"I notice you excel at towers but struggle with bridges.

 Two paths:
 🗼 Double Down: Advanced Tower (play to strengths)
 🌉 Fill Gap: Practice Bridges (grow skills)

 Which interests you?"
```

Player chooses learning path.

**Adaptive Unlocks:**
If struggling, unlock parallel easier challenges. Never gate-keep.

---

## 17. Technical Architecture

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Three.js (3D rendering)
- Tone.js (sound)
- Vite (build tooling)
- TailwindCSS (UI)

**New Additions:**
- **Cannon.js** or **Rapier** - Physics engine
- **@anthropic-ai/claude-agent-sdk** - AI mentor
- **React Three Fiber** (optional) - React-friendly Three.js
- **Zustand** or **Jotai** - State management

**Backend (New):**
- Node.js + Express - API server
- Socket.io (optional) - Real-time chat
- SQLite or PostgreSQL - Player data
- File storage - Screenshots, saves

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│     React Frontend (Vite)               │
│  ┌─────────────────────────────────┐   │
│  │  Game Components                │   │
│  │  - WorkshopHub                  │   │
│  │  - ChallengeMode                │   │
│  │  - CreativeStudio               │   │
│  │  - PortfolioGallery             │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Three.js Layer                 │   │
│  │  - Scene management             │   │
│  │  - Piece rendering              │   │
│  │  - Physics simulation           │   │
│  │  - Camera controls              │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │ HTTP/WebSocket
               ↓
┌─────────────────────────────────────────┐
│     Backend Server (Express)            │
│  ┌─────────────────────────────────┐   │
│  │  API Routes                      │   │
│  │  - /api/mentor/*                 │   │
│  │  - /api/challenges/*             │   │
│  │  - /api/portfolio/*              │   │
│  │  - /api/player/*                 │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Agent SDK Integration           │   │
│  │  - CoachAgent                    │   │
│  │  - PortfolioAgent                │   │
│  │  - GeneratorAgent                │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Game Tools (MCP Server)         │   │
│  │  - validateStructure()           │   │
│  │  - analyzeScreenshot()           │   │
│  │  - scoreCreativity()             │   │
│  │  - getPlayerHistory()            │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│     Data Layer                          │
│  - Player profiles (DB)                 │
│  - Challenge progress (DB)              │
│  - Portfolio builds (File + DB)         │
│  - Mentor memory (File)                 │
│  - Achievement tracking (DB)            │
└─────────────────────────────────────────┘
```

### Project Structure

```
kingdom-builder-v2/
├── client/                    # Frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── game/             # Three.js game logic
│   │   ├── state/            # State management
│   │   ├── utils/            # Utilities
│   │   └── api/              # Backend API client
│   └── package.json
│
├── server/                    # Backend
│   ├── src/
│   │   ├── agents/           # Agent SDK agents
│   │   ├── tools/            # MCP server tools
│   │   ├── routes/           # API endpoints
│   │   ├── db/               # Database
│   │   └── index.ts
│   └── package.json
│
├── shared/                    # Shared types
│   └── types/
│
└── data/                      # Persistent data
    └── players/
```

### Data Models

```typescript
interface Player {
  id: string;
  username: string;
  title: string;
  totalStars: number;
  completedChallenges: string[];
  unlockedPieces: string[];
  achievements: string[];
  stats: {
    totalBlocksPlaced: number;
    tallestStructure: number;
    favoritematerial: string;
    playTimeMinutes: number;
  };
}

interface Challenge {
  id: string;
  branch: 'foundations' | 'towers' | 'bridges' | 'balance' | 'beauty';
  name: string;
  description: string;
  requirements: object;
  learningObjective: string;
  unlocks: string[];
  prerequisiteChallenges: string[];
  starThresholds: object;
}

interface Build {
  id: string;
  playerId: string;
  name: string;
  type: 'challenge' | 'creative';
  timestamp: number;
  screenshot: string;
  pieces: Array<{
    pieceId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    materialId: string;
  }>;
  stars?: number;
  mentorReview?: object;
}
```

### Development Phases

**Phase 1: Core Building Mechanics**
- Piece system with smart snapping
- Piece categories and unlocking
- Challenge framework
- Visual feedback

**Phase 2: Physics & Validation**
- Physics engine integration
- Test mode
- Structural validation
- Collapse animations

**Phase 3: Backend + Agent SDK**
- Express server setup
- Agent SDK integration
- CoachAgent for hints
- Player data persistence

**Phase 4: Challenge System**
- Skill tree design
- 20-30 core challenges
- Unlock progression
- Star rating

**Phase 5: Portfolio & Creative**
- Creative Studio interface
- Portfolio gallery
- PortfolioAgent reviews
- Screenshot/sharing

**Phase 6: Polish & Gamification**
- Achievement system
- Title progression
- Sound effects & animations
- Tutorial system

---

## 18. Expert Review & Critical Improvements

### Major Gaps Identified

**Critical Missing Elements:**

1. **Social Features** ❌ → ✅ Added build codes, async multiplayer, community gallery
2. **Progression Visibility** ❌ → ✅ Added always-visible HUD, progress bars, breadcrumbs
3. **Immediate Gratification** ❌ → ✅ Added XP system, combos, micro-achievements
4. **Failure Recovery** ❌ → ✅ Added adaptive difficulty, frustration detection, hints
5. **Creative Mode Depth** ❌ → ✅ Added terrain, water, NPCs, templates
6. **Challenge Variety** ❌ → ✅ Added 6 challenge types (not just "build X")

### UX Best Practices Added

- ✅ Contextual tooltips
- ✅ Radial menu for quick tool switching
- ✅ Minimap overhead view
- ✅ Undo history timeline
- ✅ Grid overlay options
- ✅ Accessibility presets (Easy/Medium/Hard)
- ✅ Physics helper mode with stability prediction

### Comparisons to Best-in-Class

**What we learned from:**

**Minecraft Education Edition:**
- Embed real architectural history
- Action: "Architect Gallery" showing real buildings

**LEGO Builder's Journey:**
- Minimalist, no UI clutter
- Action: Hide advanced UI until needed

**Bridge Constructor:**
- Physics puzzles with constraints
- Action: "Master Builder" strict piece limits

**Townscaper:**
- Zero stress, pure building joy
- Action: "Zen Mode" - no challenges, just build

**Kerbal Space Program:**
- Failure is hilarious and educational
- Action: Comedic sound effects, slow-mo replays

### Priority Implementation

**Must-Have (Before Launch):**
1. Social sharing system (build codes, gallery)
2. Always-visible progress indicator
3. Adaptive difficulty / frustration detection
4. Micro-reward system (XP, combos)
5. Radial menu + tooltips
6. Physics helper mode
7. Accessibility presets

**Should-Have (Phase 2):**
8. Daily/Weekly challenges
9. Co-op multiplayer
10. Advanced creative tools
11. Story mode wrapper
12. Challenge variety
13. Undo timeline

**Nice-to-Have (Post-Launch):**
14. User-generated challenges
15. Seasonal events
16. Voice commands
17. VR mode

### Bottom Line

**This design is production-ready** with clear implementation path, strong educational foundation, and innovative use of Agent SDK that no competitor has.

**Unique Selling Points:**
1. AI mentor that truly knows each child
2. Multi-layer feedback teaching real physics
3. Social features without safety concerns
4. Perfect balance of learning and fun

---

## Next Steps

### Immediate Actions

1. **Validate Design with Stakeholders**
   - Review with educators (ages 9-12 teachers)
   - Test with target age group (paper prototypes)
   - Get parent feedback on safety features

2. **Technical Proof of Concept**
   - Build smart snapping prototype
   - Test Agent SDK integration
   - Validate physics engine choice

3. **Create Implementation Plan**
   - Break into sprints
   - Identify MVP features
   - Set milestones

### Development Roadmap

**MVP (3-4 months):**
- Core building mechanics
- 10 challenges (Foundations + Towers)
- Basic AI mentor
- Physics simulation
- Tutorial system

**Beta (6 months):**
- All 30 challenges
- Full creative mode
- Portfolio system
- Social sharing
- Polish & testing

**Launch (9 months):**
- All features complete
- Tested with 100+ kids
- Parent controls
- Marketing materials

### Success Metrics

**Educational Goals:**
- 80% of players can explain one engineering principle
- 90% successfully build stable structures by challenge 10
- 70% demonstrate symmetry understanding

**Engagement Goals:**
- 60% day-7 retention
- 40% day-30 retention
- Average 2+ builds shared per active player

**Business Goals:**
- TBD based on monetization model
- School licensing potential
- Positive parent reviews

---

## Appendix

### Glossary

- **Piece**: Individual building component (block, arch, column)
- **Smart Snapping**: Automatic alignment to valid surfaces
- **Physics Test**: Simulation to check structural stability
- **Portfolio**: Player's saved builds gallery
- **Agent SDK**: Anthropic's framework for persistent AI agents
- **MCP Server**: Model Context Protocol server for custom tools
- **Mentor Memory**: Persistent files tracking player learning

### References

- Anthropic Agent SDK Documentation
- Three.js Documentation
- COPPA Compliance Guidelines
- Educational Game Design Best Practices
- Physics Engine Comparisons (Cannon.js vs Rapier)

### Design Decisions Log

**Why Agent SDK over simple API calls?**
- Persistent sessions maintain learning context
- Vision capabilities for analyzing builds
- Tool orchestration for game mechanics
- Automatic context management

**Why 9-12 age group?**
- Old enough for real architectural concepts
- Young enough for playful engagement
- Sweet spot for building games
- Strong STEM education focus

**Why 6 challenge types?**
- Variety prevents monotony
- Each type teaches different skills
- Appeals to different learning styles
- Maintains engagement over time

---

**Document Version:** 1.0
**Last Updated:** January 27, 2025
**Status:** Complete - Ready for Implementation Planning
