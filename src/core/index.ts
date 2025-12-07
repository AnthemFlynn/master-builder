import * as THREE from 'three'
import TimeOfDay from './TimeOfDay'

export default class Core {
  constructor() {
    this.camera = new THREE.PerspectiveCamera()
    this.renderer = new THREE.WebGLRenderer()
    this.scene = new THREE.Scene()
    this.initScene()
    this.initRenderer()
    this.initCamera() // Now initializes TimeOfDay with camera
  }

  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  renderer: THREE.Renderer
  timeOfDay!: TimeOfDay // Initialized in initCamera()

  initCamera = () => {
    this.camera.fov = 50
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.near = 0.01
    this.camera.far = 500
    this.camera.updateProjectionMatrix()
    this.camera.position.set(12, 32, 12)
    this.camera.lookAt(12, 32, 0)

    // Initialize TimeOfDay after camera is set up
    this.timeOfDay = new TimeOfDay(this.scene, this.camera)

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })
  }

  initScene = () => {
    this.scene = new THREE.Scene()
    const backgroundColor = 0x87ceeb

    this.scene.fog = new THREE.Fog(backgroundColor, 1, 400)
    this.scene.background = new THREE.Color(backgroundColor)

    const sunLight = new THREE.PointLight(0xffffff, 0.5)
    sunLight.position.set(500, 500, 500)
    this.scene.add(sunLight)

    const sunLight2 = new THREE.PointLight(0xffffff, 0.2)
    sunLight2.position.set(-500, 500, -500)
    this.scene.add(sunLight2)

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
    const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x8b4513, 0.6)
    this.scene.add(ambientLight)
    this.scene.add(hemiLight)
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
