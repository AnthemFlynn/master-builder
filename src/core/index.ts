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
    this.camera.near = 0.01
    this.camera.far = 500
    this.camera.updateProjectionMatrix()
    this.camera.position.set(12, 32, 12)
    this.camera.lookAt(12, 32, 0)

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

    document.body.appendChild(this.renderer.domElement)

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })

    console.log('🎨 Renderer initialized with shadow mapping')
  }
}
