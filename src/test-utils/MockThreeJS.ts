/**
 * MockThreeJS - Test utilities for mocking Three.js objects
 *
 * Provides lightweight mocks for Vector3, Quaternion, Scene, Camera, etc.
 * Used to test services without full Three.js dependency.
 */

export class MockVector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  set(x: number, y: number, z: number): this {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  copy(v: MockVector3): this {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    return this
  }

  clone(): MockVector3 {
    return new MockVector3(this.x, this.y, this.z)
  }

  add(v: MockVector3): this {
    this.x += v.x
    this.y += v.y
    this.z += v.z
    return this
  }

  sub(v: MockVector3): this {
    this.x -= v.x
    this.y -= v.y
    this.z -= v.z
    return this
  }

  multiplyScalar(s: number): this {
    this.x *= s
    this.y *= s
    this.z *= s
    return this
  }

  normalize(): this {
    const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
    if (length > 0) {
      this.x /= length
      this.y /= length
      this.z /= length
    }
    return this
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
  }

  distanceTo(v: MockVector3): number {
    const dx = this.x - v.x
    const dy = this.y - v.y
    const dz = this.z - v.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  equals(v: MockVector3): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z]
  }
}

export class MockQuaternion {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}

  set(x: number, y: number, z: number, w: number): this {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
    return this
  }

  copy(q: MockQuaternion): this {
    this.x = q.x
    this.y = q.y
    this.z = q.z
    this.w = q.w
    return this
  }

  clone(): MockQuaternion {
    return new MockQuaternion(this.x, this.y, this.z, this.w)
  }

  setFromEuler(euler: { x: number; y: number; z: number }): this {
    // Simplified euler to quaternion conversion (XYZ order)
    const c1 = Math.cos(euler.x / 2)
    const c2 = Math.cos(euler.y / 2)
    const c3 = Math.cos(euler.z / 2)
    const s1 = Math.sin(euler.x / 2)
    const s2 = Math.sin(euler.y / 2)
    const s3 = Math.sin(euler.z / 2)

    this.x = s1 * c2 * c3 + c1 * s2 * s3
    this.y = c1 * s2 * c3 - s1 * c2 * s3
    this.z = c1 * c2 * s3 + s1 * s2 * c3
    this.w = c1 * c2 * c3 - s1 * s2 * s3

    return this
  }
}

export class MockEuler {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public order: string = 'XYZ'
  ) {}

  set(x: number, y: number, z: number): this {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  copy(e: MockEuler): this {
    this.x = e.x
    this.y = e.y
    this.z = e.z
    this.order = e.order
    return this
  }
}

export class MockObject3D {
  position = new MockVector3()
  rotation = new MockEuler()
  quaternion = new MockQuaternion()
  scale = new MockVector3(1, 1, 1)
  visible = true
  children: MockObject3D[] = []
  parent: MockObject3D | null = null

  add(object: MockObject3D): this {
    object.parent = this
    this.children.push(object)
    return this
  }

  remove(object: MockObject3D): this {
    const index = this.children.indexOf(object)
    if (index !== -1) {
      object.parent = null
      this.children.splice(index, 1)
    }
    return this
  }

  traverse(callback: (object: MockObject3D) => void): void {
    callback(this)
    this.children.forEach(child => child.traverse(callback))
  }
}

export class MockScene extends MockObject3D {
  background: any = null
  fog: any = null
}

export class MockCamera extends MockObject3D {
  fov = 75
  aspect = 1
  near = 0.1
  far = 1000

  updateProjectionMatrix(): void {
    // No-op for mock
  }

  getWorldDirection(target: MockVector3): MockVector3 {
    // Return forward direction (simplified)
    target.set(0, 0, -1)
    return target
  }
}

export class MockMesh extends MockObject3D {
  geometry: any = null
  material: any = null

  constructor(geometry?: any, material?: any) {
    super()
    this.geometry = geometry
    this.material = material
  }
}

export class MockRaycaster {
  ray = {
    origin: new MockVector3(),
    direction: new MockVector3()
  }

  set(origin: MockVector3, direction: MockVector3): void {
    this.ray.origin.copy(origin)
    this.ray.direction.copy(direction)
  }

  setFromCamera(_coords: { x: number; y: number }, _camera: MockCamera): void {
    // Set ray from camera center for mock
    this.ray.origin.set(0, 0, 0)
    this.ray.direction.set(0, 0, -1)
  }

  intersectObjects(_objects: MockObject3D[], _recursive?: boolean): any[] {
    // Return empty array by default
    return []
  }
}

/**
 * Factory function to create a minimal mock scene setup
 */
export function createMockSceneSetup() {
  const scene = new MockScene()
  const camera = new MockCamera()
  camera.position.set(0, 100, 0)

  return { scene, camera }
}
