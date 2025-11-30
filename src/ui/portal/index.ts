import TimeOfDay from '../../core/TimeOfDay'
import * as SunCalc from 'suncalc'
import { PORTAL_PRESETS, LOCATIONS, DATE_PRESETS, PortalPreset } from './presets'

/**
 * Portal Gateway - World & Time Travel System
 * Allows players to travel to different locations, dates, and times
 */
export default class PortalGateway {
  constructor(private timeOfDay: TimeOfDay) {
    this.createPortalUI()
    this.setupActivation()
  }

  isOpen = false
  overlay: HTMLDivElement
  portal: HTMLDivElement
  wasPointerLocked = false

  /**
   * Setup Cmd+P activation
   */
  setupActivation() {
    document.body.addEventListener('keydown', (e) => {
      // Cmd+P or Ctrl+P to open portal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        e.stopPropagation()
        this.toggle()
      }

      // Escape to close
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault()
        e.stopPropagation()
        this.close()
      }
    }, true)

    console.log('🌀 Portal Gateway activated (press Cmd+P to open)')
  }

  /**
   * Create portal UI
   */
  createPortalUI() {
    // Dark overlay
    this.overlay = document.createElement('div')
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: none;
      z-index: 10000;
      opacity: 0;
      transition: opacity 400ms ease-out;
    `
    document.body.appendChild(this.overlay)

    // Portal panel
    this.portal = document.createElement('div')
    this.portal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 600px;
      max-height: 80vh;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border: 3px solid #8b7355;
      border-radius: 10px;
      box-shadow: 0 0 40px rgba(139, 115, 85, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5);
      color: #f4e4c1;
      font-family: 'Courier New', monospace;
      z-index: 10001;
      overflow-y: auto;
      display: none;
      opacity: 0;
      transition: opacity 400ms ease-out, transform 400ms ease-out;
    `
    document.body.appendChild(this.portal)

    this.renderPortalContent()
  }

  /**
   * Render portal content
   */
  renderPortalContent() {
    // Clear existing content
    this.portal.innerHTML = ''

    const container = document.createElement('div')
    container.style.padding = '30px'
    container.innerHTML = `
      <div style="padding: 30px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 28px; font-weight: bold; color: #d4af37; text-shadow: 0 0 10px #d4af37;">
            🌀 PORTAL GATEWAY 🌀
          </div>
          <div style="font-size: 12px; color: #999; margin-top: 5px;">
            Travel through space and time
          </div>
        </div>

        <!-- Quick Travel Presets -->
        <div style="margin-bottom: 25px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #d4af37; border-bottom: 2px solid #8b7355; padding-bottom: 5px;">
            ⚡ QUICK TRAVEL PRESETS
          </div>
          <div id="preset-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${PORTAL_PRESETS.map(preset => `
              <button
                class="preset-btn"
                data-preset-id="${preset.id}"
                style="
                  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
                  border: 2px solid #8b7355;
                  border-radius: 5px;
                  padding: 12px;
                  color: #f4e4c1;
                  cursor: pointer;
                  text-align: left;
                  transition: all 200ms;
                  font-size: 13px;
                "
                onmouseover="this.style.background='linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%)'; this.style.borderColor='#d4af37';"
                onmouseout="this.style.background='linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'; this.style.borderColor='#8b7355';"
              >
                <div style="font-weight: bold; margin-bottom: 5px;">${preset.name}</div>
                <div style="font-size: 10px; color: #999;">${preset.description}</div>
                <div style="font-size: 9px; color: #666; margin-top: 3px;">☀️ ${preset.expectedSunAltitude}° altitude</div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Divider -->
        <div style="text-align: center; margin: 25px 0; color: #666;">
          ─── OR CUSTOMIZE ───
        </div>

        <!-- Custom Controls -->
        <div style="margin-bottom: 20px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #6b9bd1;">
            📍 LOCATION
          </div>
          <select id="location-select" style="
            width: 100%;
            padding: 10px;
            background: #2a2a2a;
            border: 2px solid #6b9bd1;
            border-radius: 5px;
            color: #f4e4c1;
            font-size: 13px;
            cursor: pointer;
          ">
            ${LOCATIONS.map(loc => `
              <option value="${loc.lat},${loc.lon}">${loc.name} (${loc.lat}°, ${loc.lon}°)</option>
            `).join('')}
          </select>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #d4af37;">
            📅 DATE
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${DATE_PRESETS.map(date => `
              <button
                class="date-btn"
                data-month="${date.month}"
                data-day="${date.day}"
                style="
                  background: #2a2a2a;
                  border: 2px solid #d4af37;
                  border-radius: 5px;
                  padding: 10px;
                  color: #f4e4c1;
                  cursor: pointer;
                  font-size: 12px;
                  transition: all 200ms;
                "
                onmouseover="this.style.background='#3a3a3a';"
                onmouseout="this.style.background='#2a2a2a';"
              >
                ${date.name}
              </button>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #d16b6b;">
            ⏰ TIME
          </div>
          <input
            id="time-slider"
            type="range"
            min="0"
            max="23"
            value="12"
            style="width: 100%; margin-bottom: 10px;"
          />
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span id="time-display" style="font-size: 18px; font-weight: bold;">12:00</span>
            <div style="display: flex; gap: 10px;">
              <button id="sunrise-btn" class="time-quick-btn">🌅 Sunrise</button>
              <button id="noon-btn" class="time-quick-btn">☀️ Solar Noon</button>
              <button id="sunset-btn" class="time-quick-btn">🌇 Sunset</button>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div id="preview-box" style="
          background: rgba(212, 175, 55, 0.1);
          border: 2px solid #d4af37;
          border-radius: 5px;
          padding: 15px;
          text-align: center;
          margin-bottom: 20px;
        ">
          <div style="font-size: 12px; color: #999; margin-bottom: 5px;">PREVIEW</div>
          <div id="preview-text" style="font-size: 16px; font-weight: bold;">
            ☀️ Calculating sun position...
          </div>
        </div>

        <!-- Travel Button -->
        <button id="travel-btn" style="
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%);
          border: none;
          border-radius: 8px;
          color: #1a1a1a;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: all 200ms;
          text-shadow: 0 1px 2px rgba(255,255,255,0.3);
        "
        onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 20px #d4af37';"
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
        >
          ✨ TRAVEL ✨
        </button>

        <div style="text-align: center; margin-top: 15px; font-size: 11px; color: #666;">
          Press ESC or Cmd+P to close
        </div>
      </div>

      <style>
        .time-quick-btn {
          background: #2a2a2a;
          border: 1px solid #d16b6b;
          border-radius: 4px;
          padding: 6px 10px;
          color: #f4e4c1;
          font-size: 11px;
          cursor: pointer;
          transition: all 150ms;
        }
        .time-quick-btn:hover {
          background: #3a3a3a;
          border-color: #ff8888;
        }
      </style>
    `

    this.portal.appendChild(container)
    this.attachEventHandlers()
  }

  /**
   * Attach event handlers to UI elements
   */
  attachEventHandlers() {
    // Preset buttons
    this.portal.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-preset-id')
        if (presetId) this.travelToPreset(presetId)
      })
    })

    // Date preset buttons
    this.portal.querySelectorAll('.date-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const month = parseInt(btn.getAttribute('data-month') || '3')
        const day = parseInt(btn.getAttribute('data-day') || '20')
        this.timeOfDay.setDate(month, day)
        this.updatePreview()
      })
    })

    // Time slider
    const timeSlider = this.portal.querySelector('#time-slider') as HTMLInputElement
    const timeDisplay = this.portal.querySelector('#time-display')
    if (timeSlider && timeDisplay) {
      timeSlider.addEventListener('input', () => {
        const hour = parseInt(timeSlider.value)
        timeDisplay.textContent = `${hour.toString().padStart(2, '0')}:00`
        this.updatePreview()
      })
    }

    // Quick time buttons
    const sunriseBtn = this.portal.querySelector('#sunrise-btn')
    const noonBtn = this.portal.querySelector('#noon-btn')
    const sunsetBtn = this.portal.querySelector('#sunset-btn')

    sunriseBtn?.addEventListener('click', () => {
      this.timeOfDay.setSunrise()
      this.updatePreview()
    })

    noonBtn?.addEventListener('click', () => {
      this.timeOfDay.setSolarNoon()
      this.updatePreview()
    })

    sunsetBtn?.addEventListener('click', () => {
      this.timeOfDay.setSunset()
      this.updatePreview()
    })

    // Location select
    const locationSelect = this.portal.querySelector('#location-select') as HTMLSelectElement
    locationSelect?.addEventListener('change', () => {
      const [lat, lon] = locationSelect.value.split(',').map(Number)
      const selectedOption = LOCATIONS.find(l => l.lat === lat && l.lon === lon)
      this.timeOfDay.setLocation(lat, lon, selectedOption?.name)
      this.updatePreview()
    })

    // Travel button
    const travelBtn = this.portal.querySelector('#travel-btn')
    travelBtn?.addEventListener('click', () => {
      this.executeTravel()
    })
  }

  /**
   * Travel to a preset
   */
  travelToPreset(presetId: string) {
    const preset = PORTAL_PRESETS.find(p => p.id === presetId)
    if (!preset) return

    console.log(`🌀 Traveling to: ${preset.name}`)

    // Apply location
    this.timeOfDay.setLocation(preset.location.lat, preset.location.lon, preset.location.name)

    // Apply date
    this.timeOfDay.setDate(preset.date.month, preset.date.day)

    // Apply time
    if (preset.time.hour === 'solar-noon') {
      this.timeOfDay.setSolarNoon()
    } else if (preset.time.hour === 'sunrise') {
      this.timeOfDay.setSunrise()
    } else if (preset.time.hour === 'sunset') {
      this.timeOfDay.setSunset()
    } else if (typeof preset.time.hour === 'number') {
      this.timeOfDay.setHour(preset.time.hour)
    }

    // Execute travel with transition
    this.travelTransition(preset.name)
  }

  /**
   * Execute custom travel (from manual controls)
   */
  executeTravel() {
    const timeSlider = this.portal.querySelector('#time-slider') as HTMLInputElement
    const hour = parseInt(timeSlider.value)

    this.timeOfDay.setHour(hour)

    this.travelTransition('Custom Destination')
  }

  /**
   * Travel transition effect
   */
  travelTransition(destinationName: string) {
    // Fade to black
    document.body.style.transition = 'opacity 500ms'
    document.body.style.opacity = '0'

    setTimeout(() => {
      // Close portal
      this.close()

      console.log(`🌀 Arrived at: ${destinationName}`)

      // Fade back in
      document.body.style.opacity = '1'
    }, 500)
  }

  /**
   * Update preview text with current sun altitude
   */
  updatePreview() {
    const previewText = this.portal.querySelector('#preview-text')
    if (!previewText) return

    // Calculate sun position for current settings
    const date = this.timeOfDay.getDate()
    const position = SunCalc.getPosition(date, this.timeOfDay.latitude, this.timeOfDay.longitude)
    const altitudeDeg = (position.altitude * 180 / Math.PI).toFixed(1)

    if (position.altitude > 0) {
      previewText.innerHTML = `☀️ Sun at ${altitudeDeg}° altitude`
    } else {
      previewText.innerHTML = `🌙 Sun below horizon (${altitudeDeg}°)`
    }
  }

  /**
   * Toggle portal
   */
  toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  /**
   * Open portal
   */
  open() {
    this.isOpen = true

    // Unlock pointer if locked
    this.wasPointerLocked = !!document.pointerLockElement
    if (this.wasPointerLocked) {
      document.exitPointerLock()
    }

    this.overlay.style.display = 'block'
    this.portal.style.display = 'block'

    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1'
      this.portal.style.opacity = '1'
      this.portal.style.transform = 'translate(-50%, -50%) scale(1)'
    })

    this.updatePreview()
    console.log('🌀 Portal Gateway opened')
  }

  /**
   * Close portal
   */
  close() {
    this.isOpen = false

    this.overlay.style.opacity = '0'
    this.portal.style.opacity = '0'
    this.portal.style.transform = 'translate(-50%, -50%) scale(0.9)'

    setTimeout(() => {
      this.overlay.style.display = 'none'
      this.portal.style.display = 'none'
    }, 400)

    // Re-lock pointer if it was locked
    if (this.wasPointerLocked) {
      setTimeout(() => {
        const canvas = document.querySelector('canvas')
        canvas?.requestPointerLock()
      }, 450)
    }

    console.log('🌀 Portal Gateway closed')
  }
}
