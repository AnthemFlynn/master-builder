// src/modules/ui/components/base/RibbonTitle.ts

/**
 * RibbonTitle - Red banner for section headers
 *
 * A decorative ribbon-style title bar with folded ends,
 * used for screen titles and section headers.
 */

export interface RibbonTitleOptions {
  /** Title text */
  title: string
  /** Subtitle text (optional) */
  subtitle?: string
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Additional CSS classes */
  className?: string
}

export function createRibbonTitle(options: RibbonTitleOptions): HTMLElement {
  const {
    title,
    subtitle,
    size = 'medium',
    className = ''
  } = options

  const container = document.createElement('div')
  container.className = `kb-ribbon kb-ribbon--${size} ${className}`.trim()

  const sizeStyles = {
    small: { fontSize: 'var(--font-size-md)', padding: 'var(--space-sm) var(--space-lg)', endSize: '12px' },
    medium: { fontSize: 'var(--font-size-xl)', padding: 'var(--space-md) var(--space-xl)', endSize: '16px' },
    large: { fontSize: 'var(--font-size-xxl)', padding: 'var(--space-lg) var(--space-xxl)', endSize: '20px' }
  }[size]

  container.style.cssText = `
    position: relative;
    display: inline-block;
    text-align: center;
    margin: var(--space-md) 0;
  `

  // Main ribbon
  const ribbon = document.createElement('div')
  ribbon.className = 'kb-ribbon-main'
  ribbon.style.cssText = `
    position: relative;
    display: inline-block;
    padding: ${sizeStyles.padding};
    background: var(--ribbon-red);
    color: var(--text-on-red);
    font-family: var(--font-family);
    font-size: ${sizeStyles.fontSize};
    font-weight: bold;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1;
  `

  // Title text
  const titleEl = document.createElement('span')
  titleEl.className = 'kb-ribbon-title'
  titleEl.textContent = title
  ribbon.appendChild(titleEl)

  // Subtitle if provided
  if (subtitle) {
    const subtitleEl = document.createElement('div')
    subtitleEl.className = 'kb-ribbon-subtitle'
    subtitleEl.textContent = subtitle
    subtitleEl.style.cssText = `
      font-size: 0.6em;
      font-weight: normal;
      opacity: 0.8;
      margin-top: var(--space-xs);
    `
    ribbon.appendChild(subtitleEl)
  }

  // Left ribbon end
  const leftEnd = document.createElement('div')
  leftEnd.className = 'kb-ribbon-end kb-ribbon-end--left'
  leftEnd.style.cssText = `
    position: absolute;
    left: -${sizeStyles.endSize};
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: calc(${sizeStyles.endSize} + 4px) solid transparent;
    border-bottom: calc(${sizeStyles.endSize} + 4px) solid transparent;
    border-right: ${sizeStyles.endSize} solid var(--ribbon-red-dark);
  `

  // Right ribbon end
  const rightEnd = document.createElement('div')
  rightEnd.className = 'kb-ribbon-end kb-ribbon-end--right'
  rightEnd.style.cssText = `
    position: absolute;
    right: -${sizeStyles.endSize};
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: calc(${sizeStyles.endSize} + 4px) solid transparent;
    border-bottom: calc(${sizeStyles.endSize} + 4px) solid transparent;
    border-left: ${sizeStyles.endSize} solid var(--ribbon-red-dark);
  `

  container.appendChild(leftEnd)
  container.appendChild(ribbon)
  container.appendChild(rightEnd)

  return container
}

/**
 * Inject RibbonTitle component styles into the document
 */
export function injectRibbonStyles(): void {
  if (document.getElementById('kb-ribbon-styles')) return

  const style = document.createElement('style')
  style.id = 'kb-ribbon-styles'
  style.textContent = `
    .kb-ribbon {
      animation: kb-slide-up 0.3s ease-out;
    }

    .kb-ribbon-main::before,
    .kb-ribbon-main::after {
      content: '';
      position: absolute;
      bottom: -8px;
      width: 16px;
      height: 16px;
      background: var(--ribbon-red-dark);
      clip-path: polygon(0 0, 100% 0, 100% 100%);
    }

    .kb-ribbon-main::before {
      left: 0;
      clip-path: polygon(0 0, 100% 0, 0 100%);
    }

    .kb-ribbon-main::after {
      right: 0;
      clip-path: polygon(0 0, 100% 0, 100% 100%);
    }
  `
  document.head.appendChild(style)
}
