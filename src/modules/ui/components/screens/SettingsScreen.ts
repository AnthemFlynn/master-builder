// src/modules/ui/components/screens/SettingsScreen.ts

import { createPanel } from '../base/Panel'
import { createButton } from '../base/Button'
import { createRibbonTitle } from '../base/RibbonTitle'

/**
 * SettingsScreen - Game settings and preferences
 *
 * Provides controls for:
 * - Render Distance (performance vs. visuals)
 * - Field of View
 * - Sound Volume
 * - Controls/Keybindings
 */

export type QualityPreset = 'ultra' | 'high' | 'medium' | 'low'

export interface PostProcessingSettings {
  enabled: boolean
  bloomStrength: number
  bloomThreshold: number
  ssaoEnabled: boolean
  ssaoIntensity: number
  volumetricEnabled: boolean
  volumetricExposure: number
  saturation: number
  contrast: number
  brightness: number
}

export interface SettingsScreenOptions {
  /** Initial render distance */
  renderDistance?: number
  /** Initial FOV */
  fov?: number
  /** Initial volume (0-1) */
  volume?: number
  /** Initial quality preset */
  qualityPreset?: QualityPreset
  /** Initial post-processing settings */
  postProcessing?: Partial<PostProcessingSettings>
  /** Called when render distance changes */
  onRenderDistanceChange?: (value: number) => void
  /** Called when FOV changes */
  onFovChange?: (value: number) => void
  /** Called when volume changes */
  onVolumeChange?: (value: number) => void
  /** Called when quality preset changes */
  onQualityPresetChange?: (value: QualityPreset) => void
  /** Called when any post-processing setting changes */
  onPostProcessingChange?: (key: keyof PostProcessingSettings, value: number | boolean) => void
  /** Called when Controls button clicked */
  onControls?: () => void
  /** Called when back/close */
  onBack: () => void
}

export interface SettingsScreenComponent {
  element: HTMLElement
  show: () => void
  hide: () => void
  destroy: () => void
  setRenderDistance: (value: number) => void
  setFov: (value: number) => void
  setVolume: (value: number) => void
  setQualityPreset: (value: QualityPreset) => void
  setPostProcessing: (settings: Partial<PostProcessingSettings>) => void
}

export function createSettingsScreen(options: SettingsScreenOptions): SettingsScreenComponent {
  const {
    renderDistance: initialRenderDistance = 6,
    fov: initialFov = 50,
    volume: initialVolume = 0.5,
    qualityPreset: initialQualityPreset = 'high',
    postProcessing: initialPostProcessing = {},
    onRenderDistanceChange,
    onFovChange,
    onVolumeChange,
    onQualityPresetChange,
    onPostProcessingChange,
    onControls,
    onBack
  } = options

  let renderDistance = initialRenderDistance
  let fov = initialFov
  let volume = initialVolume
  let qualityPreset = initialQualityPreset

  // Post-processing defaults - enabled with conservative values
  const ppDefaults: PostProcessingSettings = {
    enabled: true,
    bloomStrength: 0.15,
    bloomThreshold: 0.9,
    ssaoEnabled: true,
    ssaoIntensity: 8,
    volumetricEnabled: false,  // Keep disabled - causes instability
    volumetricExposure: 0.02,
    saturation: 1.05,
    contrast: 1.02,
    brightness: 1.0
  }
  let pp: PostProcessingSettings = { ...ppDefaults, ...initialPostProcessing }

  // Container
  const container = document.createElement('div')
  container.className = 'kb-settings-screen'
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
    z-index: var(--z-modal);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-normal), visibility var(--transition-normal);
  `

  // Background decoration
  const bgDecor = document.createElement('div')
  bgDecor.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at 20% 80%, rgba(76, 175, 80, 0.06) 0%, transparent 40%),
      radial-gradient(circle at 80% 20%, rgba(123, 94, 173, 0.06) 0%, transparent 40%);
    pointer-events: none;
  `

  // Main panel
  const panel = createPanel({
    width: '420px',
    padding: 'var(--space-xl)',
    corners: true
  })
  panel.style.cssText += `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
    animation: kb-scale-in 0.3s ease-out;
    max-height: 90vh;
    overflow-y: auto;
  `

  // Title
  const title = createRibbonTitle({
    title: 'Settings',
    size: 'small'
  })
  title.style.marginBottom = 'var(--space-sm)'

  // Settings container
  const settingsContainer = document.createElement('div')
  settingsContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    width: 100%;
  `

  // === Graphics Section ===
  const graphicsSection = createSection('Graphics')

  // Render Distance Slider
  const rdRow = createSliderRow({
    label: 'Render Distance',
    value: renderDistance,
    min: 2,
    max: 10,
    step: 1,
    formatValue: (v) => `${v} chunks`,
    onChange: (v) => {
      renderDistance = v
      onRenderDistanceChange?.(v)
    }
  })
  graphicsSection.appendChild(rdRow.element)

  // FOV Slider
  const fovRow = createSliderRow({
    label: 'Field of View',
    value: fov,
    min: 30,
    max: 110,
    step: 5,
    formatValue: (v) => `${v}°`,
    onChange: (v) => {
      fov = v
      onFovChange?.(v)
    }
  })
  graphicsSection.appendChild(fovRow.element)

  // Quality Preset Dropdown
  const qualityRow = createDropdownRow({
    label: 'Quality Preset',
    value: qualityPreset,
    options: [
      { value: 'ultra', label: 'Ultra' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' }
    ],
    onChange: (v) => {
      qualityPreset = v as QualityPreset
      onQualityPresetChange?.(qualityPreset)
    }
  })
  graphicsSection.appendChild(qualityRow.element)

  settingsContainer.appendChild(graphicsSection)

  // === Post-Processing Section ===
  const ppSection = createSection('Post-Processing')

  // Post-Processing Enable Toggle
  const ppEnabledRow = createToggleRow({
    label: 'Enable Post-Processing',
    value: pp.enabled,
    onChange: (v) => {
      pp.enabled = v
      onPostProcessingChange?.('enabled', v)
    }
  })
  ppSection.appendChild(ppEnabledRow.element)

  // SSAO Toggle
  const ssaoEnabledRow = createToggleRow({
    label: 'SSAO (Ambient Occlusion)',
    value: pp.ssaoEnabled,
    onChange: (v) => {
      pp.ssaoEnabled = v
      onPostProcessingChange?.('ssaoEnabled', v)
    }
  })
  ppSection.appendChild(ssaoEnabledRow.element)

  // SSAO Intensity
  const ssaoIntensityRow = createSliderRow({
    label: 'SSAO Intensity',
    value: pp.ssaoIntensity,
    min: 0,
    max: 32,
    step: 1,
    formatValue: (v) => `${v}`,
    onChange: (v) => {
      pp.ssaoIntensity = v
      onPostProcessingChange?.('ssaoIntensity', v)
    }
  })
  ppSection.appendChild(ssaoIntensityRow.element)

  // Volumetric Toggle
  const volumetricEnabledRow = createToggleRow({
    label: 'Volumetric Lighting (God Rays)',
    value: pp.volumetricEnabled,
    onChange: (v) => {
      pp.volumetricEnabled = v
      onPostProcessingChange?.('volumetricEnabled', v)
    }
  })
  ppSection.appendChild(volumetricEnabledRow.element)

  // Volumetric Exposure
  const volumetricExposureRow = createSliderRow({
    label: 'Volumetric Exposure',
    value: pp.volumetricExposure * 100,
    min: 0,
    max: 50,
    step: 1,
    formatValue: (v) => `${(v / 100).toFixed(2)}`,
    onChange: (v) => {
      pp.volumetricExposure = v / 100
      onPostProcessingChange?.('volumetricExposure', v / 100)
    }
  })
  ppSection.appendChild(volumetricExposureRow.element)

  // Bloom Strength
  const bloomStrengthRow = createSliderRow({
    label: 'Bloom Strength',
    value: pp.bloomStrength * 100,
    min: 0,
    max: 100,
    step: 1,
    formatValue: (v) => `${(v / 100).toFixed(2)}`,
    onChange: (v) => {
      pp.bloomStrength = v / 100
      onPostProcessingChange?.('bloomStrength', v / 100)
    }
  })
  ppSection.appendChild(bloomStrengthRow.element)

  // Bloom Threshold
  const bloomThresholdRow = createSliderRow({
    label: 'Bloom Threshold',
    value: pp.bloomThreshold * 100,
    min: 50,
    max: 100,
    step: 1,
    formatValue: (v) => `${(v / 100).toFixed(2)}`,
    onChange: (v) => {
      pp.bloomThreshold = v / 100
      onPostProcessingChange?.('bloomThreshold', v / 100)
    }
  })
  ppSection.appendChild(bloomThresholdRow.element)

  // Saturation
  const saturationRow = createSliderRow({
    label: 'Saturation',
    value: pp.saturation * 100,
    min: 0,
    max: 200,
    step: 5,
    formatValue: (v) => `${(v / 100).toFixed(2)}`,
    onChange: (v) => {
      pp.saturation = v / 100
      onPostProcessingChange?.('saturation', v / 100)
    }
  })
  ppSection.appendChild(saturationRow.element)

  // Contrast
  const contrastRow = createSliderRow({
    label: 'Contrast',
    value: pp.contrast * 100,
    min: 50,
    max: 150,
    step: 1,
    formatValue: (v) => `${(v / 100).toFixed(2)}`,
    onChange: (v) => {
      pp.contrast = v / 100
      onPostProcessingChange?.('contrast', v / 100)
    }
  })
  ppSection.appendChild(contrastRow.element)

  // Brightness
  const brightnessRow = createSliderRow({
    label: 'Brightness',
    value: pp.brightness * 100,
    min: 50,
    max: 150,
    step: 1,
    formatValue: (v) => `${(v / 100).toFixed(2)}`,
    onChange: (v) => {
      pp.brightness = v / 100
      onPostProcessingChange?.('brightness', v / 100)
    }
  })
  ppSection.appendChild(brightnessRow.element)

  settingsContainer.appendChild(ppSection)

  // === Audio Section ===
  const audioSection = createSection('Audio')

  // Volume Slider
  const volumeRow = createSliderRow({
    label: 'Master Volume',
    value: Math.round(volume * 100),
    min: 0,
    max: 100,
    step: 5,
    formatValue: (v) => `${v}%`,
    onChange: (v) => {
      volume = v / 100
      onVolumeChange?.(volume)
    }
  })
  audioSection.appendChild(volumeRow.element)

  settingsContainer.appendChild(audioSection)

  // === Controls Section ===
  const controlsSection = createSection('Controls')

  const controlsBtn = createButton({
    label: 'Configure Controls',
    variant: 'secondary',
    size: 'medium',
    fullWidth: true,
    icon: '🎮',
    onClick: () => {
      if (onControls) {
        onControls()
      } else {
        console.log('Controls configuration not implemented yet')
      }
    }
  })
  controlsSection.appendChild(controlsBtn)

  // Controls hint
  const controlsHint = document.createElement('div')
  controlsHint.textContent = 'WASD to move, Space to jump, Left/Right click to build'
  controlsHint.style.cssText = `
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-align: center;
    margin-top: var(--space-xs);
  `
  controlsSection.appendChild(controlsHint)

  settingsContainer.appendChild(controlsSection)

  // === Back Button ===
  const backBtn = createButton({
    label: 'Back',
    variant: 'ghost',
    size: 'medium',
    fullWidth: true,
    icon: '←',
    onClick: onBack
  })
  backBtn.style.marginTop = 'var(--space-md)'

  panel.appendChild(title)
  panel.appendChild(settingsContainer)
  panel.appendChild(backBtn)

  container.appendChild(bgDecor)
  container.appendChild(panel)

  // === Component Methods ===
  const show = () => {
    document.body.appendChild(container)
    void container.offsetHeight
    container.style.opacity = '1'
    container.style.visibility = 'visible'
  }

  const hide = () => {
    container.style.opacity = '0'
    container.style.visibility = 'hidden'
    setTimeout(() => {
      if (container.parentElement) {
        container.parentElement.removeChild(container)
      }
    }, 250)
  }

  const destroy = () => {
    hide()
  }

  const setRenderDistance = (value: number) => {
    renderDistance = value
    rdRow.setValue(value)
  }

  const setFov = (value: number) => {
    fov = value
    fovRow.setValue(value)
  }

  const setVolume = (value: number) => {
    volume = value
    volumeRow.setValue(Math.round(value * 100))
  }

  const setQualityPreset = (value: QualityPreset) => {
    qualityPreset = value
    qualityRow.setValue(value)
  }

  const setPostProcessing = (settings: Partial<PostProcessingSettings>) => {
    pp = { ...pp, ...settings }
    if (settings.enabled !== undefined) ppEnabledRow.setValue(settings.enabled)
    if (settings.ssaoEnabled !== undefined) ssaoEnabledRow.setValue(settings.ssaoEnabled)
    if (settings.ssaoIntensity !== undefined) ssaoIntensityRow.setValue(settings.ssaoIntensity)
    if (settings.volumetricEnabled !== undefined) volumetricEnabledRow.setValue(settings.volumetricEnabled)
    if (settings.volumetricExposure !== undefined) volumetricExposureRow.setValue(settings.volumetricExposure * 100)
    if (settings.bloomStrength !== undefined) bloomStrengthRow.setValue(settings.bloomStrength * 100)
    if (settings.bloomThreshold !== undefined) bloomThresholdRow.setValue(settings.bloomThreshold * 100)
    if (settings.saturation !== undefined) saturationRow.setValue(settings.saturation * 100)
    if (settings.contrast !== undefined) contrastRow.setValue(settings.contrast * 100)
    if (settings.brightness !== undefined) brightnessRow.setValue(settings.brightness * 100)
  }

  return {
    element: container,
    show,
    hide,
    destroy,
    setRenderDistance,
    setFov,
    setVolume,
    setQualityPreset,
    setPostProcessing
  }
}

// === Helper Functions ===

function createSection(title: string): HTMLElement {
  const section = document.createElement('div')
  section.className = 'kb-settings-section'
  section.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  `

  const header = document.createElement('div')
  header.className = 'kb-settings-section-header'
  header.textContent = title
  header.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    font-weight: bold;
    color: var(--text-gold);
    text-transform: uppercase;
    letter-spacing: 1px;
    padding-bottom: var(--space-xs);
    border-bottom: 2px solid var(--wood-medium);
    margin-bottom: var(--space-xs);
  `

  section.appendChild(header)
  return section
}

interface SliderRowOptions {
  label: string
  value: number
  min: number
  max: number
  step: number
  formatValue?: (value: number) => string
  onChange?: (value: number) => void
}

interface SliderRowComponent {
  element: HTMLElement
  setValue: (value: number) => void
}

function createSliderRow(options: SliderRowOptions): SliderRowComponent {
  const {
    label,
    value: initialValue,
    min,
    max,
    step,
    formatValue = (v) => String(v),
    onChange
  } = options

  let value = initialValue

  const row = document.createElement('div')
  row.className = 'kb-settings-row'
  row.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  `

  // Label row
  const labelRow = document.createElement('div')
  labelRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
  `

  const labelEl = document.createElement('span')
  labelEl.textContent = label
  labelEl.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  `

  const valueEl = document.createElement('span')
  valueEl.textContent = formatValue(value)
  valueEl.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    font-weight: bold;
    color: var(--text-gold);
    min-width: 80px;
    text-align: right;
  `

  labelRow.appendChild(labelEl)
  labelRow.appendChild(valueEl)

  // Slider
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = String(min)
  slider.max = String(max)
  slider.step = String(step)
  slider.value = String(value)
  slider.style.cssText = `
    width: 100%;
    height: 8px;
    background: var(--wood-dark);
    border-radius: 4px;
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  `

  // Style the thumb with CSS injection
  const thumbStyle = `
    width: 20px;
    height: 20px;
    background: var(--button-green);
    border: 3px solid var(--button-green-dark);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.1s;
  `

  slider.addEventListener('input', () => {
    value = Number(slider.value)
    valueEl.textContent = formatValue(value)
    onChange?.(value)
  })

  // Apply thumb styles via stylesheet
  const styleId = 'kb-slider-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .kb-settings-row input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        ${thumbStyle}
      }
      .kb-settings-row input[type="range"]::-moz-range-thumb {
        ${thumbStyle}
      }
      .kb-settings-row input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      .kb-settings-row input[type="range"]::-moz-range-thumb:hover {
        transform: scale(1.1);
      }
    `
    document.head.appendChild(style)
  }

  row.appendChild(labelRow)
  row.appendChild(slider)

  return {
    element: row,
    setValue: (v: number) => {
      value = v
      slider.value = String(v)
      valueEl.textContent = formatValue(v)
    }
  }
}

interface DropdownRowOptions {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange?: (value: string) => void
}

interface DropdownRowComponent {
  element: HTMLElement
  setValue: (value: string) => void
}

function createDropdownRow(options: DropdownRowOptions): DropdownRowComponent {
  const {
    label,
    value: initialValue,
    options: dropdownOptions,
    onChange
  } = options

  let value = initialValue

  const row = document.createElement('div')
  row.className = 'kb-settings-row'
  row.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  `

  // Label row
  const labelRow = document.createElement('div')
  labelRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
  `

  const labelEl = document.createElement('span')
  labelEl.textContent = label
  labelEl.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  `

  labelRow.appendChild(labelEl)

  // Dropdown
  const select = document.createElement('select')
  select.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    background: var(--wood-dark);
    border: 2px solid var(--wood-medium);
    border-radius: 4px;
    color: var(--text-light);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
  `

  // Add options
  for (const opt of dropdownOptions) {
    const optionEl = document.createElement('option')
    optionEl.value = opt.value
    optionEl.textContent = opt.label
    if (opt.value === initialValue) {
      optionEl.selected = true
    }
    select.appendChild(optionEl)
  }

  select.addEventListener('change', () => {
    value = select.value
    onChange?.(value)
  })

  select.addEventListener('focus', () => {
    select.style.borderColor = 'var(--button-green)'
  })

  select.addEventListener('blur', () => {
    select.style.borderColor = 'var(--wood-medium)'
  })

  row.appendChild(labelRow)
  row.appendChild(select)

  return {
    element: row,
    setValue: (v: string) => {
      value = v
      select.value = v
    }
  }
}

interface ToggleRowOptions {
  label: string
  value: boolean
  onChange?: (value: boolean) => void
}

interface ToggleRowComponent {
  element: HTMLElement
  setValue: (value: boolean) => void
}

function createToggleRow(options: ToggleRowOptions): ToggleRowComponent {
  const {
    label,
    value: initialValue,
    onChange
  } = options

  let value = initialValue

  const row = document.createElement('div')
  row.className = 'kb-settings-row'
  row.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs) 0;
  `

  const labelEl = document.createElement('span')
  labelEl.textContent = label
  labelEl.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    color: var(--text-light);
  `

  // Toggle switch container
  const toggleContainer = document.createElement('div')
  toggleContainer.style.cssText = `
    width: 48px;
    height: 24px;
    background: ${value ? 'var(--button-green)' : 'var(--wood-dark)'};
    border: 2px solid ${value ? 'var(--button-green-dark)' : 'var(--wood-medium)'};
    border-radius: 12px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s, border-color 0.2s;
  `

  const toggleKnob = document.createElement('div')
  toggleKnob.style.cssText = `
    width: 16px;
    height: 16px;
    background: var(--text-light);
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: ${value ? '26px' : '2px'};
    transition: left 0.2s;
  `

  toggleContainer.appendChild(toggleKnob)

  const updateVisual = () => {
    toggleContainer.style.background = value ? 'var(--button-green)' : 'var(--wood-dark)'
    toggleContainer.style.borderColor = value ? 'var(--button-green-dark)' : 'var(--wood-medium)'
    toggleKnob.style.left = value ? '26px' : '2px'
  }

  toggleContainer.addEventListener('click', () => {
    value = !value
    updateVisual()
    onChange?.(value)
  })

  row.appendChild(labelEl)
  row.appendChild(toggleContainer)

  return {
    element: row,
    setValue: (v: boolean) => {
      value = v
      updateVisual()
    }
  }
}
