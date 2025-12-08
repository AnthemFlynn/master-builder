import * as THREE from 'three'
import { EventBus } from '../../game/infrastructure/EventBus'

export class AudioService {
  private listener: THREE.AudioListener
  private sounds = new Map<string, THREE.Audio>()
  private bgm: THREE.Audio | null = null
  private disabled = false

  constructor(
    camera: THREE.Camera,
    private eventBus: EventBus
  ) {
    this.listener = new THREE.AudioListener()
    camera.add(this.listener)

    this.setupEventListeners()
    this.loadSounds()
  }

  private setupEventListeners(): void {
    // Listen for block placed
    this.eventBus.on('world', 'BlockPlacedEvent', (event: any) => {
      if (event.blockType !== undefined) {
        this.playBlockSound(event.blockType)
      }
    })

    // Listen for block removed
    this.eventBus.on('world', 'BlockRemovedEvent', (event: any) => {
      if (event.blockType !== undefined) {
        this.playBlockSound(event.blockType)
      }
    })

    // Listen for UI state changes
    this.eventBus.on('ui', 'UIStateChangedEvent', (event: any) => {
      if (event.newState === 'PLAYING' && this.bgm && !this.disabled) {
        this.bgm.play()
      } else if (this.bgm) {
        this.bgm.pause()
      }
    })
  }

  private loadSounds(): void {
    // Load background music
    const audioLoader = new THREE.AudioLoader()

    // BGM would be loaded here
    // audioLoader.load('/path/to/music.ogg', (buffer) => {
    //   this.bgm = new THREE.Audio(this.listener)
    //   this.bgm.setBuffer(buffer)
    //   this.bgm.setVolume(0.1)
    //   this.bgm.setLoop(true)
    // })

    // Load block sounds
    this.loadBlockSounds(audioLoader)
  }

  private loadBlockSounds(loader: THREE.AudioLoader): void {
    const blockSounds = [
      { name: 'grass', paths: ['grass1.ogg', 'grass2.ogg', 'grass3.ogg', 'grass4.ogg'] },
      { name: 'stone', paths: ['stone1.ogg', 'stone2.ogg', 'stone3.ogg', 'stone4.ogg'] },
      { name: 'wood', paths: ['tree1.ogg', 'tree2.ogg', 'tree3.ogg', 'tree4.ogg'] },
      { name: 'dirt', paths: ['dirt1.ogg', 'dirt2.ogg', 'dirt3.ogg', 'dirt4.ogg'] }
    ]

    // Load each sound variant
    for (const blockSound of blockSounds) {
      for (const path of blockSound.paths) {
        // loader.load(`/audio/blocks/${path}`, (buffer) => {
        //   const audio = new THREE.Audio(this.listener)
        //   audio.setBuffer(buffer)
        //   audio.setVolume(0.15)
        //   this.sounds.set(`${blockSound.name}_${path}`, audio)
        // })
      }
    }
  }

  playSound(soundName: string): void {
    if (this.disabled) return

    const sound = this.sounds.get(soundName)
    if (sound && !sound.isPlaying) {
      sound.play()
    }
  }

  playBlockSound(blockType: number): void {
    // Map block type to sound category
    const soundMap: Record<number, string> = {
      0: 'grass', // BlockType.grass
      1: 'stone', // BlockType.sand
      2: 'wood',  // BlockType.tree
      3: 'grass', // BlockType.leaf
      4: 'dirt',  // BlockType.dirt
      5: 'stone'  // BlockType.stone
    }

    const soundCategory = soundMap[blockType]
    if (soundCategory) {
      // Play random variant
      const variant = Math.floor(Math.random() * 4) + 1
      this.playSound(`${soundCategory}_${variant}`)
    }
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled
    if (disabled && this.bgm) {
      this.bgm.pause()
    }
  }
}
