import * as THREE from 'three'
import * as SunCalc from 'suncalc'

export default class TimeOfDay {
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene
    this.camera = camera
    this.createSunLight()
    this.requestLocation()
    this.updateLighting()
  }

  scene: THREE.Scene
  camera: THREE.Camera
  overrideHour: number | null = null
  overrideMinute: number | null = null
  overrideMonth: number | null = null // 1-12
  overrideDay: number | null = null   // 1-31
  overrideYear: number | null = null  // Full year
  timeScale = 1.0 // 1.0 = real-time, higher = faster

  // Sun directional light
  sunLight: THREE.DirectionalLight

  // Location data (default: San Francisco)
  latitude: number = 37.7749
  longitude: number = -122.4194
  sunriseTod: number = 6 // Will be calculated from location
  sunsetTod: number = 18 // Will be calculated from location
  goldenHourMorning: number = 7
  goldenHourEvening: number = 17

  // Location presets for testing
  private locationPresets = [
    { name: 'Equator (Quito)', lat: 0, lon: -78.5 },
    { name: 'Tropic (Mumbai)', lat: 19, lon: 73 },
    { name: 'Mid-Latitude (Portland)', lat: 45, lon: -122 },
    { name: 'Arctic (Reykjavik)', lat: 64, lon: -22 }
  ]
  private currentPresetIndex = 2 // Start with Portland

  // Create directional light for sun
  createSunLight() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.sunLight.position.set(100, 100, 100)
    this.sunLight.castShadow = true

    // OPTIMIZED: Tighter shadow camera for sharper shadows
    this.sunLight.shadow.camera.left = -40
    this.sunLight.shadow.camera.right = 40
    this.sunLight.shadow.camera.top = 40
    this.sunLight.shadow.camera.bottom = -40
    this.sunLight.shadow.camera.near = 0.5
    this.sunLight.shadow.camera.far = 300

    // OPTIMIZED: Higher resolution for crisper shadows
    this.sunLight.shadow.mapSize.width = 4096
    this.sunLight.shadow.mapSize.height = 4096

    // OPTIMIZED: Reduced bias for voxel blocks
    this.sunLight.shadow.bias = -0.0001

    this.scene.add(this.sunLight)

    console.log('☀️ Sun directional light added with optimized shadows (4096px, 40x40 bounds)')
  }

  // Request user's location
  requestLocation() {
    console.log('📍 Using San Francisco (37.77, -122.42) as default location')

    // FIXED: Calculate sun times for default location immediately
    this.calculateSunTimes()

    if ('geolocation' in navigator) {
      console.log('📍 Requesting actual location permission...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.latitude = position.coords.latitude
          this.longitude = position.coords.longitude
          console.log(`📍 Location updated to: ${this.latitude.toFixed(2)}, ${this.longitude.toFixed(2)}`)
          this.calculateSunTimes()
        },
        (error) => {
          console.log('📍 Location permission denied or unavailable')
          console.log('   Continuing with San Francisco location')
        },
        { timeout: 5000 }
      )
    }
  }

  // Calculate actual sunrise/sunset times for location
  calculateSunTimes() {
    const date = this.getDate()
    const times = SunCalc.getTimes(date, this.latitude, this.longitude)

    this.sunriseTod = times.sunrise.getHours() + times.sunrise.getMinutes() / 60
    this.sunsetTod = times.sunset.getHours() + times.sunset.getMinutes() / 60
    // SunCalc: goldenHourEnd = end of morning golden hour (after sunrise)
    //          goldenHour = start of evening golden hour (before sunset)
    this.goldenHourMorning = times.goldenHourEnd.getHours() + times.goldenHourEnd.getMinutes() / 60
    this.goldenHourEvening = times.goldenHour.getHours() + times.goldenHour.getMinutes() / 60

    console.log(`🌅 Sunrise: ${times.sunrise.toLocaleTimeString()}`)
    console.log(`🌇 Sunset: ${times.sunset.toLocaleTimeString()}`)
    console.log(`✨ Golden Hour Morning (after sunrise): ${times.goldenHourEnd.toLocaleTimeString()}`)
    console.log(`✨ Golden Hour Evening (before sunset): ${times.goldenHour.toLocaleTimeString()}`)

    this.updateLighting()
  }

  // Get current game time
  getTime(): { hour: number; minute: number } {
    const now = new Date()
    const hour = this.overrideHour !== null ? this.overrideHour : now.getHours()
    const minute = this.overrideMinute !== null ? this.overrideMinute : now.getMinutes()
    return { hour, minute }
  }

  // Get current game date
  getDate(): Date {
    const now = new Date()

    if (this.overrideYear !== null || this.overrideMonth !== null || this.overrideDay !== null) {
      const year = this.overrideYear !== null ? this.overrideYear : now.getFullYear()
      const month = this.overrideMonth !== null ? this.overrideMonth - 1 : now.getMonth() // JS months are 0-11
      const day = this.overrideDay !== null ? this.overrideDay : now.getDate()
      const { hour, minute } = this.getTime()

      return new Date(year, month, day, hour, minute, 0, 0)
    }

    const { hour, minute } = this.getTime()
    now.setHours(hour, minute, 0, 0)
    return now
  }

  // Set override hour (null = sync with real time)
  setHour(hour: number | null) {
    if (hour !== null && (hour < 0 || hour > 23)) {
      console.warn('Invalid hour:', hour)
      return
    }
    this.overrideHour = hour
    // When setting hour manually, set minutes to :00 for predictability
    this.overrideMinute = hour !== null ? 0 : null

    const time = this.getTime()
    const hourStr = time.hour.toString().padStart(2, '0')
    const minStr = time.minute.toString().padStart(2, '0')
    if (hour === null) {
      console.log(`🕐 Time synced to real time: ${hourStr}:${minStr}`)
    } else {
      console.log(`🕐 Time set to ${hourStr}:${minStr}`)
    }
    // Force immediate update (don't wait for update() cycle)
    this.lastUpdate = 0
    this.updateLighting()
  }

  // Advance time by 1 hour
  advanceHour() {
    const current = this.overrideHour !== null ? this.overrideHour : new Date().getHours()
    const newHour = (current + 1) % 24
    this.setHour(newHour) // This will set minutes to :00
  }

  // Go back 1 hour
  rewindHour() {
    const current = this.overrideHour !== null ? this.overrideHour : new Date().getHours()
    const newHour = (current - 1 + 24) % 24
    this.setHour(newHour) // This will set minutes to :00
  }

  // Get time as decimal (0-24, e.g., 13.5 = 1:30 PM)
  getDecimalTime(): number {
    const { hour, minute } = this.getTime()
    return hour + minute / 60
  }

  // Calculate sky color based on time (using real sunrise/sunset)
  getSkyColor(): THREE.Color {
    const time = this.getDecimalTime()

    const sunriseStart = this.sunriseTod - 1 // 1 hour before sunrise
    const sunriseEnd = this.sunriseTod + 1 // 1 hour after sunrise
    const sunsetStart = this.sunsetTod - 1 // 1 hour before sunset
    const sunsetEnd = this.sunsetTod + 1 // 1 hour after sunset

    // Night (before sunrise-1h or after sunset+1h)
    if (time < sunriseStart || time >= sunsetEnd) {
      return new THREE.Color(0x0a1929) // Dark blue
    }

    // Sunrise transition (sunrise-1h to sunrise+1h)
    if (time >= sunriseStart && time < sunriseEnd) {
      const duration = sunriseEnd - sunriseStart
      const t = (time - sunriseStart) / duration // 0 to 1

      // Golden hour morning (warm orange/pink)
      if (time >= this.goldenHourMorning && time < this.sunriseTod + 0.5) {
        return new THREE.Color().lerpColors(
          new THREE.Color(0xff9d6e), // Warm orange
          new THREE.Color(0xffc896), // Light orange-pink
          t
        )
      }

      // Normal sunrise
      return new THREE.Color().lerpColors(
        new THREE.Color(0x0a1929), // Night
        new THREE.Color(0x87ceeb), // Day
        t
      )
    }

    // Day (sunrise+1h to sunset-1h)
    if (time >= sunriseEnd && time < sunsetStart) {
      return new THREE.Color(0x87ceeb) // Light blue
    }

    // Sunset transition (sunset-1h to sunset+1h)
    if (time >= sunsetStart && time < sunsetEnd) {
      const duration = sunsetEnd - sunsetStart
      const t = (time - sunsetStart) / duration // 0 to 1

      // Golden hour evening (deep orange/red)
      if (time >= this.sunsetTod - 0.5 && time < this.goldenHourEvening) {
        return new THREE.Color().lerpColors(
          new THREE.Color(0xff6b35), // Deep orange
          new THREE.Color(0xcc4125), // Red-orange
          t
        )
      }

      // Normal sunset
      return new THREE.Color().lerpColors(
        new THREE.Color(0x87ceeb), // Day
        new THREE.Color(0x0a1929), // Night
        t
      )
    }

    return new THREE.Color(0x87ceeb)
  }

  // Calculate ambient light intensity based on time (using real sunrise/sunset)
  getAmbientIntensity(): number {
    const time = this.getDecimalTime()

    const sunriseStart = this.sunriseTod - 1
    const sunriseEnd = this.sunriseTod + 1
    const sunsetStart = this.sunsetTod - 1
    const sunsetEnd = this.sunsetTod + 1

    // Night: 20% brightness
    if (time < sunriseStart || time >= sunsetEnd) {
      return 0.2
    }

    // Sunrise transition
    if (time >= sunriseStart && time < sunriseEnd) {
      const duration = sunriseEnd - sunriseStart
      const t = (time - sunriseStart) / duration
      return 0.2 + t * 0.8 // 0.2 to 1.0
    }

    // Day: 100% brightness
    if (time >= sunriseEnd && time < sunsetStart) {
      return 1.0
    }

    // Sunset transition
    if (time >= sunsetStart && time < sunsetEnd) {
      const duration = sunsetEnd - sunsetStart
      const t = (time - sunsetStart) / duration
      return 1.0 - t * 0.8 // 1.0 to 0.2
    }

    return 1.0
  }

  // Calculate sun position and update directional light
  updateSunPosition() {
    const date = this.getDate()
    const position = SunCalc.getPosition(date, this.latitude, this.longitude)

    // Convert spherical coordinates (azimuth, altitude) to Cartesian (x, y, z)
    const azimuth = position.azimuth // Radians from south
    const altitude = position.altitude // Radians above horizon

    // Make shadow camera follow player
    const playerPos = this.camera.position
    this.sunLight.target.position.set(playerPos.x, playerPos.y, playerPos.z)
    this.sunLight.target.updateMatrixWorld()

    // Only show sun if it's above horizon
    if (altitude > 0) {
      const distance = 200

      // FIXED: Correct spherical to Cartesian conversion
      // SunCalc: azimuth from SOUTH (-π to π), altitude above horizon
      // Three.js: +X = east, +Y = up, +Z = south
      // Negate X and Z to align geographic coords with scene coords
      const x = -distance * Math.cos(altitude) * Math.sin(azimuth) + playerPos.x
      const y = distance * Math.sin(altitude) + playerPos.y
      const z = -distance * Math.cos(altitude) * Math.cos(azimuth) + playerPos.z

      this.sunLight.position.set(x, y, z)
      this.sunLight.intensity = Math.max(0.3, Math.sin(altitude)) // Brighter when higher

      // Apply warm color during golden hours
      this.sunLight.color = this.getSunColor()

      // Debug logging
      const azimuthDeg = (azimuth * 180 / Math.PI).toFixed(1)
      const altitudeDeg = (altitude * 180 / Math.PI).toFixed(1)
      console.log(`☀️ Sun altitude: ${altitudeDeg}° (90° = directly overhead)`)
      console.log(`   Position: (${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)}) relative to player`)
    } else {
      // Sun below horizon (night) - disable sun light
      this.sunLight.intensity = 0
      // console.log('🌙 Sun below horizon (night)')
    }
  }

  // Update scene lighting and sky
  updateLighting() {
    const skyColor = this.getSkyColor()
    const ambientIntensity = this.getAmbientIntensity()

    this.scene.background = skyColor

    // FIXED: Update existing fog color instead of replacing fog instance
    // This preserves custom fog.far settings from render distance slider
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color = skyColor
    } else {
      // Create fog if it doesn't exist
      this.scene.fog = new THREE.Fog(skyColor, 1, 96)
    }

    // Update ambient light
    const ambientLight = this.scene.children.find(
      child => child instanceof THREE.AmbientLight
    ) as THREE.AmbientLight | undefined

    if (ambientLight) {
      ambientLight.intensity = ambientIntensity
    }

    // Update point lights (keep them for fill light)
    this.scene.children
      .filter(child => child instanceof THREE.PointLight)
      .forEach((light) => {
        (light as THREE.PointLight).intensity = ambientIntensity * 0.3
      })

    // Update sun position
    this.updateSunPosition()
  }

  // Get light color based on sun altitude (golden hour effect)
  getSunColor(): THREE.Color {
    const date = this.getDate()
    const position = SunCalc.getPosition(date, this.latitude, this.longitude)
    const altitude = position.altitude // Radians

    // Convert altitude to degrees for easier logic
    const altitudeDeg = altitude * 180 / Math.PI

    // Sun below horizon - no color
    if (altitudeDeg <= 0) {
      return new THREE.Color(0xffffff)
    }

    // Golden hour (sun near horizon, 0-15 degrees)
    if (altitudeDeg < 15) {
      const t = altitudeDeg / 15 // 0 to 1
      // Warm orange (low sun) to neutral white (higher sun)
      return new THREE.Color().lerpColors(
        new THREE.Color(0xffaa66), // Warm orange
        new THREE.Color(0xffffff), // White
        t
      )
    }

    // High sun - neutral white
    return new THREE.Color(0xffffff)
  }

  // Cycle through location presets
  cycleLocation() {
    this.currentPresetIndex = (this.currentPresetIndex + 1) % this.locationPresets.length
    const preset = this.locationPresets[this.currentPresetIndex]

    this.latitude = preset.lat
    this.longitude = preset.lon

    console.log(`📍 Location set to: ${preset.name} (${preset.lat}°, ${preset.lon}°)`)
    this.calculateSunTimes()
    this.updateLighting()
  }

  // Set location
  setLocation(lat: number, lon: number, name?: string) {
    this.latitude = lat
    this.longitude = lon
    console.log(`📍 Location set to: ${name || `${lat}°, ${lon}°`}`)
    this.calculateSunTimes()
    this.updateLighting()
  }

  // Set date (month 1-12, day 1-31)
  setDate(month: number, day: number, year?: number) {
    this.overrideMonth = month
    this.overrideDay = day
    this.overrideYear = year || new Date().getFullYear()
    console.log(`📅 Date set to: ${year || new Date().getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`)
    this.calculateSunTimes()
    this.updateLighting()
  }

  // Reset to current real date
  resetDate() {
    this.overrideMonth = null
    this.overrideDay = null
    this.overrideYear = null
    console.log('📅 Date reset to current day')
    this.calculateSunTimes()
    this.updateLighting()
  }

  // Set time to solar noon (when sun is highest)
  setSolarNoon() {
    const date = this.getDate()
    const times = SunCalc.getTimes(date, this.latitude, this.longitude)
    const solarNoon = times.solarNoon

    this.setHour(solarNoon.getHours())
    console.log(`☀️ Time set to solar noon: ${solarNoon.toLocaleTimeString()}`)
  }

  // Set time to sunrise
  setSunrise() {
    const date = this.getDate()
    const times = SunCalc.getTimes(date, this.latitude, this.longitude)
    const sunrise = times.sunrise

    this.setHour(sunrise.getHours())
    console.log(`🌅 Time set to sunrise: ${sunrise.toLocaleTimeString()}`)
  }

  // Set time to sunset
  setSunset() {
    const date = this.getDate()
    const times = SunCalc.getTimes(date, this.latitude, this.longitude)
    const sunset = times.sunset

    this.setHour(sunset.getHours())
    console.log(`🌇 Time set to sunset: ${sunset.toLocaleTimeString()}`)
  }

  // Call this every frame to update lighting smoothly
  update() {
    // Update more frequently for smooth transitions (every 1 second)
    if (!this.lastUpdate || Date.now() - this.lastUpdate > 1000) {
      this.updateLighting()
      this.lastUpdate = Date.now()
    }
  }

  lastUpdate = 0
}
