import * as THREE from 'three'
import * as SunCalc from 'suncalc'

export default class TimeOfDay {
  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.createSunLight()
    this.requestLocation()
    this.updateLighting()
  }

  scene: THREE.Scene
  overrideHour: number | null = null
  overrideMinute: number | null = null
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

  // Create directional light for sun
  createSunLight() {
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.sunLight.position.set(100, 100, 100)
    this.sunLight.castShadow = true

    // Configure shadow camera
    this.sunLight.shadow.camera.left = -80
    this.sunLight.shadow.camera.right = 80
    this.sunLight.shadow.camera.top = 80
    this.sunLight.shadow.camera.bottom = -80
    this.sunLight.shadow.camera.near = 0.5
    this.sunLight.shadow.camera.far = 300

    // Shadow map resolution
    this.sunLight.shadow.mapSize.width = 2048
    this.sunLight.shadow.mapSize.height = 2048

    // Simple shadow settings
    this.sunLight.shadow.bias = -0.0005

    this.scene.add(this.sunLight)

    console.log('☀️ Sun directional light added with shadows')
  }

  // Request user's location
  requestLocation() {
    console.log('📍 Using San Francisco (37.77, -122.42) as default location')

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
    const now = new Date()
    const times = SunCalc.getTimes(now, this.latitude, this.longitude)

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
    const { hour, minute } = this.getTime()
    const now = new Date()
    now.setHours(hour, minute, 0, 0)

    const position = SunCalc.getPosition(now, this.latitude, this.longitude)

    // Convert spherical coordinates (azimuth, altitude) to Cartesian (x, y, z)
    const azimuth = position.azimuth // Radians from south
    const altitude = position.altitude // Radians above horizon

    // Only show sun if it's above horizon
    if (altitude > 0) {
      const distance = 200
      const x = distance * Math.cos(altitude) * Math.sin(azimuth)
      const y = distance * Math.sin(altitude)
      const z = distance * Math.cos(altitude) * Math.cos(azimuth)

      this.sunLight.position.set(x, y, z)
      this.sunLight.intensity = Math.max(0.3, Math.sin(altitude)) // Brighter when higher

      // Apply warm color during golden hours
      this.sunLight.color = this.getSunColor()

      // Debug logging
      const azimuthDeg = (azimuth * 180 / Math.PI).toFixed(1)
      const altitudeDeg = (altitude * 180 / Math.PI).toFixed(1)
      console.log(`☀️ Sun: az=${azimuthDeg}° alt=${altitudeDeg}° pos=(${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)})`)
    } else {
      // Sun below horizon (night) - disable sun light
      this.sunLight.intensity = 0
      console.log('🌙 Sun below horizon (night)')
    }
  }

  // Update scene lighting and sky
  updateLighting() {
    const skyColor = this.getSkyColor()
    const ambientIntensity = this.getAmbientIntensity()

    this.scene.background = skyColor
    this.scene.fog = new THREE.Fog(skyColor, 1, 96)

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
    const { hour, minute } = this.getTime()
    const now = new Date()
    now.setHours(hour, minute, 0, 0)

    const position = SunCalc.getPosition(now, this.latitude, this.longitude)
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
