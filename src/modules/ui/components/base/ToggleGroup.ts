// src/modules/ui/components/base/ToggleGroup.ts

/**
 * ToggleGroup - Mutually exclusive option buttons
 *
 * Used for game mode selection, world type selection, etc.
 */

export interface ToggleOption {
  /** Value to return when selected */
  value: string
  /** Display label */
  label: string
  /** Optional icon/emoji */
  icon?: string
  /** Optional description */
  description?: string
}

export interface ToggleGroupOptions {
  /** Available options */
  options: ToggleOption[]
  /** Initially selected value */
  selected?: string
  /** Label for the group */
  label?: string
  /** Layout direction */
  direction?: 'horizontal' | 'vertical'
  /** Called when selection changes */
  onChange?: (value: string) => void
  /** Additional CSS classes */
  className?: string
}

export interface ToggleGroupComponent {
  element: HTMLElement
  getValue: () => string
  setValue: (value: string) => void
}

export function createToggleGroup(options: ToggleGroupOptions): ToggleGroupComponent {
  const {
    options: toggleOptions,
    selected = toggleOptions[0]?.value,
    label,
    direction = 'horizontal',
    onChange,
    className = ''
  } = options

  let currentValue = selected

  const container = document.createElement('div')
  container.className = `kb-toggle-group ${className}`.trim()
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  `

  // Label
  if (label) {
    const labelEl = document.createElement('div')
    labelEl.className = 'kb-toggle-group-label'
    labelEl.textContent = label
    labelEl.style.cssText = `
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
      font-weight: bold;
      color: var(--text-light);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    `
    container.appendChild(labelEl)
  }

  // Options container
  const optionsContainer = document.createElement('div')
  optionsContainer.className = 'kb-toggle-options'
  optionsContainer.style.cssText = `
    display: flex;
    flex-direction: ${direction === 'horizontal' ? 'row' : 'column'};
    gap: var(--space-sm);
    flex-wrap: wrap;
  `

  const buttons: Map<string, HTMLButtonElement> = new Map()

  const updateSelection = (value: string) => {
    buttons.forEach((btn, val) => {
      const isSelected = val === value
      btn.style.background = isSelected ? 'var(--button-green)' : 'var(--wood-dark)'
      btn.style.borderColor = isSelected ? 'var(--button-green-dark)' : 'var(--wood-medium)'
      btn.style.boxShadow = isSelected ? 'var(--glow-green)' : 'none'
    })
  }

  toggleOptions.forEach(opt => {
    const button = document.createElement('button')
    button.className = 'kb-toggle-option'
    const isSelected = opt.value === currentValue

    button.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      min-width: 80px;
      font-family: var(--font-family);
      font-size: var(--font-size-sm);
      font-weight: bold;
      color: var(--text-light);
      background: ${isSelected ? 'var(--button-green)' : 'var(--wood-dark)'};
      border: 3px solid ${isSelected ? 'var(--button-green-dark)' : 'var(--wood-medium)'};
      border-radius: var(--border-radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      box-shadow: ${isSelected ? 'var(--glow-green)' : 'none'};
    `

    // Icon
    if (opt.icon) {
      const iconEl = document.createElement('span')
      iconEl.className = 'kb-toggle-icon'
      iconEl.textContent = opt.icon
      iconEl.style.fontSize = 'var(--font-size-lg)'
      button.appendChild(iconEl)
    }

    // Label
    const labelEl = document.createElement('span')
    labelEl.className = 'kb-toggle-label'
    labelEl.textContent = opt.label
    button.appendChild(labelEl)

    // Description
    if (opt.description) {
      const descEl = document.createElement('span')
      descEl.className = 'kb-toggle-desc'
      descEl.textContent = opt.description
      descEl.style.cssText = `
        font-size: var(--font-size-xs);
        font-weight: normal;
        opacity: 0.7;
      `
      button.appendChild(descEl)
    }

    button.addEventListener('mouseenter', () => {
      if (opt.value !== currentValue) {
        button.style.background = 'var(--wood-medium)'
      }
    })

    button.addEventListener('mouseleave', () => {
      if (opt.value !== currentValue) {
        button.style.background = 'var(--wood-dark)'
      }
    })

    button.addEventListener('click', () => {
      if (opt.value !== currentValue) {
        currentValue = opt.value
        updateSelection(currentValue)
        onChange?.(currentValue)
      }
    })

    buttons.set(opt.value, button)
    optionsContainer.appendChild(button)
  })

  container.appendChild(optionsContainer)

  return {
    element: container,
    getValue: () => currentValue,
    setValue: (value: string) => {
      if (toggleOptions.some(opt => opt.value === value)) {
        currentValue = value
        updateSelection(currentValue)
      }
    }
  }
}
