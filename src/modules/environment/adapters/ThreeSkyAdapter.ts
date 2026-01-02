// src/modules/environment/adapters/ThreeSkyAdapter.ts
import * as THREE from 'three'
import * as SunCalc from 'suncalc'
import { TimeCycle } from '../domain/TimeCycle'

export class ThreeSkyAdapter {
  private sunLight: THREE.DirectionalLight
  private sunMesh: THREE.Mesh
  private lastUpdate = 0
  private isUnderwater = false

  // Cached light references to avoid scene.children.filter() every frame
  private hemiLight: THREE.HemisphereLight | null = null
  private pointLights: THREE.PointLight[] = []
  private lightsCached = false

  // SunCalc result caching - only recalculate when minute changes
  private lastSunCalcMinute = -1
  private cachedSunPosition: { azimuth: number, altitude: number } | null = null

  // Throttle lighting updates to reduce CPU (100ms = 10 updates/sec)
  private readonly LIGHTING_UPDATE_INTERVAL_MS = 100
  private lastLightingUpdate = 0

  // Cache day for sun times calculation (only needs update once per day)
  private lastSunTimesDay = -1

  // Underwater fog settings
  private readonly UNDERWATER_FOG_COLOR = 0x1a5f7a  // Teal blue
  private readonly UNDERWATER_FOG_NEAR = 0.5
  private readonly UNDERWATER_FOG_FAR = 30  // Very short visibility underwater
  private readonly NORMAL_FOG_NEAR = 1
  private readonly NORMAL_FOG_FAR = 400

  // Location (Default: San Francisco)
  latitude: number = 37.7749
  longitude: number = -122.4194

  // Sun times (calculated)
  sunriseTod: number = 6
  sunsetTod: number = 18
  goldenHourMorning: number = 7
  goldenHourEvening: number = 17

  // Pre-allocated colors to avoid GC pressure (reused every frame)
  private readonly skyColorResult = new THREE.Color()
  private readonly sunColorResult = new THREE.Color()
  private readonly groundColorResult = new THREE.Color()
  private readonly lerpColorA = new THREE.Color()
  private readonly lerpColorB = new THREE.Color()

  // Pre-defined color constants (avoid creating on each call)
  private readonly COLOR_NIGHT = 0x0a1929
  private readonly COLOR_DAY = 0x99ddff
  private readonly COLOR_GOLDEN_MORNING_START = 0xff9d6e
  private readonly COLOR_GOLDEN_MORNING_END = 0xffc896
  private readonly COLOR_SUNSET_START = 0xff6b35
  private readonly COLOR_SUNSET_END = 0xcc4125
  private readonly COLOR_GROUND_NIGHT = 0x111111
  private readonly COLOR_GROUND_DAY = 0x554433
  private readonly COLOR_SUN_LOW = 0xffaa66
  private readonly COLOR_SUN_HIGH = 0xffffff

  constructor(
    private scene: THREE.Scene, 
    private camera: THREE.Camera,
    private timeCycle: TimeCycle
  ) {
    this.createSunLight()
    this.createSunMesh()
    this.requestLocation()
  }

  private createSunMesh() {
      const geometry = new THREE.SphereGeometry(5, 32, 32)
      const material = new THREE.MeshBasicMaterial({ color: 0xffffaa })
      this.sunMesh = new THREE.Mesh(geometry, material)
      this.scene.add(this.sunMesh)
  }

  private createSunLight() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.0) // Boost intensity for Tone Mapping
    this.sunLight.position.set(100, 100, 100)
    this.sunLight.castShadow = true

    // Optimized shadow settings
    const shadowSize = 160 // Covers 6 chunks diameter (render distance 3)
    this.sunLight.shadow.camera.left = -shadowSize / 2
    this.sunLight.shadow.camera.right = shadowSize / 2
    this.sunLight.shadow.camera.top = shadowSize / 2
    this.sunLight.shadow.camera.bottom = -shadowSize / 2
    this.sunLight.shadow.camera.near = 0.5
    this.sunLight.shadow.camera.far = 300
    // OPTIMIZED: Reduced from 4096 to 2048 (4x less pixels to render per frame)
    this.sunLight.shadow.mapSize.width = 2048
    this.sunLight.shadow.mapSize.height = 2048

    // OPTIMIZED: Reduced bias for voxel blocks
    this.sunLight.shadow.bias = -0.0001
    // Voxel geometry is sharp, normalBias causes peter-panning. Disable it.
    this.sunLight.shadow.normalBias = 0.0

    this.scene.add(this.sunLight)
    console.log('☀️ Sun directional light added (2048px shadow map - optimized for CPU)')
  }

  update(): void {
    // OPTIMIZED: Throttle lighting updates to 10/sec instead of 60/sec
    // Sun position changes slowly, no need to recalculate every frame
    const now = performance.now()
    if (now - this.lastLightingUpdate >= this.LIGHTING_UPDATE_INTERVAL_MS) {
      this.lastLightingUpdate = now
      this.updateLighting()
    }
  }

  /**
   * Set underwater mode - changes fog to blue tint with short visibility
   */
  setUnderwater(underwater: boolean): void {
    if (this.isUnderwater === underwater) return
    this.isUnderwater = underwater

    if (underwater) {
      // Switch to underwater fog
      const underwaterColor = new THREE.Color(this.UNDERWATER_FOG_COLOR)
      this.scene.fog = new THREE.Fog(underwaterColor, this.UNDERWATER_FOG_NEAR, this.UNDERWATER_FOG_FAR)
      this.scene.background = underwaterColor
    } else {
      // Restore normal sky fog
      this.updateLighting()
    }
  }

  getIsUnderwater(): boolean {
    return this.isUnderwater
  }

  updateLighting(): void {
    // 1. Calculate Sun Times for current date
    const date = this.timeCycle.getDate()
    this.calculateSunTimes(date)

    // 2. Get intensity & color based on time
    const skyColor = this.calculateSkyColor()
    const ambientIntensity = this.calculateAmbientIntensity()

    // 3. Apply to Scene (skip if underwater - underwater has its own fog)
    if (!this.isUnderwater) {
      this.scene.background = skyColor

      if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
        this.scene.fog.color = skyColor
        this.scene.fog.near = this.NORMAL_FOG_NEAR
        this.scene.fog.far = this.NORMAL_FOG_FAR
      } else {
        this.scene.fog = new THREE.Fog(skyColor, this.NORMAL_FOG_NEAR, this.NORMAL_FOG_FAR)
      }
    }

    // OPTIMIZED: Cache light references instead of filtering scene.children every frame
    if (!this.lightsCached) {
      this.hemiLight = this.scene.children.find(c => c instanceof THREE.HemisphereLight) as THREE.HemisphereLight | null
      this.pointLights = this.scene.children.filter(c => c instanceof THREE.PointLight) as THREE.PointLight[]
      this.lightsCached = true
    }

    // Update Hemisphere Light
    if (this.hemiLight) {
        this.hemiLight.intensity = ambientIntensity
        this.hemiLight.color.copy(skyColor) // Sky color comes from above

        // Ground color: Darker version of sky or earthy tone?
        // Simple heuristic: Mix sky with ground tone
        // Night: Black/Dark Blue. Day: Brown/Green.
        const isNight = ambientIntensity < 0.3
        if (isNight) {
            this.hemiLight.groundColor.setHex(this.COLOR_GROUND_NIGHT)
        } else {
            // Reuse pre-allocated color for lerp
            this.groundColorResult.setHex(this.COLOR_GROUND_DAY)
            this.hemiLight.groundColor.copy(this.groundColorResult.lerp(skyColor, 0.5))
        }
    }

    // Point lights (fill) - use cached array
    for (const light of this.pointLights) {
      light.intensity = ambientIntensity * 0.3
    }

    // 4. Update Sun Position
    this.updateSunPosition(date)
  }

  private requestLocation(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.latitude = pos.coords.latitude
          this.longitude = pos.coords.longitude
          console.log(`📍 Location synced: ${this.latitude.toFixed(2)}, ${this.longitude.toFixed(2)}`)
          this.updateLighting()
        },
        () => console.log('📍 Location denied, using default (SF)')
      )
    }
  }

  private calculateSunTimes(date: Date): void {
    // OPTIMIZED: Only recalculate sun times when day changes
    const currentDay = date.getDate()
    if (currentDay === this.lastSunTimesDay) return
    this.lastSunTimesDay = currentDay

    const times = SunCalc.getTimes(date, this.latitude, this.longitude)
    this.sunriseTod = times.sunrise.getHours() + times.sunrise.getMinutes() / 60
    this.sunsetTod = times.sunset.getHours() + times.sunset.getMinutes() / 60
    this.goldenHourMorning = times.goldenHourEnd.getHours() + times.goldenHourEnd.getMinutes() / 60
    this.goldenHourEvening = times.goldenHour.getHours() + times.goldenHour.getMinutes() / 60
  }

  private calculateSkyColor(): THREE.Color {
    const time = this.timeCycle.getDecimalTime()
    const sunriseStart = this.sunriseTod - 1
    const sunriseEnd = this.sunriseTod + 1
    const sunsetStart = this.sunsetTod - 1
    const sunsetEnd = this.sunsetTod + 1

    // Night
    if (time < sunriseStart || time >= sunsetEnd) {
      return this.skyColorResult.setHex(this.COLOR_NIGHT)
    }

    // Sunrise
    if (time >= sunriseStart && time < sunriseEnd) {
      const t = (time - sunriseStart) / (sunriseEnd - sunriseStart)
      // Golden Hour check
      if (time >= this.goldenHourMorning && time < this.sunriseTod + 0.5) {
        this.lerpColorA.setHex(this.COLOR_GOLDEN_MORNING_START)
        this.lerpColorB.setHex(this.COLOR_GOLDEN_MORNING_END)
        return this.skyColorResult.lerpColors(this.lerpColorA, this.lerpColorB, t)
      }
      this.lerpColorA.setHex(this.COLOR_NIGHT)
      this.lerpColorB.setHex(this.COLOR_DAY)
      return this.skyColorResult.lerpColors(this.lerpColorA, this.lerpColorB, t)
    }

    // Day
    if (time >= sunriseEnd && time < sunsetStart) {
      return this.skyColorResult.setHex(this.COLOR_DAY)
    }

    // Sunset
    if (time >= sunsetStart && time < sunsetEnd) {
      const t = (time - sunsetStart) / (sunsetEnd - sunsetStart)
      // Golden Hour check
      if (time >= this.sunsetTod - 0.5 && time < this.goldenHourEvening) {
        this.lerpColorA.setHex(this.COLOR_SUNSET_START)
        this.lerpColorB.setHex(this.COLOR_SUNSET_END)
        return this.skyColorResult.lerpColors(this.lerpColorA, this.lerpColorB, t)
      }
      this.lerpColorA.setHex(this.COLOR_DAY)
      this.lerpColorB.setHex(this.COLOR_NIGHT)
      return this.skyColorResult.lerpColors(this.lerpColorA, this.lerpColorB, t)
    }

    return this.skyColorResult.setHex(this.COLOR_DAY)
  }

  private calculateAmbientIntensity(): number {
    const time = this.timeCycle.getDecimalTime()
    const sunriseStart = this.sunriseTod - 1
    const sunriseEnd = this.sunriseTod + 1
    const sunsetStart = this.sunsetTod - 1
    const sunsetEnd = this.sunsetTod + 1

    if (time < sunriseStart || time >= sunsetEnd) return 0.3 // Night base
    if (time >= sunriseEnd && time < sunsetStart) return 0.8 // Reduce Day Ambient for more contrast
    
    // Transition
    if (time >= sunriseStart && time < sunriseEnd) {
      return 0.3 + ((time - sunriseStart) / (sunriseEnd - sunriseStart)) * 0.5
    }
    if (time >= sunsetStart && time < sunsetEnd) {
      return 0.8 - ((time - sunsetStart) / (sunsetEnd - sunsetStart)) * 0.5
    }
    return 0.8
  }

  private updateSunPosition(date: Date): void {
    // OPTIMIZED: Cache SunCalc results - only recalculate when minute changes
    // SunCalc.getPosition() involves expensive trigonometry
    const currentMinute = date.getHours() * 60 + date.getMinutes()
    if (currentMinute !== this.lastSunCalcMinute || !this.cachedSunPosition) {
      this.cachedSunPosition = SunCalc.getPosition(date, this.latitude, this.longitude)
      this.lastSunCalcMinute = currentMinute
    }
    const azimuth = this.cachedSunPosition.azimuth
    const altitude = this.cachedSunPosition.altitude

    // Follow player with SNAPPING to prevent shadow swimming
    // Snap to 1-block increments (or larger power of 2 like 8 or 16 for stability)
    // A snap of 1 unit is usually enough if map size is high.
    const snap = 1 
    const playerPos = this.camera.position
    const targetX = Math.round(playerPos.x / snap) * snap
    const targetZ = Math.round(playerPos.z / snap) * snap
    
    this.sunLight.target.position.set(targetX, 0, targetZ)
    this.sunLight.target.updateMatrixWorld()

    if (altitude > 0) {
      const dist = 200
      // Convert spherical to Cartesian (Three.js Y-up)
      // SunCalc: azimuth from SOUTH (-PI to PI, positive is East)
      // Three.js: +X = East, +Y = Up, +Z = South
      const x = dist * Math.cos(altitude) * Math.sin(azimuth) + targetX
      const y = dist * Math.sin(altitude)
      const z = dist * Math.cos(altitude) * Math.cos(azimuth) + targetZ

      this.sunLight.position.set(x, y, z)
      this.sunLight.intensity = Math.max(0.3, Math.sin(altitude)) * 2.5 // Boost intensity
      this.sunLight.color = this.getSunColor(altitude)
      
      // Update Visual Sun Mesh
      // Place it further away than the light so it looks like skybox
      const sunDist = 400
      const sx = sunDist * Math.cos(altitude) * Math.sin(azimuth) + playerPos.x
      const sy = sunDist * Math.sin(altitude) + playerPos.y
      const sz = sunDist * Math.cos(altitude) * Math.cos(azimuth) + playerPos.z
      this.sunMesh.position.set(sx, sy, sz)
      this.sunMesh.visible = true
      
    } else {
      this.sunLight.intensity = 0
      this.sunMesh.visible = false
    }
  }

  private getSunColor(altitude: number): THREE.Color {
    const deg = altitude * 180 / Math.PI
    if (deg <= 0) {
      return this.sunColorResult.setHex(this.COLOR_SUN_HIGH)
    }
    if (deg < 15) {
      this.lerpColorA.setHex(this.COLOR_SUN_LOW)
      this.lerpColorB.setHex(this.COLOR_SUN_HIGH)
      return this.sunColorResult.lerpColors(this.lerpColorA, this.lerpColorB, deg / 15)
    }
    return this.sunColorResult.setHex(this.COLOR_SUN_HIGH)
  }
}
