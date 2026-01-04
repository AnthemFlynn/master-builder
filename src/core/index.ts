import * as THREE from 'three'

export default class Core {
  constructor() {
    this.camera = new THREE.PerspectiveCamera()
    this.renderer = new THREE.WebGLRenderer()
    this.scene = new THREE.Scene()
    this.initScene()
    this.initRenderer()
    this.initCamera()
  }

  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  renderer: THREE.Renderer

  initCamera = () => {
    this.camera.fov = 50
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.near = 0.1  // Increased from 0.01 to fix Z-fighting (depth buffer precision)
    this.camera.far = 500
    this.camera.updateProjectionMatrix()
    // Spawn higher to be above new terrain generation (terrain ~35-60, trees can reach ~65)
    this.camera.position.set(12, 120, 12)
    // Look toward the horizon (same Y level, far away) for better first impression
    this.camera.lookAt(100, 120, 100)

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })
  }

  initScene = () => {
    this.scene = new THREE.Scene()
    // Lighting is now handled by EnvironmentService
  }

  initRenderer = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    // Enable shadow mapping
    const webGLRenderer = this.renderer as THREE.WebGLRenderer
    webGLRenderer.shadowMap.enabled = true
    webGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap // Soft shadows
    
    // Color Management (Fixes "Dull/Cloudy" look)
    webGLRenderer.outputColorSpace = THREE.SRGBColorSpace
    webGLRenderer.toneMapping = THREE.ACESFilmicToneMapping
    webGLRenderer.toneMappingExposure = 1.0

    document.body.appendChild(this.renderer.domElement)

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })

    console.log('🎨 Renderer initialized with shadow mapping')
  }

  /**
   * Get the WebGL renderer for post-processing
   */
  getWebGLRenderer(): THREE.WebGLRenderer {
    return this.renderer as THREE.WebGLRenderer
  }
}
