   1 # Material Selection System
   2 
   3 ## Multi-Modal Input Design
   4 
   5 Master Builder uses a sophisticated multi-modal input system that separates different functions across modifier keys:
   6 
   7 ### Current Implementation
   8 
   9 **Material Selection:**
  10 - **Shift** + Letter = Category selection
  11 - **No modifier** + Number = Quick select current inventory
  12 
  13 **Mode Toggle:**
  14 - **C** or **Tab** = Category Mode (Vim-style)
  15 
  16 ### Future Roadmap
  17 
  18 **Control** - Block type variants (future)
  19 **Command** - Game commands (future)
  20 **Option/Alt** - Game settings (time of day, weather, etc.) (future)
  21 
  22 ---
  23 
  24 ## How Material Selection Works
  25 
  26 ### Method 1: Vim-Style Category Mode (Primary)
  27 
  28 1. Press **C** or **Tab** to enter Category Mode
  29 2. Green indicator appears: "🔧 CATEGORY MODE"
  30 3. WASD movement disabled (prevents conflicts)
  31 4. Press category letter: **G**, **S**, **W**, **I**, **M**, or **T**
  32 5. Press number **1-9**
  33 6. Block selected, mode auto-exits to Normal Mode
  34 7. **ESC** cancels and returns to Normal Mode
  35 
  36 **Example:**
  37 ```
  38 C → W → 2 = Oak Log (Wood category, slot 2)
  39 Tab → I → 1 = Glowstone (Illumination category, slot 1)
  40 ```
  41 
  42 ### Method 2: Shift Modifier (Alternative)
  43 
  44 1. Hold **Shift** + press category letter (G/S/W/I/M/T)
  45 2. Release Shift
  46 3. Press number **1-9** within 2 seconds
  47 4. Block selected
  48 
  49 **Example:**
  50 ```
  51 Shift+I → 2 = Redstone Lamp
  52 Shift+S → 1 = Stone
  53 ```
  54 
  55 ### Method 3: Quick Select (Backward Compatible)
  56 
  57 Press **1-9** alone to select from current inventory:
  58 1. Grass
  59 2. Stone
  60 3. Tree (Oak Log)
  61 4. Wood (Oak Planks)
  62 5. Diamond
  63 6. Quartz
  64 7. Glass
  65 8. Glowstone
  66 9. Redstone Lamp
  67 
  68 ---
  69 
  70 ## Categories
  71 
  72 ### G - Ground Blocks
  73 - G1: Grass
  74 - G2: Dirt
  75 - G3: Sand
  76 - G4-G9: (Reserved for gravel, clay, mycelium, etc.)
  77 
  78 ### S - Stone Blocks
  79 - S1: Stone
  80 - S2-S9: (Reserved for cobblestone, bricks, granite, etc.)
  81 
  82 ### W - Wood Blocks
  83 - W1: Oak Planks
  84 - W2: Oak Log
  85 - W3-W9: (Reserved for birch, spruce, jungle, etc.)
  86 
  87 ### I - Illumination
  88 - I1: Glowstone (yellow-orange glow)
  89 - I2: Redstone Lamp (red-orange glow)
  90 - I3-I9: (Reserved for beacon, lanterns, etc.)
  91 
  92 ### M - Metals/Ores
  93 - M1: Diamond Block
  94 - M2-M6: (Reserved for gold, iron, emerald, etc.)
  95 - M7: Coal Block
  96 - M8: Quartz Block
  97 - M9: (Reserved)
  98 
  99 ### T - Transparent
 100 - T1: Glass
 101 - T2-T9: (Reserved for ice, stained glass, etc.)
 102 
 103 ---
 104 
 105 ## Visual Feedback
 106 
 107 ### Mode Indicator
 108 When Category Mode is active:
 109 - Green pulsing banner at top of screen
 110 - Text: "🔧 CATEGORY MODE - G/S/W/I/M/T + 1-9 (ESC to cancel)"
 111 - Disappears when mode exits
 112 
 113 ### Console Feedback
 114 ```
 115 🔧 Category Mode ON
 116 📦 Illumination (I) - Press 1-9
 117 ✓ Selected: Illumination 2
 118 🎮 Returned to Normal Mode
 119 ```
 120 
 121 ---
 122 
 123 ## Implementation Details
 124 
 125 ### Files Modified
 126 - `src/control/BlockCategories.ts` - Category configuration
 127 - `src/control/index.ts` - Input handling logic
 128 - `src/ui/index.ts` - Mode indicator
 129 - `src/style.css` - Mode indicator styling
 130 - `index.html` - Controls guide
 131 
 132 ### Key Features
 133 1. **No conflicts** - Category mode disables WASD
 134 2. **Auto-exit** - Returns to normal after selection
 135 3. **Timeout** - Shift+Letter auto-cancels after 2s
 136 4. **Backward compatible** - 1-9 still works
 137 5. **Extensible** - Easy to add 100+ blocks
 138 
 139 ---
 140 
 141 ## Future Enhancements
 142 
 143 ### Phase 2: More Block Types
 144 Add all available textures to categories (60+ blocks total)
 145 
 146 ### Phase 3: Additional Modifiers
 147 - **Ctrl+Letter** - Block type variants (polished, chiseled, etc.)
 148 - **Cmd+Key** - Commands (save, load, teleport, etc.)
 149 - **Opt+Key** - Game settings (time, weather, gamemode, etc.)
 150 
 151 ### Phase 4: Visual Category Browser
 152 - Press C twice → Opens visual block browser
 153 - Grid showing all blocks in category
 154 - Mouse or arrows to select
 155 
 156 ---
 157 
 158 **Last Updated:** 2025-11-28  
 159 **Branch:** feature/category-based-material-selection
