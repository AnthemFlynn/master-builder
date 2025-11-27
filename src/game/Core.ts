import * as THREE from 'three';

export default class Core {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;

  constructor(canvas: HTMLCanvasElement) {
    this.camera = this.initCamera();
    this.renderer = this.initRenderer(canvas);
    this.scene = this.initScene();

    window.addEventListener('resize', this.onResize);
  }

  private initCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(8, 50, 8);
    camera.lookAt(100, 30, 100);
    return camera;
  }

  private initRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    return renderer;
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 1, 96);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Point lights (simulating sun)
    const light1 = new THREE.PointLight(0xffffff, 0.6, 0);
    light1.position.set(50, 100, 50);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 0.6, 0);
    light2.position.set(-50, 100, -50);
    scene.add(light2);

    return scene;
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
