import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import * as Tone from 'tone';
import TutorialOverlay from './components/TutorialOverlay';
import AchievementPopup from './components/AchievementPopup';
import SaveLoadModal from './components/SaveLoadModal';
import { ACHIEVEMENTS, checkNewAchievements, loadAchievements, saveAchievements, Achievement, GameStats } from './utils/achievements';
import { SaveData, saveBuild, loadBuild } from './utils/storage';

const MATERIALS = [
  { name: 'Dirt', color: 0x8B4513, icon: '🪨', tier: 1 },
  { name: 'Oak Wood', color: 0x8B4513, icon: '🪵', tier: 1 },
  { name: 'Cobblestone', color: 0x696969, icon: '🪨', tier: 1 },
  { name: 'Brick', color: 0xB22222, icon: '🧱', tier: 1 },
  { name: 'Sandstone', color: 0xD2B48C, icon: '🏜️', tier: 1 },
  { name: 'Water', color: 0x1E90FF, icon: '💧', opacity: 0.6, tier: 1 },
  { name: 'White Marble', color: 0xF0F0F0, icon: '🏛️', tier: 2 },
  { name: 'Crystal Glass', color: 0x87CEEB, icon: '💎', opacity: 0.4, tier: 2 },
  { name: 'Fire', color: 0xFF4500, icon: '🔥', glow: true, tier: 2 },
  { name: 'Royal Gold', color: 0xFFD700, icon: '🥇', metalness: 0.8, tier: 3 },
  { name: 'Ruby Block', color: 0xE0115F, icon: '❤️', tier: 3 },
  { name: 'Emerald Block', color: 0x50C878, icon: '💚', tier: 3 },
  { name: 'Dark Obsidian', color: 0x1a1a2e, icon: '🖤', tier: 2 },
  { name: 'Royal Purple', color: 0x6B3FA0, icon: '💜', tier: 2 },
  { name: 'Ice Block', color: 0xADD8E6, icon: '🧊', opacity: 0.6, tier: 2 },
  { name: 'Glowstone', color: 0xFFE87C, icon: '✨', glow: true, tier: 3 },
  { name: 'Magic Lantern', color: 0x9370DB, icon: '🔮', glow: true, tier: 4 },
  { name: 'Fairy Light', color: 0x98FB98, icon: '🌟', glow: true, tier: 3 },
  { name: 'Dragon Scale', color: 0x8B0000, icon: '🐉', metalness: 0.6, tier: 4 },
];

const BLOCK_TYPES = [
  { name: 'Block', type: 'cube', size: [1, 1, 1], icon: '⬜' },
  { name: 'Slab', type: 'slab', size: [1, 0.5, 1], icon: '▬' },
  { name: 'Pillar', type: 'pillar', size: [0.5, 2, 0.5], icon: '▮' },
  { name: 'Wide', type: 'wide', size: [2, 1, 1], icon: '⬛' },
  { name: 'Beam', type: 'beam', size: [3, 0.5, 0.5], icon: '═' },
  { name: 'Arch', type: 'arch', size: [1, 1, 1], icon: '⌓' },
  { name: 'Stairs', type: 'stairs', size: [1, 1, 1], icon: '📶' },
  { name: 'Fence', type: 'fence', size: [0.25, 1, 0.25], icon: '┃' },
];

const TOOLS = [
  { name: 'Place', icon: '🔨', action: 'place' },
  { name: 'Axe', icon: '⛏️', action: 'destroy' },
  { name: 'Bomb', icon: '💣', action: 'bomb' },
  { name: 'Paint', icon: '🎨', action: 'paint' },
  { name: 'Copy', icon: '📋', action: 'copy' },
];

const TIMES = [
  { name: 'Dawn', sky: 0xFFB6C1, ambient: 0.5, night: false },
  { name: 'Day', sky: 0x4A90D9, ambient: 1, night: false },
  { name: 'Sunset', sky: 0xFF6B35, ambient: 0.6, night: false },
  { name: 'Night', sky: 0x0a0a20, ambient: 0.2, night: true },
];

const CHALLENGES = [
  { id: 1, name: 'First Steps', desc: 'Place your first block', reward: 10, check: (s) => s.blocks >= 1 },
  { id: 2, name: 'Getting Tall', desc: 'Build 5 blocks high', reward: 50, check: (s) => s.height >= 5 },
  { id: 3, name: 'Material Master', desc: 'Use 3 different materials', reward: 30, check: (s) => s.matCount >= 3 },
  { id: 4, name: 'Shining Bright', desc: 'Place 3 glowing blocks', reward: 40, check: (s) => s.glows >= 3 },
  { id: 5, name: 'Big Builder', desc: 'Place 25 blocks', reward: 100, check: (s) => s.blocks >= 25 },
  { id: 6, name: 'Sky Scraper', desc: 'Build 10 blocks tall', reward: 150, check: (s) => s.height >= 10 },
  { id: 7, name: 'Variety Pack', desc: 'Use all 4 material tiers', reward: 200, check: (s) => s.matCount >= 7 },
  // New kid-friendly challenges
  { id: 101, name: '🌉 Bridge Builder', desc: 'Build a bridge with 5 blocks!', reward: 50, check: (s) => s.blocks >= 5 },
  { id: 102, name: '🌈 Rainbow Tower', desc: 'Use 3 different colors!', reward: 60, check: (s) => s.matCount >= 3 },
  { id: 103, name: '🏡 Cozy House', desc: 'Build something cozy with 10 blocks!', reward: 70, check: (s) => s.blocks >= 10 },
  { id: 104, name: '🌳 Garden Party', desc: 'Place 20 blocks to make a garden!', reward: 80, check: (s) => s.blocks >= 20 },
  { id: 105, name: '⭐ Star Gazer', desc: 'Build 5 blocks tall!', reward: 90, check: (s) => s.height >= 5 },
  { id: 106, name: '🎪 Light Show', desc: 'Place 5 glowing blocks!', reward: 100, check: (s) => s.glows >= 5 },
];

const TITLES = [
  { score: 0, title: "Peasant Builder", color: "text-gray-400" },
  { score: 200, title: "Apprentice Mason", color: "text-green-400" },
  { score: 500, title: "Journeyman", color: "text-blue-400" },
  { score: 1000, title: "Master Builder", color: "text-purple-400" },
  { score: 2000, title: "Royal Architect", color: "text-yellow-400" },
];

const KING_PROMPT = `You are King Reginald, a dramatic funny medieval king. Mix "thee/thy" speech with modern slang. LOVE towers, gold, variety. HATE boring boxes. Score Architecture (0-50) and Creativity (0-50). Write "Architecture: X" and "Creativity: Y" clearly. Under 80 words. End with a decree.`;
const MENTOR_PROMPT = `You are Master Aldric, a wise old architect. Give helpful building tips warmly. Call them "young apprentice." Under 60 words.`;

// Sound
class Sounds {
  constructor() { this.ok = false; }
  async init() {
    if (this.ok) return;
    await Tone.start();
    this.place = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
    this.destroy = new Tone.NoiseSynth({ envelope: { decay: 0.1 } }).toDestination();
    this.fanfare = new Tone.PolySynth(Tone.Synth).toDestination();
    this.ok = true;
  }
  play(s) {
    if (!this.ok) return;
    if (s === 'place') this.place.triggerAttackRelease('C5', '16n');
    else if (s === 'destroy') this.destroy.triggerAttackRelease('8n');
    else if (s === 'fanfare') this.fanfare.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '4n');
    else if (s === 'achieve') this.fanfare.triggerAttackRelease(['E4', 'G4', 'B4'], '8n');
  }
}
const sfx = new Sounds();

// Better TTS with natural voices
const speak = (text, type = 'king') => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  // Try to find more natural voices
  const preferredVoices = type === 'king'
    ? ['Google UK English Male', 'Daniel', 'James', 'Google US English', 'Alex', 'Microsoft David', 'English Male']
    : ['Google UK English Female', 'Samantha', 'Karen', 'Microsoft Zira', 'Google US English', 'English'];

  for (const pref of preferredVoices) {
    const found = voices.find(v => v.name.includes(pref));
    if (found) { utter.voice = found; break; }
  }

  utter.pitch = type === 'king' ? 0.85 : 1.0;
  utter.rate = 0.92;
  utter.volume = 1;

  window.speechSynthesis.speak(utter);
};

// Preload voices
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

export default function KingdomBuilder() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const camRef = useRef(null);
  const rendererRef = useRef(null);
  const blocksRef = useRef([]);
  const groundRef = useRef(null);
  const previewRef = useRef(null);
  const keysRef = useRef({});
  const glowsRef = useRef([]);
  const starsRef = useRef(null);
  const rayRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const camCtrl = useRef({ yaw: Math.PI / 4, pitch: 0.5, dist: 22, tx: 0, ty: 5, tz: 0 });
  const [matIdx, setMatIdx] = useState(0);
  const [typeIdx, setTypeIdx] = useState(0);
  const [toolIdx, setToolIdx] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);

  const initRef = useRef(false);
  const typeIdxRef = useRef(typeIdx);

  useEffect(() => { typeIdxRef.current = typeIdx; }, [typeIdx]);
  const [gold, setGold] = useState(100);
  const [score, setScore] = useState(0);
  const [kingMsg, setKingMsg] = useState(null);
  const [mentorMsg, setMentorMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showMentor, setShowMentor] = useState(false);
  const [mentorQ, setMentorQ] = useState('');
  const [timeIdx, setTimeIdx] = useState(1);
  const [done, setDone] = useState([]);
  const [popup, setPopup] = useState(null);
  const [showQuests, setShowQuests] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [blockCount, setBlockCount] = useState(0);
  const [intro, setIntro] = useState(true);
  const [tiers, setTiers] = useState([1]);
  const [combo, setCombo] = useState(0);
  const [lastPlace, setLastPlace] = useState(0);

  // Kid-friendly features
  const [creativeMode, setCreativeMode] = useState(() => {
    const saved = localStorage.getItem('kb_creativeMode');
    return saved === 'true';
  });
  const [undoHistory, setUndoHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState(() => {
    const completed = localStorage.getItem('kb_tutorialComplete');
    return completed === 'true' ? 0 : 1; // 0 = not showing, 1-5 = steps
  });

  // Achievement state
  const [achievements, setAchievements] = useState<string[]>(() => loadAchievements());
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [totalGoldEarned, setTotalGoldEarned] = useState(() => {
    const saved = localStorage.getItem('kb_totalGoldEarned');
    return saved ? parseInt(saved) : 0;
  });

  // Save/Load state
  const [showSaveLoadModal, setShowSaveLoadModal] = useState<'save' | 'load' | null>(null);

  const WIN = 2000;
  const title = TITLES.filter(t => score >= t.score).pop();

  const getStats = useCallback(() => {
    const b = blocksRef.current;
    const mats = new Set(), glows = b.filter(x => MATERIALS[x.userData.mi].glow).length;
    b.forEach(x => mats.add(x.userData.mi));
    return {
      blocks: b.length,
      height: b.length ? Math.max(...b.map(x => x.position.y)) + 1 : 0,
      matCount: mats.size,
      glows,
      mats: Object.fromEntries([...mats].map(i => [MATERIALS[i].name, b.filter(x => x.userData.mi === i).length]))
    };
  }, []);

  const checkQuests = useCallback(() => {
    const s = getStats();
    CHALLENGES.forEach(c => {
      if (!done.includes(c.id) && c.check(s)) {
        setDone(p => [...p, c.id]);
        setGold(p => p + c.reward);
        setPopup(c);
        sfx.play('achieve');
        setTimeout(() => setPopup(null), 3000);
      }
    });
  }, [done, getStats]);

  // Tutorial handlers
  const handleTutorialNext = () => {
    if (tutorialStep >= 5) {
      setTutorialStep(0);
      localStorage.setItem('kb_tutorialComplete', 'true');
    } else {
      setTutorialStep(prev => prev + 1);
    }
  };

  const handleTutorialSkip = () => {
    setTutorialStep(0);
    localStorage.setItem('kb_tutorialComplete', 'true');
  };

  // Achievement checking
  const checkAchievements = useCallback(() => {
    const stats: GameStats = {
      blocks: blocksRef.current.length,
      maxHeight: blocksRef.current.reduce((max, b) => Math.max(max, b.position.y), 0),
      materialsUsed: new Set(blocksRef.current.map(b => b.userData.mi)).size,
      glowingBlocks: glowsRef.current.length,
      score,
      goldEarned: totalGoldEarned,
      tiersUnlocked: tiers.length
    };

    const newAchievements = checkNewAchievements(stats, achievements);
    if (newAchievements.length > 0) {
      const newIds = newAchievements.map(a => a.id);
      setAchievements(prev => [...prev, ...newIds]);
      saveAchievements([...achievements, ...newIds]);
      setCurrentAchievement(newAchievements[0]); // Show first new achievement
      sfx.play('fanfare');
    }
  }, [achievements, score, totalGoldEarned, tiers]);

  // Track gold earned
  useEffect(() => {
    localStorage.setItem('kb_totalGoldEarned', totalGoldEarned.toString());
  }, [totalGoldEarned]);

  // Save/Load handlers
  const handleSave = (slotIndex: number, name: string) => {
    const saveData: SaveData = {
      name,
      timestamp: Date.now(),
      blocks: blocksRef.current.map(b => ({
        position: { x: b.position.x, y: b.position.y, z: b.position.z },
        rotation: { x: b.rotation.x, y: b.rotation.y, z: b.rotation.z },
        materialIndex: b.userData.mi,
        typeIndex: b.userData.ti
      })),
      gold,
      score,
      achievements
    };
    saveBuild(slotIndex, saveData);
  };

  const handleLoad = (slotIndex: number) => {
    const saveData = loadBuild(slotIndex);
    if (!saveData || !sceneRef.current) return;

    // Clear current blocks
    blocksRef.current.forEach(b => {
      sceneRef.current?.remove(b);
      if (b.userData.light) sceneRef.current?.remove(b.userData.light);
    });
    blocksRef.current = [];
    glowsRef.current = [];

    // Restore saved blocks
    saveData.blocks.forEach(blockData => {
      const geo = makeGeo(blockData.typeIndex);
      const mat = makeMat(blockData.materialIndex);
      const block = new THREE.Mesh(geo, mat);
      block.position.set(blockData.position.x, blockData.position.y, blockData.position.z);
      block.rotation.set(blockData.rotation.x, blockData.rotation.y, blockData.rotation.z);
      block.castShadow = block.receiveShadow = true;
      block.userData = { mi: blockData.materialIndex, ti: blockData.typeIndex };
      sceneRef.current.add(block);
      blocksRef.current.push(block);

      // Restore glow if needed
      const m = MATERIALS[blockData.materialIndex];
      if (m.glow) {
        const light = new THREE.PointLight(m.color, TIMES[timeIdx].night ? 3 : 0.5, 12);
        light.position.copy(block.position);
        sceneRef.current.add(light);
        glowsRef.current.push(light);
        block.userData.light = light;
      }
    });

    // Restore state
    setGold(saveData.gold);
    setScore(saveData.score);
    setAchievements(saveData.achievements);
    setBlockCount(blocksRef.current.length);
  };

  // Screenshot capture
  const captureScreenshot = () => {
    if (!rendererRef.current || !sceneRef.current || !camRef.current) return;

    // Render current frame
    rendererRef.current.render(sceneRef.current, camRef.current);

    // Get image data as PNG
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.download = `kingdom-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    // Play sound feedback
    sfx.play('ok');
  };


  const makeGeo = useCallback((ti) => {
    const t = BLOCK_TYPES[ti];
    const [w, h, d] = t.size;
    if (t.type === 'pillar' || t.type === 'fence') return new THREE.CylinderGeometry(w / 2, w / 2, h, 8);
    if (t.type === 'arch') {
      const sh = new THREE.Shape();
      sh.moveTo(-0.5, 0); sh.lineTo(-0.5, 0.5);
      sh.quadraticCurveTo(-0.5, 1, 0, 1);
      sh.quadraticCurveTo(0.5, 1, 0.5, 0.5);
      sh.lineTo(0.5, 0);
      return new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false });
    }
    return new THREE.BoxGeometry(w, h, d);
  }, []);

  const makeMat = useCallback((mi) => {
    const m = MATERIALS[mi];
    return new THREE.MeshStandardMaterial({
      color: m.color,
      transparent: !!(m.opacity || m.glow),
      opacity: m.opacity ?? 1,
      roughness: m.metalness ? 0.3 : (m.glow ? 0.4 : 0.65),
      metalness: m.metalness ?? (m.glow ? 0.2 : 0.1),
      emissive: m.glow ? m.color : 0x000000,
      emissiveIntensity: m.glow ? 0.6 : 0
    });
  }, []);

  const setTime = useCallback((i) => {
    const t = TIMES[i];
    const sc = sceneRef.current;
    if (!sc) return;
    sc.background = new THREE.Color(t.sky);
    sc.fog.color.setHex(t.sky);
    sc.children.forEach(c => {
      if (c.isAmbientLight) c.intensity = 0.4 + t.ambient * 0.4;
      if (c.isDirectionalLight) c.intensity = t.ambient;
    });
    if (starsRef.current) starsRef.current.visible = t.night;
    glowsRef.current.forEach(l => l.intensity = t.night ? 3 : 0.5);
  }, []);

  const askKing = useCallback(async () => {
    if (blocksRef.current.length < 5) {
      const m = "WHAT?! This pile of rubble? Bring me at least 5 blocks, peasant!";
      setKingMsg({ text: m, a: 0, c: 0 });
      speak(m, 'king');
      return;
    }
    setBusy(true);
    sfx.play('fanfare');
    const st = getStats();
    try {
      const apiKey = import.meta.env.ANTHROPIC_API_KEY;
      if (!apiKey || apiKey === 'your_api_key_here') {
        setKingMsg({ text: "API key not configured! Check .env file.", a: 0, c: 0 });
        setBusy(false);
        return;
      }
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 350,
          system: KING_PROMPT,
          messages: [{ role: "user", content: `Judge: ${st.blocks} blocks, ${Math.round(st.height)} tall, ${st.matCount} materials: ${JSON.stringify(st.mats)}, ${st.glows} glowing, time: ${TIMES[timeIdx].name}` }]
        })
      });
      const d = await r.json();
      const txt = d.content[0].text;
      const a = Math.min(50, parseInt(txt.match(/Architecture[:\s]*(\d+)/i)?.[1] || 20));
      const c = Math.min(50, parseInt(txt.match(/Creativity[:\s]*(\d+)/i)?.[1] || 20));
      const bonus = combo > 2 ? Math.floor((a + c) * 0.15) : 0;
      setKingMsg({ text: txt, a, c, bonus });
      setScore(p => p + a + c + bonus);
      setGold(p => p + Math.floor((a + c) / 2));
      speak(txt, 'king');
    } catch { setKingMsg({ text: "The King dozed off... try again!", a: 0, c: 0 }); }
    setBusy(false);
  }, [getStats, timeIdx, combo]);

  const askMentor = useCallback(async (q) => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const apiKey = import.meta.env.ANTHROPIC_API_KEY;
      if (!apiKey || apiKey === 'your_api_key_here') {
        setMentorMsg("API key not configured! Check .env file.");
        setBusy(false);
        return;
      }
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 250,
          system: MENTOR_PROMPT,
          messages: [{ role: "user", content: `Build has ${getStats().blocks} blocks. Question: "${q}"` }]
        })
      });
      const d = await r.json();
      const txt = d.content[0].text;
      setMentorMsg(txt);
      speak(txt, 'mentor');
    } catch { setMentorMsg("Hmm, my thoughts wandered... ask again."); }
    setBusy(false);
    setMentorQ('');
  }, [getStats]);

  const buyTier = (tier, cost) => {
    if (gold >= cost && !tiers.includes(tier)) {
      setGold(p => p - cost);
      setTiers(p => [...p, tier]);
      sfx.play('fanfare');
    }
  };

  // Creative Mode: Unlock all materials and give unlimited gold
  useEffect(() => {
    if (creativeMode) {
      setTiers([1, 2, 3, 4]); // Unlock all tiers
      setGold(999999); // Unlimited gold
    }
    localStorage.setItem('kb_creativeMode', creativeMode.toString());
  }, [creativeMode]);

  // Toggle Creative Mode
  const toggleCreativeMode = () => {
    setCreativeMode(prev => !prev);
  };

  // Undo/Redo System
  const performUndo = () => {
    if (undoHistory.length === 0) return;

    const lastAction = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    setRedoHistory(prev => [...prev, lastAction]);

    // Remove the last block
    if (lastAction.type === 'place' && blocksRef.current.length > 0) {
      const block = blocksRef.current[blocksRef.current.length - 1];
      if (sceneRef.current) {
        sceneRef.current.remove(block);
        if (block.userData.light && glowsRef.current) {
          sceneRef.current.remove(block.userData.light);
          glowsRef.current = glowsRef.current.filter(l => l !== block.userData.light);
        }
      }
      blocksRef.current = blocksRef.current.slice(0, -1);
      setBlockCount(blocksRef.current.length);
    }
  };

  const performRedo = () => {
    if (redoHistory.length === 0) return;

    const action = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));
    setUndoHistory(prev => [...prev, action]);

    // Re-add the block (simplified - would need to store full block data)
    // For now, just clear redo history on new actions
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyboard = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        performRedo();
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [undoHistory, redoHistory]);


  // Init scene
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;
    sfx.init();

    const W = window.innerWidth, H = window.innerHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(TIMES[1].sky);
    scene.fog = new THREE.Fog(TIMES[1].sky, 50, 180);
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(65, W / H, 0.1, 1000);
    camRef.current = cam;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1);
    sun.position.set(40, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
    sun.shadow.camera.right = sun.shadow.camera.top = 80;
    scene.add(sun);

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x2d5a27 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
    groundRef.current = ground;

    const grid = new THREE.GridHelper(120, 120, 0x1a4a1a, 0x1a4a1a);
    grid.position.y = 0.01;
    scene.add(grid);

    // Castle
    const castleM = new THREE.MeshStandardMaterial({ color: 0x8B8682 });
    const roofM = new THREE.MeshStandardMaterial({ color: 0x5a0000 });
    [[-22, -90], [22, -90], [0, -100]].forEach(([x, z], i) => {
      const h = i === 2 ? 28 : 20;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, h, 8), castleM);
      t.position.set(x, h / 2, z); t.castShadow = true; scene.add(t);
      const r = new THREE.Mesh(new THREE.ConeGeometry(5, 7, 8), roofM);
      r.position.set(x, h + 3.5, z); scene.add(r);
    });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(44, 14, 3), castleM);
    wall.position.set(0, 7, -90); scene.add(wall);

    // Mountains
    const mtnM = new THREE.MeshStandardMaterial({ color: 0x4a5568, flatShading: true });
    [[-70, -140], [70, -150], [-35, -160], [35, -155], [0, -175]].forEach(([x, z]) => {
      const h = 35 + Math.random() * 45;
      const m = new THREE.Mesh(new THREE.ConeGeometry(25, h, 5), mtnM);
      m.position.set(x, h / 2, z); scene.add(m);
    });

    // Trees
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * 250, z = -35 - Math.random() * 100;
      if (Math.abs(x) < 50 && z > -80) continue;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 6), new THREE.MeshStandardMaterial({ color: 0x4a3728 }));
      trunk.position.set(x, 2, z); scene.add(trunk);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6, 6), new THREE.MeshStandardMaterial({ color: 0x228b22 }));
      leaf.position.set(x, 6, z); scene.add(leaf);
    }

    // Stars
    const starV = [];
    for (let i = 0; i < 600; i++) {
      const r = 200, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.35;
      starV.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) + 40, r * Math.sin(ph) * Math.sin(th));
    }
    const starG = new THREE.BufferGeometry();
    starG.setAttribute('position', new THREE.Float32BufferAttribute(starV, 3));
    const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 }));
    stars.visible = false; scene.add(stars); starsRef.current = stars;

    // Preview block
    const preview = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8B4513, transparent: true, opacity: 0.5 }));
    preview.visible = false; scene.add(preview); previewRef.current = preview;

    // Animation loop
    const cc = camCtrl.current;
    const animate = () => {
      requestAnimationFrame(animate);
      const sp = 0.4;
      // WASD moves target
      if (keysRef.current['w']) { cc.tz -= Math.cos(cc.yaw) * sp; cc.tx -= Math.sin(cc.yaw) * sp; }
      if (keysRef.current['s']) { cc.tz += Math.cos(cc.yaw) * sp; cc.tx += Math.sin(cc.yaw) * sp; }
      if (keysRef.current['a']) { cc.tx -= Math.cos(cc.yaw) * sp; cc.tz += Math.sin(cc.yaw) * sp; }
      if (keysRef.current['d']) { cc.tx += Math.cos(cc.yaw) * sp; cc.tz -= Math.sin(cc.yaw) * sp; }
      // QE rotate yaw, RF pitch, ZX zoom
      if (keysRef.current['q']) cc.yaw -= 0.025;
      if (keysRef.current['e']) cc.yaw += 0.025;
      if (keysRef.current['r']) cc.pitch = Math.min(1.4, cc.pitch + 0.02);
      if (keysRef.current['f']) cc.pitch = Math.max(0.1, cc.pitch - 0.02);
      if (keysRef.current['z']) cc.dist = Math.max(5, cc.dist - 0.3);
      if (keysRef.current['x']) cc.dist = Math.min(80, cc.dist + 0.3);
      // Arrow keys also rotate view
      if (keysRef.current['arrowleft']) cc.yaw -= 0.03;
      if (keysRef.current['arrowright']) cc.yaw += 0.03;
      if (keysRef.current['arrowup']) cc.pitch = Math.min(1.4, cc.pitch + 0.02);
      if (keysRef.current['arrowdown']) cc.pitch = Math.max(0.1, cc.pitch - 0.02);

      // Orbit camera
      const cx = cc.tx + Math.sin(cc.yaw) * Math.cos(cc.pitch) * cc.dist;
      const cy = cc.ty + Math.sin(cc.pitch) * cc.dist;
      const cz = cc.tz + Math.cos(cc.yaw) * Math.cos(cc.pitch) * cc.dist;
      cam.position.set(cx, cy, cz);
      cam.lookAt(cc.tx, cc.ty, cc.tz);

      renderer.render(scene, cam);
    };
    animate();

    // Input handlers
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (k === 'g') setRotY(p => (p + 1) % 4);
      if (k === 'h') setRotX(p => (p + 1) % 4);
      if (k === 't') setToolIdx(p => (p + 1) % TOOLS.length);
    };
    const onKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      updatePreview();
    };

    const updatePreview = () => {
      rayRef.current.setFromCamera(mouseRef.current, cam);
      const targets = [ground, ...blocksRef.current];
      const hits = rayRef.current.intersectObjects(targets);
      if (hits.length && previewRef.current) {
        const hit = hits[0];
        const p = new THREE.Vector3();
        if (hit.object.name === 'ground') {
          p.copy(hit.point).floor().addScalar(0.5);
          p.y = BLOCK_TYPES[typeIdxRef.current].size[1] / 2;
        } else {
          p.copy(hit.point).add(hit.face.normal.clone().multiplyScalar(0.5)).floor().addScalar(0.5);
        }
        previewRef.current.position.copy(p);
        previewRef.current.visible = true;
      } else if (previewRef.current) {
        previewRef.current.visible = false;
      }
    };

    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);

      // Cleanup renderer
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      initRef.current = false;
    };
  }, [typeIdx]);

  // Click handler
  const onClick = useCallback((e) => {
    if (!sceneRef.current || !camRef.current) return;

    rayRef.current.setFromCamera(mouseRef.current, camRef.current);
    const targets = [groundRef.current, ...blocksRef.current];
    const hits = rayRef.current.intersectObjects(targets);

    const t = TOOLS[toolIdx];

    const addBlock = () => {
      if (!previewRef.current?.visible) return;
      const m = MATERIALS[matIdx];
      if (!tiers.includes(m.tier)) return;

      const geo = makeGeo(typeIdx);
      const mat = makeMat(matIdx);
      const block = new THREE.Mesh(geo, mat);
      block.position.copy(previewRef.current.position);
      block.rotation.set(rotX * Math.PI / 2, rotY * Math.PI / 2, 0);
      block.castShadow = block.receiveShadow = true;
      block.userData = { mi: matIdx, ti: typeIdx, ry: rotY, rx: rotX };
      sceneRef.current.add(block);
      blocksRef.current.push(block);

      if (m.glow) {
        const light = new THREE.PointLight(m.color, TIMES[timeIdx].night ? 3 : 0.5, 12);
        light.position.copy(block.position);
        sceneRef.current.add(light);
        glowsRef.current.push(light);
        block.userData.light = light;
      }

      // Combo
      const now = Date.now();
      setCombo(p => now - lastPlace < 1000 ? Math.min(10, p + 1) : 1);
      setLastPlace(now);

      setBlockCount(blocksRef.current.length);
      sfx.play('place');
      checkQuests();
      checkAchievements(); // Check for new achievements

      // Track for undo
      setUndoHistory(prev => [...prev.slice(-19), { type: 'place', block }]);
      setRedoHistory([]); // Clear redo on new action
    };

    const removeBlock = (b) => {
      if (b.userData.light) {
        sceneRef.current.remove(b.userData.light);
        glowsRef.current = glowsRef.current.filter(l => l !== b.userData.light);
      }
      sceneRef.current.remove(b);
      blocksRef.current = blocksRef.current.filter(x => x !== b);
      setBlockCount(blocksRef.current.length);
      sfx.play('destroy');
    };

    // Find empty spot nearby for dirt pile
    const findNearbyEmptySpot = (origin: THREE.Vector3, minDist: number, maxDist: number) => {
      // Try positions in expanding circle
      for (let r = minDist; r <= maxDist; r++) {
        for (let angle = 0; angle < 360; angle += 45) {
          const rad = (angle * Math.PI) / 180;
          const x = r * Math.cos(rad);
          const z = r * Math.sin(rad);

          // Check if spot is empty (no blocks nearby)
          const testPos = new THREE.Vector3(origin.x + x, 0.5, origin.z + z);
          const hasBlock = blocksRef.current.some(b =>
            b.position.distanceTo(testPos) < 1
          );

          if (!hasBlock) {
            return { x, z };
          }
        }
      }

      // Fallback: random nearby
      return {
        x: (Math.random() - 0.5) * 6,
        z: (Math.random() - 0.5) * 6
      };
    };

    // Spawn dirt block nearby
    const spawnDirtPile = (origin: THREE.Vector3) => {
      const offset = findNearbyEmptySpot(origin, 2, 5);

      // Create dirt block
      const dirt = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        makeMat(0) // Dirt is material index 0
      );

      dirt.position.set(
        Math.floor(origin.x + offset.x) + 0.5,
        0.5,
        Math.floor(origin.z + offset.z) + 0.5
      );

      dirt.castShadow = true;
      dirt.receiveShadow = true;
      dirt.userData = { ti: 0, mi: 0 }; // Cube block, dirt material

      if (sceneRef.current) {
        sceneRef.current.add(dirt);
        blocksRef.current.push(dirt);
        setBlockCount(blocksRef.current.length);
      }
    };

    // Dig ground function
    const digGround = (hitPoint: THREE.Vector3) => {
      if (!groundRef.current) return;

      const geo = groundRef.current.geometry;
      const pos = geo.attributes.position;
      const digSize = 2; // Size of hole
      const digDepth = 0.5; // How deep to dig

      // Lower ground vertices near hit point
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const dist = Math.sqrt((x - hitPoint.x) ** 2 + (z - hitPoint.z) ** 2);

        if (dist < digSize) {
          // Gradual depth based on distance
          const depth = (1 - dist / digSize) * digDepth;
          pos.setY(i, pos.getY(i) - depth);
        }
      }

      pos.needsUpdate = true;
      geo.computeVertexNormals();

      // Spawn dirt block nearby
      spawnDirtPile(hitPoint);

      sfx.play('destroy');
    };


    if (e.button === 0) {
      // Tool-based actions (like Minecraft)
      if (t.action === 'place') addBlock();
      else if (t.action === 'destroy' && hits.length) {
        if (hits[0].object.name === 'ground') {
          // Dig ground and create dirt pile
          digGround(hits[0].point);
        } else {
          // Remove block
          removeBlock(hits[0].object);
        }
      }
      else if (t.action === 'bomb' && hits.length) {
        const center = hits[0].object.position;
        blocksRef.current.filter(b => b.position.distanceTo(center) < 3.5).forEach(removeBlock);
      }
      else if (t.action === 'paint' && hits.length) {
        if (tiers.includes(MATERIALS[matIdx].tier)) {
          hits[0].object.material = makeMat(matIdx);
          hits[0].object.userData.mi = matIdx;
          sfx.play('place');
        }
      }
      else if (t.action === 'copy' && hits.length) {
        const ud = hits[0].object.userData;
        setMatIdx(ud.mi);
        setTypeIdx(ud.ti);
        setRotY(ud.ry || 0);
        setRotX(ud.rx || 0);
      }
    } else if (e.button === 2 && hits.length) {
      // Right-click always removes blocks
      removeBlock(hits[0].object);
    }
  }, [toolIdx, matIdx, typeIdx, rotY, rotX, tiers, timeIdx, lastPlace, makeGeo, makeMat, checkQuests]);

  // Attach click handlers
  useEffect(() => {
    const el = rendererRef.current?.domElement;
    if (!el) return;
    const click = (e) => onClick(e);
    const ctx = (e) => { e.preventDefault(); onClick({ ...e, button: 2 }); };
    el.addEventListener('mousedown', click);
    el.addEventListener('contextmenu', ctx);
    return () => { el.removeEventListener('mousedown', click); el.removeEventListener('contextmenu', ctx); };
  }, [onClick]);

  // Update preview appearance
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current.geometry.dispose();
    previewRef.current.geometry = makeGeo(typeIdx);
    previewRef.current.material.color.setHex(MATERIALS[matIdx].color);
    previewRef.current.material.opacity = tiers.includes(MATERIALS[matIdx].tier) ? 0.5 : 0.2;
    previewRef.current.rotation.set(rotX * Math.PI / 2, rotY * Math.PI / 2, 0);
  }, [matIdx, typeIdx, rotY, rotX, tiers, makeGeo]);

  const won = score >= WIN;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Tutorial Overlay */}
      {tutorialStep > 0 && (
        <TutorialOverlay
          step={tutorialStep}
          onNext={handleTutorialNext}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* Achievement Popup */}
      <AchievementPopup
        achievement={currentAchievement}
        onClose={() => setCurrentAchievement(null)}
      />

      {/* Intro */}
      {intro && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-xl max-w-md w-full text-white border border-yellow-600">
            <h1 className="text-3xl font-bold text-yellow-400 text-center mb-3">👑 Kingdom Builder</h1>
            <p className="text-center text-gray-300 mb-4">Build to impress the King!</p>
            <div className="text-sm space-y-1 mb-4 bg-black/40 p-3 rounded">
              <p><b>Move:</b> WASD</p>
              <p><b>Look:</b> Q/E rotate • R/F tilt • Arrows also work</p>
              <p><b>Zoom:</b> Z/X</p>
              <p><b>Build:</b> Left click place • Right click remove</p>
              <p><b>Block:</b> G rotate Y-axis • H rotate X-axis • T tools</p>
            </div>
            <div className="text-sm text-yellow-200 mb-4">
              🏆 Complete challenges • 💰 Unlock materials • ⚡ Build combos!
            </div>
            <button onClick={async () => { await sfx.init(); setIntro(false); }} className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg text-lg">
              Start Building!
            </button>
          </div>
        </div>
      )}

      {/* Win */}
      {won && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-yellow-900 to-gray-900 p-8 rounded-xl text-center border-2 border-yellow-400 max-w-md">
            <h1 className="text-4xl font-bold text-yellow-400 mb-4">👑 VICTORY!</h1>
            <p className="text-xl text-white mb-2">You are the Royal Architect!</p>
            <p className="text-gray-300 mb-4">Score: {score} • Quests: {done.length}/{CHALLENGES.length}</p>
            <button onClick={() => location.reload()} className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg">Play Again</button>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-3 left-3 bg-black/80 text-white p-3 rounded-lg text-sm backdrop-blur-sm">
        <div className={`font-bold ${title.color}`}>{title.title}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-yellow-400">💰 {gold}</span>
          <span className="text-gray-500">|</span>
          <span>Score: {score}/{WIN}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Blocks: {blockCount} • {TIMES[timeIdx].name}
          {combo > 1 && <span className="text-orange-400 ml-2">🔥x{combo}</span>}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, score / WIN * 100)}%` }} />
        </div>
      </div>

      {/* Creative Mode & Undo Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <button
          onClick={toggleCreativeMode}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 ${creativeMode
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          title={creativeMode ? "Creative Mode ON - All materials unlocked!" : "Click for Creative Mode"}
        >
          {creativeMode ? '✨ Creative Mode' : '🎨 Creative Mode'}
        </button>

        <button
          onClick={performUndo}
          disabled={undoHistory.length === 0}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 ${undoHistory.length > 0
            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-xl'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          title={`Undo last action (${undoHistory.length} available)`}
        >
          ↶ Undo {undoHistory.length > 0 && `(${undoHistory.length})`}
        </button>

        <button
          onClick={() => setShowSaveLoadModal('save')}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl"
          title="Save your build to a slot"
        >
          💾 Save Build
        </button>

        <button
          onClick={() => setShowSaveLoadModal('load')}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl"
          title="Load a saved build"
        >
          📂 Load Build
        </button>

        <button
          onClick={captureScreenshot}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg hover:shadow-xl"
          title="Take a screenshot of your build"
        >
          📸 Take Photo
        </button>

        {/* Divider */}
        <div className="border-t border-gray-600 my-2"></div>

        {/* Game Controls */}
        <button
          onClick={askKing}
          disabled={busy}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-black shadow-lg"
          title="Ask the King for feedback"
        >
          {busy ? '⏳' : '👑'} King
        </button>

        <button
          onClick={() => setShowMentor(true)}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
          title="Get building tips from the Mentor"
        >
          🏛️ Mentor
        </button>

        <button
          onClick={() => setShowQuests(true)}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-purple-600 hover:bg-purple-500 text-white shadow-lg"
          title="View challenges and quests"
        >
          🏆 Quests ({done.length}/{CHALLENGES.length})
        </button>

        <button
          onClick={() => setShowShop(true)}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-blue-600 hover:bg-blue-500 text-white shadow-lg"
          title="Buy material upgrades"
        >
          🛒 Shop
        </button>

        <button
          onClick={() => { const n = (timeIdx + 1) % TIMES.length; setTimeIdx(n); setTime(n); }}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
          title="Change time of day"
        >
          {TIMES[timeIdx].night ? '🌙' : timeIdx === 0 ? '🌅' : timeIdx === 2 ? '🌆' : '☀️'} Time
        </button>

        <button
          onClick={() => setIntro(true)}
          className="px-4 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 bg-gray-600 hover:bg-gray-500 text-white shadow-lg"
          title="Show game controls and help"
        >
          ❓ Help
        </button>
      </div>

      {/* Save/Load Modal */}
      {showSaveLoadModal && (
        <SaveLoadModal
          mode={showSaveLoadModal}
          onClose={() => setShowSaveLoadModal(null)}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      )}

      {/* Materials */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/80 p-2 rounded-lg backdrop-blur-sm">
        <div className="flex gap-1 flex-wrap justify-center max-w-xl">
          {MATERIALS.map((m, i) => {
            const locked = !tiers.includes(m.tier);
            return (
              <button key={i} onClick={() => !locked && setMatIdx(i)} title={m.name + (locked ? ' 🔒' : '')}
                className={`w-8 h-8 rounded border-2 flex items-center justify-center relative transition-transform
                  ${matIdx === i ? 'border-yellow-400 scale-110' : 'border-gray-600'}
                  ${locked ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}
                  ${m.glow ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: `#${m.color.toString(16).padStart(6, '0')}` }}>
                <span className="text-xs drop-shadow">{m.icon}</span>
                {locked && <span className="absolute text-[8px]">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Shapes & Tools */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        <div className="bg-black/80 p-2 rounded-lg backdrop-blur-sm flex gap-1">
          {BLOCK_TYPES.map((b, i) => (
            <button key={i} onClick={() => setTypeIdx(i)} title={b.name}
              className={`w-9 h-9 rounded border-2 flex items-center justify-center bg-gray-700/80 transition-transform
                ${typeIdx === i ? 'border-yellow-400 scale-110' : 'border-gray-600 hover:scale-105'}`}>
              <span className="text-lg">{b.icon}</span>
            </button>
          ))}
        </div>
        <div className="bg-black/80 p-2 rounded-lg backdrop-blur-sm flex gap-1">
          {TOOLS.map((t, i) => (
            <button key={i} onClick={() => setToolIdx(i)} title={t.name}
              className={`w-9 h-9 rounded border-2 flex items-center justify-center bg-gray-700/80 transition-transform
                ${toolIdx === i ? 'border-yellow-400 scale-110' : 'border-gray-600 hover:scale-105'}`}>
              <span className="text-lg">{t.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rotation indicator */}
      <div className="absolute bottom-3 left-3 bg-black/80 px-3 py-2 rounded-lg text-white text-xs flex items-center gap-3 backdrop-blur-sm">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Y:</span>
          <div className="w-5 h-5 border border-yellow-400 rounded flex items-center justify-center" style={{ transform: `rotate(${rotY * 90}deg)` }}>
            <span className="text-yellow-400 text-xs">→</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">X:</span>
          <div className="w-5 h-5 border border-cyan-400 rounded flex items-center justify-center">
            <span className="text-cyan-400 text-xs" style={{ transform: `rotate(${rotX * 90}deg)` }}>↑</span>
          </div>
        </div>
        <span className="text-gray-500 text-[10px]">G/H</span>
      </div>

      {/* Camera hint */}
      <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded text-gray-400 text-[10px] backdrop-blur-sm">
        Arrows/QE: Look • RF: Tilt • ZX: Zoom
      </div>

      {/* Achievement popup (outside HUD) */}
      {popup && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-6 py-3 rounded-lg z-40 animate-bounce shadow-lg">
          <div className="font-bold text-lg">🏆 {popup.name}</div>
          <div className="text-sm">+{popup.reward} gold!</div>
        </div>
      )}

      {/* King message */}
      {kingMsg && (
        <div className="absolute top-16 right-3 w-72 bg-black/90 text-white p-3 rounded-lg max-h-64 overflow-y-auto backdrop-blur-sm border border-yellow-600/30">
          <div className="flex justify-between mb-2">
            <span className="text-yellow-400 font-bold">👑 King Reginald</span>
            <button onClick={() => { setKingMsg(null); speechSynthesis?.cancel(); }} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <p className="text-xs whitespace-pre-wrap mb-2">{kingMsg.text}</p>
          {kingMsg.a > 0 && (
            <div className="text-xs border-t border-gray-700 pt-2 text-gray-300">
              +{kingMsg.a} Arch • +{kingMsg.c} Creat
              {kingMsg.bonus > 0 && <span className="text-orange-400"> • +{kingMsg.bonus} combo!</span>}
            </div>
          )}
        </div>
      )}

      {/* Mentor modal */}
      {showMentor && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-4 rounded-lg max-w-sm w-full text-white border border-emerald-600/30">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-emerald-400">🏛️ Master Aldric</h3>
              <button onClick={() => { setShowMentor(false); speechSynthesis?.cancel(); }} className="text-gray-400 hover:text-white">✕</button>
            </div>
            {mentorMsg && <p className="text-sm bg-gray-700/50 p-2 rounded mb-3 max-h-28 overflow-y-auto">{mentorMsg}</p>}
            <div className="flex gap-2">
              <input value={mentorQ} onChange={e => setMentorQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && askMentor(mentorQ)}
                placeholder="Ask for advice..." className="flex-1 px-3 py-2 bg-gray-700 rounded text-sm" />
              <button onClick={() => askMentor(mentorQ)} disabled={busy} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 rounded font-bold text-sm">Ask</button>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {['Tower tips?', 'Material combos?', 'Make it fancy?'].map(q => (
                <button key={q} onClick={() => askMentor(q)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">{q}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quests modal */}
      {showQuests && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-4 rounded-lg max-w-sm w-full text-white max-h-[80vh] overflow-y-auto border border-purple-600/30">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-purple-400">🏆 Challenges</h3>
              <button onClick={() => setShowQuests(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2">
              {CHALLENGES.map(c => {
                const ok = done.includes(c.id);
                return (
                  <div key={c.id} className={`p-2 rounded ${ok ? 'bg-green-900/40 border border-green-600/30' : 'bg-gray-700/50'}`}>
                    <div className="flex justify-between">
                      <span className={ok ? 'line-through text-gray-500' : ''}>{c.name}</span>
                      <span className="text-yellow-400 text-sm">+{c.reward}💰</span>
                    </div>
                    <p className="text-xs text-gray-400">{c.desc}</p>
                    {ok && <span className="text-green-400 text-xs">✓ Complete!</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shop modal */}
      {showShop && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-4 rounded-lg max-w-sm w-full text-white border border-blue-600/30">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-blue-400">🛒 Material Shop</h3>
              <button onClick={() => setShowShop(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <p className="text-yellow-400 mb-3 text-lg">💰 {gold}</p>
            <div className="space-y-2">
              {[
                { tier: 2, name: 'Premium Pack', cost: 200, desc: 'Marble, Glass, Ice, Obsidian, Purple' },
                { tier: 3, name: 'Royal Pack', cost: 500, desc: 'Gold, Ruby, Emerald, Glowstone, Fairy' },
                { tier: 4, name: 'Legendary Pack', cost: 1000, desc: 'Magic Lantern, Dragon Scale' },
              ].map(p => {
                const owned = tiers.includes(p.tier);
                return (
                  <div key={p.tier} className={`p-3 rounded ${owned ? 'bg-green-900/30 border border-green-600/30' : 'bg-gray-700/50'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.desc}</div>
                      </div>
                      {owned ? <span className="text-green-400">✓</span> : (
                        <button onClick={() => buyTier(p.tier, p.cost)} disabled={gold < p.cost}
                          className={`px-3 py-1 rounded font-bold text-sm ${gold >= p.cost ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-gray-600 text-gray-500 cursor-not-allowed'}`}>
                          {p.cost}💰
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
