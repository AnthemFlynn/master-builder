// src/modules/ui/components/base/Modal.ts

/**
 * Modal - Overlay dialog with backdrop blur
 *
 * Used for confirmations, forms, and focused interactions.
 * Includes backdrop click-to-close and escape key handling.
 */

export interface ModalOptions {
  /** Modal title */
  title: string
  /** Modal content (HTML element or string) */
  content: HTMLElement | string
  /** Width of the modal */
  width?: string
  /** Show close button */
  showClose?: boolean
  /** Close when clicking backdrop */
  closeOnBackdrop?: boolean
  /** Called when modal is closed */
  onClose?: () => void
  /** Additional CSS classes */
  className?: string
}

export interface Modal {
  element: HTMLElement
  show: () => void
  hide: () => void
  destroy: () => void
  setContent: (content: HTMLElement | string) => void
}

export function createModal(options: ModalOptions): Modal {
  const {
    title,
    content,
    width = '450px',
    showClose = true,
    closeOnBackdrop = true,
    onClose,
    className = ''
  } = options

  // Backdrop
  const backdrop = document.createElement('div')
  backdrop.className = `kb-modal-backdrop ${className}`.trim()
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal-backdrop);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-normal), visibility var(--transition-normal);
  `

  // Modal container
  const modal = document.createElement('div')
  modal.className = 'kb-modal'
  modal.style.cssText = `
    position: relative;
    width: ${width};
    max-width: 90vw;
    max-height: 85vh;
    background: var(--wood-grain);
    background-color: var(--wood-medium);
    border: var(--border-wood-thick);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-panel);
    overflow: hidden;
    transform: scale(0.9);
    transition: transform var(--transition-normal);
    z-index: var(--z-modal);
  `

  // Header
  const header = document.createElement('div')
  header.className = 'kb-modal-header'
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    background: var(--wood-dark);
    border-bottom: 3px solid var(--wood-dark);
  `

  const titleEl = document.createElement('h2')
  titleEl.className = 'kb-modal-title'
  titleEl.textContent = title
  titleEl.style.cssText = `
    margin: 0;
    font-family: var(--font-family);
    font-size: var(--font-size-lg);
    color: var(--text-light);
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  `
  header.appendChild(titleEl)

  // Close button
  if (showClose) {
    const closeBtn = document.createElement('button')
    closeBtn.className = 'kb-modal-close'
    closeBtn.innerHTML = '&times;'
    closeBtn.style.cssText = `
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 24px;
      font-weight: bold;
      color: var(--text-light);
      background: transparent;
      border: none;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity var(--transition-fast);
    `
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.opacity = '1' })
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.opacity = '0.7' })
    closeBtn.addEventListener('click', () => hide())
    header.appendChild(closeBtn)
  }

  // Content area
  const contentEl = document.createElement('div')
  contentEl.className = 'kb-modal-content'
  contentEl.style.cssText = `
    padding: var(--space-lg);
    overflow-y: auto;
    max-height: calc(85vh - 120px);
    font-family: var(--font-family);
    color: var(--text-light);
  `

  const setContent = (newContent: HTMLElement | string) => {
    contentEl.innerHTML = ''
    if (typeof newContent === 'string') {
      contentEl.innerHTML = newContent
    } else {
      contentEl.appendChild(newContent)
    }
  }
  setContent(content)

  modal.appendChild(header)
  modal.appendChild(contentEl)
  backdrop.appendChild(modal)

  // Event handlers
  if (closeOnBackdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        hide()
      }
    })
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hide()
    }
  }

  const show = () => {
    document.body.appendChild(backdrop)
    // Force reflow
    void backdrop.offsetHeight
    backdrop.style.opacity = '1'
    backdrop.style.visibility = 'visible'
    modal.style.transform = 'scale(1)'
    document.addEventListener('keydown', handleKeydown)
  }

  const hide = () => {
    backdrop.style.opacity = '0'
    backdrop.style.visibility = 'hidden'
    modal.style.transform = 'scale(0.9)'
    document.removeEventListener('keydown', handleKeydown)
    setTimeout(() => {
      if (backdrop.parentElement) {
        backdrop.parentElement.removeChild(backdrop)
      }
      onClose?.()
    }, 250)
  }

  const destroy = () => {
    hide()
    document.removeEventListener('keydown', handleKeydown)
  }

  return {
    element: backdrop,
    show,
    hide,
    destroy,
    setContent
  }
}
