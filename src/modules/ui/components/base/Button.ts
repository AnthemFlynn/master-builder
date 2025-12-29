// src/modules/ui/components/base/Button.ts

/**
 * Button - Beveled 3D button with multiple variants
 *
 * Variants:
 * - primary (green): Main actions like "Play", "Create", "Save"
 * - secondary (purple): Secondary actions like "Settings", "Back"
 * - danger (red): Destructive actions like "Delete"
 * - ghost: Text-only, minimal styling
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'small' | 'medium' | 'large'

export interface ButtonOptions {
  /** Button text */
  label: string
  /** Visual variant */
  variant?: ButtonVariant
  /** Button size */
  size?: ButtonSize
  /** Full width button */
  fullWidth?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Icon (emoji or character) before label */
  icon?: string
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; bgDark: string; glow: string }> = {
  primary: {
    bg: 'var(--button-green)',
    bgDark: 'var(--button-green-dark)',
    glow: 'var(--glow-green)'
  },
  secondary: {
    bg: 'var(--button-purple)',
    bgDark: 'var(--button-purple-dark)',
    glow: 'var(--glow-purple)'
  },
  danger: {
    bg: 'var(--danger-red)',
    bgDark: 'var(--danger-red-dark)',
    glow: '0 0 20px rgba(211, 47, 47, 0.5)'
  },
  ghost: {
    bg: 'transparent',
    bgDark: 'transparent',
    glow: 'none'
  }
}

const SIZE_STYLES: Record<ButtonSize, { padding: string; fontSize: string; minHeight: string }> = {
  small: {
    padding: 'var(--space-xs) var(--space-md)',
    fontSize: 'var(--font-size-sm)',
    minHeight: '32px'
  },
  medium: {
    padding: 'var(--space-sm) var(--space-lg)',
    fontSize: 'var(--font-size-md)',
    minHeight: '44px'
  },
  large: {
    padding: 'var(--space-md) var(--space-xl)',
    fontSize: 'var(--font-size-lg)',
    minHeight: '56px'
  }
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const {
    label,
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    disabled = false,
    icon,
    onClick,
    className = ''
  } = options

  const button = document.createElement('button')
  button.className = `kb-button kb-button--${variant} kb-button--${size} ${className}`.trim()
  button.disabled = disabled

  const variantStyle = VARIANT_STYLES[variant]
  const sizeStyle = SIZE_STYLES[size]

  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    width: ${fullWidth ? '100%' : 'auto'};
    min-height: ${sizeStyle.minHeight};
    padding: ${sizeStyle.padding};
    font-family: var(--font-family);
    font-size: ${sizeStyle.fontSize};
    font-weight: bold;
    color: var(--text-light);
    background: ${variantStyle.bg};
    border: 3px solid ${variantStyle.bgDark};
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-button), inset 0 2px 0 rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    user-select: none;
  `

  // Icon + label content
  if (icon) {
    const iconSpan = document.createElement('span')
    iconSpan.className = 'kb-button-icon'
    iconSpan.textContent = icon
    iconSpan.style.cssText = `font-size: 1.2em;`
    button.appendChild(iconSpan)
  }

  const labelSpan = document.createElement('span')
  labelSpan.className = 'kb-button-label'
  labelSpan.textContent = label
  button.appendChild(labelSpan)

  // Event handlers
  if (onClick) {
    button.addEventListener('click', (e) => {
      if (!disabled) {
        e.preventDefault()
        onClick()
      }
    })
  }

  return button
}

/**
 * Inject Button component styles into the document
 */
export function injectButtonStyles(): void {
  if (document.getElementById('kb-button-styles')) return

  const style = document.createElement('style')
  style.id = 'kb-button-styles'
  style.textContent = `
    .kb-button {
      position: relative;
      overflow: hidden;
    }

    .kb-button:not(:disabled):hover {
      transform: translateY(-2px);
      filter: brightness(1.1);
    }

    .kb-button:not(:disabled):active {
      transform: translateY(1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.1);
    }

    .kb-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      filter: grayscale(50%);
    }

    .kb-button--primary:not(:disabled):hover {
      box-shadow: var(--glow-green), var(--shadow-button);
    }

    .kb-button--secondary:not(:disabled):hover {
      box-shadow: var(--glow-purple), var(--shadow-button);
    }

    .kb-button--ghost {
      background: transparent;
      border: 2px solid var(--text-muted);
      box-shadow: none;
    }

    .kb-button--ghost:not(:disabled):hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--text-light);
    }

    /* Focus ring for accessibility */
    .kb-button:focus-visible {
      outline: 3px solid var(--parchment);
      outline-offset: 2px;
    }
  `
  document.head.appendChild(style)
}
