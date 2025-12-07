// src/modules/environment/adapters/ThreeSkyAdapter.ts
import * as THREE from 'three'
import * as SunCalc from 'suncalc'
import { TimeCycle } from '../domain/TimeCycle'

export class ThreeSkyAdapter {
  private sunLight: THREE.DirectionalLight
  private lastUpdate = 0
  
  // Location (Default: San Francisco)
  latitude: number = 37.7749
  longitude: number = -122.4194

  // Sun times (calculated)
  sunriseTod: number = 6
  sunsetTod: number = 18
  goldenHourMorning: number = 7
  goldenHourEvening: number = 17

  constructor(
    private scene: THREE.Scene, 
    private camera: THREE.Camera,
    private timeCycle: TimeCycle
  ) {
    this.createSunLight()
    this.requestLocation()
  }

  private createSunLight() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.sunLight.position.set(100, 100, 100)
    this.sunLight.castShadow = true

    // Optimized shadow settings
    this.sunLight.shadow.camera.left = -40
    this.sunLight.shadow.camera.right = 40
    this.sunLight.shadow.camera.top = 40
    this.sunLight.shadow.camera.bottom = -40
    this.sunLight.shadow.camera.near = 0.5
    this.sunLight.shadow.camera.far = 300
    this.sunLight.shadow.mapSize.width = 4096
    this.sunLight.shadow.mapSize.height = 4096

    // OPTIMIZED: Reduced bias for voxel blocks (increased slightly)
    this.sunLight.shadow.bias = -0.0005
    // Add normal bias to help with shadow acne on flat surfaces
    this.sunLight.shadow.normalBias = 0.05

    this.scene.add(this.sunLight)
    console.log('☀️ Sun directional light added (4096px shadow map with adjusted bias)')
  }

  update(): void {
    // Update every 1 second to smooth out transitions without overloading
    if (Date.now() - this.lastUpdate > 1000) {
      this.updateLighting()
      this.lastUpdate = Date.now()
    }
  }

  updateLighting(): void {
    // 1. Calculate Sun Times for current date
    const date = this.timeCycle.getDate()
    this.calculateSunTimes(date)

    // 2. Get intensity & color based on time
    const skyColor = this.calculateSkyColor()
    const ambientIntensity = this.calculateAmbientIntensity()

    // 3. Apply to Scene
    this.scene.background = skyColor
    
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color = skyColor
    } else {
      this.scene.fog = new THREE.Fog(skyColor, 1, 400)
    }

    const ambientLight = this.scene.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight
    if (ambientLight) ambientLight.intensity = ambientIntensity

    // Point lights (fill)
    this.scene.children.filter(c => c instanceof THREE.PointLight).forEach(l => {
      (l as THREE.PointLight).intensity = ambientIntensity * 0.3
    })

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
    if (time < sunriseStart || time >= sunsetEnd) return new THREE.Color(0x0a1929)

    // Sunrise
    if (time >= sunriseStart && time < sunriseEnd) {
      const t = (time - sunriseStart) / (sunriseEnd - sunriseStart)
      // Golden Hour check
      if (time >= this.goldenHourMorning && time < this.sunriseTod + 0.5) {
         return new THREE.Color().lerpColors(new THREE.Color(0xff9d6e), new THREE.Color(0xffc896), t)
      }
      return new THREE.Color().lerpColors(new THREE.Color(0x0a1929), new THREE.Color(0x87ceeb), t)
    }

    // Day
    if (time >= sunriseEnd && time < sunsetStart) return new THREE.Color(0x87ceeb)

    // Sunset
    if (time >= sunsetStart && time < sunsetEnd) {
      const t = (time - sunsetStart) / (sunsetEnd - sunsetStart)
      // Golden Hour check
      if (time >= this.sunsetTod - 0.5 && time < this.goldenHourEvening) {
         return new THREE.Color().lerpColors(new THREE.Color(0xff6b35), new THREE.Color(0xcc4125), t)
      }
      return new THREE.Color().lerpColors(new THREE.Color(0x87ceeb), new THREE.Color(0x0a1929), t)
    }

    return new THREE.Color(0x87ceeb)
  }

  private calculateAmbientIntensity(): number {
    const time = this.timeCycle.getDecimalTime()
    const sunriseStart = this.sunriseTod - 1
    const sunriseEnd = this.sunriseTod + 1
    const sunsetStart = this.sunsetTod - 1
    const sunsetEnd = this.sunsetTod + 1

    if (time < sunriseStart || time >= sunsetEnd) return 0.2
    if (time >= sunriseEnd && time < sunsetStart) return 1.0
    
    // Transition
    if (time >= sunriseStart && time < sunriseEnd) {
      return 0.2 + ((time - sunriseStart) / (sunriseEnd - sunriseStart)) * 0.8
    }
    if (time >= sunsetStart && time < sunsetEnd) {
      return 1.0 - ((time - sunsetStart) / (sunsetEnd - sunsetStart)) * 0.8
    }
    return 1.0
  }

  private updateSunPosition(date: Date): void {
    const pos = SunCalc.getPosition(date, this.latitude, this.longitude)
    const azimuth = pos.azimuth
    const altitude = pos.altitude

    // Follow player
    const playerPos = this.camera.position
    this.sunLight.target.position.set(playerPos.x, playerPos.y, playerPos.z)
    this.sunLight.target.updateMatrixWorld()

    if (altitude > 0) {
      const dist = 200
      // Convert spherical to Cartesian (Three.js Y-up)
      // SunCalc: azimuth from SOUTH (-PI to PI, positive is East)
      // Three.js: +X = East, +Y = Up, +Z = South
      const x = dist * Math.cos(altitude) * Math.sin(azimuth) + playerPos.x
      const y = dist * Math.sin(altitude) + playerPos.y
      const z = dist * Math.cos(altitude) * Math.cos(azimuth) + playerPos.z

      this.sunLight.position.set(x, y, z)
      this.sunLight.intensity = Math.max(0.3, Math.sin(altitude))
      this.sunLight.color = this.getSunColor(altitude)
    } else {
      this.sunLight.intensity = 0
    }
  }

  private getSunColor(altitude: number): THREE.Color {
    const deg = altitude * 180 / Math.PI
    if (deg <= 0) return new THREE.Color(0xffffff)
    if (deg < 15) {
      return new THREE.Color().lerpColors(new THREE.Color(0xffaa66), new THREE.Color(0xffffff), deg / 15)
    }
    return new THREE.Color(0xffffff)
  }
}
