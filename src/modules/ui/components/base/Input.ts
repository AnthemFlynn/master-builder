// src/modules/ui/components/base/Input.ts

/**
 * Input - Styled text input with parchment background
 *
 * Used for world names, seeds, and other text entry.
 */

export interface InputOptions {
  /** Placeholder text */
  placeholder?: string
  /** Initial value */
  value?: string
  /** Input type (text, number, etc.) */
  type?: string
  /** Label text */
  label?: string
  /** Helper text below input */
  helper?: string
  /** Error message */
  error?: string
  /** Max length */
  maxLength?: number
  /** Full width */
  fullWidth?: boolean
  /** Called on value change */
  onChange?: (value: string) => void
  /** Called on blur */
  onBlur?: (value: string) => void
  /** Additional CSS classes */
  className?: string
}

export interface InputComponent {
  element: HTMLElement
  input: HTMLInputElement
  getValue: () => string
  setValue: (value: string) => void
  setError: (error: string | null) => void
  focus: () => void
}

export function createInput(options: InputOptions): InputComponent {
  const {
    placeholder = '',
    value = '',
    type = 'text',
    label,
    helper,
    error,
    maxLength,
    fullWidth = true,
    onChange,
    onBlur,
    className = ''
  } = options

  const container = document.createElement('div')
  container.className = `kb-input-container ${className}`.trim()
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    width: ${fullWidth ? '100%' : 'auto'};
  `

  // Label
  if (label) {
    const labelEl = document.createElement('label')
    labelEl.className = 'kb-input-label'
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

  // Input wrapper
  const wrapper = document.createElement('div')
  wrapper.className = 'kb-input-wrapper'
  wrapper.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
  `

  // Input element
  const input = document.createElement('input')
  input.type = type
  input.placeholder = placeholder
  input.value = value
  if (maxLength) input.maxLength = maxLength
  input.className = 'kb-input'
  input.style.cssText = `
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    font-family: var(--font-family);
    font-size: var(--font-size-md);
    color: var(--text-dark);
    background: var(--parchment);
    border: 3px solid var(--wood-dark);
    border-radius: var(--border-radius-md);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    outline: none;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  `

  input.addEventListener('focus', () => {
    input.style.borderColor = 'var(--button-green)'
    input.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 8px rgba(76, 175, 80, 0.3)'
  })

  input.addEventListener('blur', () => {
    input.style.borderColor = 'var(--wood-dark)'
    input.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
    onBlur?.(input.value)
  })

  if (onChange) {
    input.addEventListener('input', () => onChange(input.value))
  }

  wrapper.appendChild(input)
  container.appendChild(wrapper)

  // Helper/Error text
  const helperEl = document.createElement('div')
  helperEl.className = 'kb-input-helper'
  helperEl.style.cssText = `
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    min-height: 16px;
  `

  const setError = (newError: string | null) => {
    if (newError) {
      helperEl.textContent = newError
      helperEl.style.color = 'var(--danger-red)'
      input.style.borderColor = 'var(--danger-red)'
    } else {
      helperEl.textContent = helper || ''
      helperEl.style.color = 'var(--text-muted)'
      input.style.borderColor = 'var(--wood-dark)'
    }
  }

  helperEl.textContent = error || helper || ''
  if (error) {
    helperEl.style.color = 'var(--danger-red)'
    input.style.borderColor = 'var(--danger-red)'
  }

  container.appendChild(helperEl)

  return {
    element: container,
    input,
    getValue: () => input.value,
    setValue: (v: string) => { input.value = v },
    setError,
    focus: () => input.focus()
  }
}
