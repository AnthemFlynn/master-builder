// src/modules/ui/components/base/Toast.ts

/**
 * Toast - Brief notification messages
 *
 * Used for save confirmations, error messages, etc.
 * Auto-dismisses after a timeout.
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  /** Message to display */
  message: string
  /** Toast type (affects styling) */
  type?: ToastType
  /** Duration in ms (0 = no auto-dismiss) */
  duration?: number
  /** Icon (emoji or text) */
  icon?: string
}

interface ToastInstance {
  element: HTMLElement
  hide: () => void
}

// Toast container (created once, reused)
let toastContainer: HTMLElement | null = null

function getToastContainer(): HTMLElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'kb-toast-container'
    toastContainer.style.cssText = `
      position: fixed;
      bottom: var(--space-xl);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column-reverse;
      gap: var(--space-sm);
      z-index: var(--z-toast);
      pointer-events: none;
    `
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'var(--button-green)',
    border: 'var(--button-green-dark)',
    icon: '✓'
  },
  error: {
    bg: 'var(--danger-red)',
    border: 'var(--danger-red-dark)',
    icon: '✕'
  },
  warning: {
    bg: '#FFA726',
    border: '#F57C00',
    icon: '⚠'
  },
  info: {
    bg: 'var(--stone-blue)',
    border: 'var(--stone-blue-dark)',
    icon: 'ℹ'
  }
}

export function showToast(options: ToastOptions): ToastInstance {
  const {
    message,
    type = 'info',
    duration = 3000,
    icon
  } = options

  const container = getToastContainer()
  const styles = TYPE_STYLES[type]

  const toast = document.createElement('div')
  toast.className = `kb-toast kb-toast--${type}`
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-lg);
    background: ${styles.bg};
    border: 3px solid ${styles.border};
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-panel);
    font-family: var(--font-family);
    font-size: var(--font-size-sm);
    color: var(--text-light);
    pointer-events: auto;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity var(--transition-fast), transform var(--transition-fast);
  `

  // Icon
  const iconEl = document.createElement('span')
  iconEl.className = 'kb-toast-icon'
  iconEl.textContent = icon || styles.icon
  iconEl.style.cssText = `
    font-size: var(--font-size-md);
  `

  // Message
  const messageEl = document.createElement('span')
  messageEl.className = 'kb-toast-message'
  messageEl.textContent = message

  toast.appendChild(iconEl)
  toast.appendChild(messageEl)
  container.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  })

  const hide = () => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(20px)'
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast)
      }
    }, 150)
  }

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(hide, duration)
  }

  // Click to dismiss
  toast.addEventListener('click', hide)

  return { element: toast, hide }
}

/**
 * Convenience functions
 */
export function toastSuccess(message: string, duration = 3000): ToastInstance {
  return showToast({ message, type: 'success', duration })
}

export function toastError(message: string, duration = 5000): ToastInstance {
  return showToast({ message, type: 'error', duration })
}

export function toastInfo(message: string, duration = 3000): ToastInstance {
  return showToast({ message, type: 'info', duration })
}

export function toastWarning(message: string, duration = 4000): ToastInstance {
  return showToast({ message, type: 'warning', duration })
}
