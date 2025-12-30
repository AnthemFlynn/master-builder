// src/modules/ui/components/base/ProgressBar.ts

/**
 * ProgressBar - Animated loading bar with glow effect
 *
 * Used for world loading and save progress indication.
 */

export interface ProgressBarOptions {
  /** Initial progress (0-100) */
  progress?: number
  /** Show percentage text */
  showPercent?: boolean
  /** Bar color variant */
  variant?: 'green' | 'gold' | 'purple'
  /** Height of the bar */
  height?: string
  /** Animated shimmer effect */
  animated?: boolean
  /** Additional CSS classes */
  className?: string
}

export interface ProgressBarComponent {
  element: HTMLElement
  setProgress: (value: number) => void
  getProgress: () => number
}

export function createProgressBar(options: ProgressBarOptions = {}): ProgressBarComponent {
  const {
    progress = 0,
    showPercent = true,
    variant = 'green',
    height = '24px',
    animated = true,
    className = ''
  } = options

  let currentProgress = Math.max(0, Math.min(100, progress))

  const colors = {
    green: { bg: 'var(--button-green)', glow: 'var(--glow-green)' },
    gold: { bg: '#FFC107', glow: 'var(--glow-gold)' },
    purple: { bg: 'var(--button-purple)', glow: 'var(--glow-purple)' }
  }[variant]

  const container = document.createElement('div')
  container.className = `kb-progress ${className}`.trim()
  container.style.cssText = `
    position: relative;
    width: 100%;
    height: ${height};
    background: var(--wood-dark);
    border-radius: var(--border-radius-md);
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  `

  // Progress fill
  const fill = document.createElement('div')
  fill.className = 'kb-progress-fill'
  fill.style.cssText = `
    position: absolute;
    top: 2px;
    left: 2px;
    height: calc(100% - 4px);
    width: calc(${currentProgress}% - 4px);
    background: ${colors.bg};
    border-radius: calc(var(--border-radius-md) - 2px);
    transition: width var(--transition-normal);
    box-shadow: ${colors.glow};
  `

  // Shimmer effect
  if (animated) {
    const shimmer = document.createElement('div')
    shimmer.className = 'kb-progress-shimmer'
    shimmer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.3) 50%,
        transparent 100%
      );
      background-size: 200% 100%;
      animation: kb-shimmer 2s infinite linear;
    `
    fill.appendChild(shimmer)
  }

  // Percentage text
  const percentText = document.createElement('div')
  percentText.className = 'kb-progress-text'
  percentText.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    font-weight: bold;
    color: var(--text-light);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    opacity: ${showPercent ? '1' : '0'};
  `
  percentText.textContent = `${Math.round(currentProgress)}%`

  container.appendChild(fill)
  container.appendChild(percentText)

  const setProgress = (value: number) => {
    currentProgress = Math.max(0, Math.min(100, value))
    fill.style.width = `calc(${currentProgress}% - 4px)`
    percentText.textContent = `${Math.round(currentProgress)}%`
  }

  return {
    element: container,
    setProgress,
    getProgress: () => currentProgress
  }
}
