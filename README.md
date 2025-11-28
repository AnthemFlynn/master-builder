# 👑 Kingdom Builder

A 3D building game where you construct structures to impress King Reginald! Built with React, Three.js, and AI-powered characters.

![Kingdom Builder Preview](https://img.shields.io/badge/Status-Ready_to_Play-brightgreen)

## 🎮 Features

- **3D Building**: Place blocks in a beautiful 3D kingdom environment
- **Multiple Materials**: Unlock premium materials like Gold, Ruby, Emerald, and magical glowing blocks
- **Creative Freedom**: Use different block types - cubes, slabs, pillars, arches, and more
- **AI Judgment**: King Reginald (powered by Claude) scores your creations
- **Wise Mentor**: Master Aldric provides building tips and advice
- **Challenges**: Complete quests to earn gold and unlock materials
- **Dynamic Lighting**: Switch between Dawn, Day, Sunset, and Night time cycles
- **Sound Effects**: Musical feedback for your building actions

## 🚀 Quick Start

### Prerequisites

- Node.js(v16 or higher)
- npm or yarn
- An Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd kingdom-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your API key**
   
   Create a `.env` file in the root directory and add your Anthropic API key:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and replace `your_api_key_here` with your actual API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxx...
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Navigate to `http://localhost:5173` (or the URL shown in your terminal)

## 🎯 How to Play

### Controls

#### Camera Movement
- **W/A/S/D**: Move camera position
- **Q/E** or **Arrow Left/Right**: Rotate view
- **R/F** or **Arrow Up/Down**: Tilt camera
- **Z/X**: Zoom in/out

#### Building
- **Left Click**: Place block (or perform selected tool action)
- **Right Click**: Remove block
- **G**: Rotate block Y-axis
- **H**: Rotate block X-axis
- **T**: Cycle through tools

### Tools
- **🔨 Place**: Add blocks to your structure
- **💥 Destroy**: Remove individual blocks
- **💣 Bomb**: Remove multiple blocks at once
- **🎨 Paint**: Change block material
- **📋 Copy**: Copy block type and material from existing blocks

### Game Objectives

1. **Build Creatively**: Construct impressive structures using various materials and block types
2. **Complete Challenges**: Finish quests like "Build 5 blocks tall" or "Use 4 different materials"
3. **Earn Gold**: Complete challenges and get good scores from the King
4. **Unlock Materials**: Purchase premium material packs from the shop
5. **Reach Royal Architect**: Score 2000 points to win the game!

## 🏗️ Materials & Tiers

### Tier 1 (Starter - Free)
- 🪵 Oak Wood
- 🪨 Cobblestone
- 🧱 Brick
- 🏜️ Sandstone

### Tier 2 (Premium Pack - 200 gold)
- 🏛️ White Marble
- 💎 Crystal Glass
- 🖤 Dark Obsidian
- 💜 Royal Purple
- 🧊 Ice Block

### Tier 3 (Royal Pack - 500 gold)
- 🥇 Royal Gold
- ❤️ Ruby Block
- 💚 Emerald Block
- ✨ Glowstone
- 🌟 Fairy Light

### Tier 4 (Legendary Pack - 1000 gold)
- 🔮 Magic Lantern
- 🐉 Dragon Scale

## 🤖 AI Features

### King Reginald
Click the **👑 King** button to have AI-powered King Reginald judge your creation! He will score your build on:
- **Architecture** (0-50 points)
- **Creativity** (0-50 points)  
- **Combo Bonus** (if you're building quickly)

*Note: You need at least 5 blocks before the King will judge your creation.*

### Master Aldric
Click the **🏛️ Mentor** button to ask Master Aldric for building advice. Try questions like:
- "Tower tips?"
- "Material combos?"
- "Make it fancy?"

## 📦 Project Structure

```
kingdom-builder/
├── src/
│   ├── KingdomBuilder.tsx  # Main game component
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Three.js** - 3D graphics
- **Tone.js** - Sound synthesis
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Claude AI** - AI characters (via Anthropic API)

## ⚙️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## ⚠️ Important Notes

### API Key Security
> **Warning**: The current implementation exposes the API key in the browser. For production use, you should implement a backend proxy to keep the API key secure and avoid exposing it in the client code.

### CORS Considerations
The app makes direct API calls to Anthropic from the browser. If you encounter CORS issues, you may need to set up a backend proxy server.

### Browser Compatibility
- Requires a modern browser with WebGL support
- Best experienced on Chrome, Firefox, Safari, or Edge
- Speech synthesis quality varies by browser and installed voices

## 🎨 Tips for Building

1. **Start with a foundation**: Use basic materials to plan your structure
2. **Mix materials**: Higher material variety scores better with the King!
3. **Build tall**: Towers and spires impress King Reginald
4. **Add lighting**: Glowing blocks look amazing at night
5. **Build quickly**: Maintain combos for bonus points
6. **Use the Copy tool**: Quickly replicate blocks you like

## 🐛 Troubleshooting

### "API key not configured!" message
- Make sure you've created a `.env` file
- Check that your API key starts with `sk-ant-`
- Restart the dev server after changing `.env`

### Black screen or no 3D view
- Check browser console for WebGL errors
- Try refreshing the page
- Ensure your graphics drivers are up to date

### No sound
- Click "Start Building!" to initialize audio
- Check browser permissions for audio playback
- Some browsers require user interaction before playing sound

## 📄 License

This project is provided as-is for educational and entertainment purposes.

## 🙏 Acknowledgments

- Three.js for amazing 3D graphics capabilities
- Tone.js for web audio synthesis
- Anthropic Claude for AI personality features
- The React and Vite communities

---

**Enjoy building your kingdom! 👑🏰**
