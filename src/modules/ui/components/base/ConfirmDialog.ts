// src/modules/ui/components/base/ConfirmDialog.ts

import { createModal } from './Modal'
import { createButton } from './Button'

/**
 * ConfirmDialog - Confirmation modal for destructive actions
 *
 * Used for delete confirmations, unsaved changes warnings, etc.
 */

export interface ConfirmDialogOptions {
  /** Dialog title */
  title: string
  /** Message to display */
  message: string
  /** Confirm button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Is this a dangerous action? (red confirm button) */
  danger?: boolean
  /** Called when confirmed */
  onConfirm: () => void
  /** Called when cancelled */
  onCancel?: () => void
}

export function showConfirmDialog(options: ConfirmDialogOptions): void {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    onConfirm,
    onCancel
  } = options

  // Create content
  const content = document.createElement('div')
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  `

  // Message
  const messageEl = document.createElement('p')
  messageEl.textContent = message
  messageEl.style.cssText = `
    margin: 0;
    font-family: var(--font-family);
    font-size: var(--font-size-md);
    color: var(--text-light);
    text-align: center;
    line-height: 1.5;
  `

  // Buttons
  const buttons = document.createElement('div')
  buttons.style.cssText = `
    display: flex;
    gap: var(--space-md);
    justify-content: center;
  `

  let modal: ReturnType<typeof createModal>

  const cancelBtn = createButton({
    label: cancelLabel,
    variant: 'ghost',
    size: 'medium',
    onClick: () => {
      modal.hide()
      onCancel?.()
    }
  })

  const confirmBtn = createButton({
    label: confirmLabel,
    variant: danger ? 'danger' : 'primary',
    size: 'medium',
    onClick: () => {
      modal.hide()
      onConfirm()
    }
  })

  buttons.appendChild(cancelBtn)
  buttons.appendChild(confirmBtn)

  content.appendChild(messageEl)
  content.appendChild(buttons)

  // Create and show modal
  modal = createModal({
    title,
    content,
    width: '380px',
    showClose: false,
    closeOnBackdrop: false
  })

  modal.show()
}

/**
 * Show a delete confirmation dialog
 */
export function showDeleteConfirm(
  itemName: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  showConfirmDialog({
    title: 'Delete',
    message: `Are you sure you want to delete "${itemName}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    cancelLabel: 'Keep',
    danger: true,
    onConfirm,
    onCancel
  })
}

/**
 * Show an unsaved changes warning
 */
export function showUnsavedChangesWarning(
  onDiscard: () => void,
  onSave: () => void,
  onCancel?: () => void
): void {
  const content = document.createElement('div')
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  `

  const message = document.createElement('p')
  message.textContent = 'You have unsaved changes. What would you like to do?'
  message.style.cssText = `
    margin: 0;
    font-family: var(--font-family);
    font-size: var(--font-size-md);
    color: var(--text-light);
    text-align: center;
  `

  const buttons = document.createElement('div')
  buttons.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  `

  let modal: ReturnType<typeof createModal>

  const saveBtn = createButton({
    label: 'Save & Continue',
    variant: 'primary',
    size: 'medium',
    fullWidth: true,
    icon: '💾',
    onClick: () => {
      modal.hide()
      onSave()
    }
  })

  const discardBtn = createButton({
    label: 'Discard Changes',
    variant: 'danger',
    size: 'medium',
    fullWidth: true,
    onClick: () => {
      modal.hide()
      onDiscard()
    }
  })

  const cancelBtn = createButton({
    label: 'Cancel',
    variant: 'ghost',
    size: 'small',
    fullWidth: true,
    onClick: () => {
      modal.hide()
      onCancel?.()
    }
  })

  buttons.appendChild(saveBtn)
  buttons.appendChild(discardBtn)
  buttons.appendChild(cancelBtn)

  content.appendChild(message)
  content.appendChild(buttons)

  modal = createModal({
    title: 'Unsaved Changes',
    content,
    width: '340px',
    showClose: false,
    closeOnBackdrop: false
  })

  modal.show()
}
